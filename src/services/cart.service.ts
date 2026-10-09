import 'server-only';
import { randomUUID } from 'node:crypto';
import { cacheKey, cached } from '@/lib/cache';
import { ConflictError, NotFoundError, OutOfStockError, ValidationError } from '@/lib/errors';
import type { CartLine, CartView } from '@/models/cart.types';
import { EMPTY_CART, type FreightMethodCode, MAX_CART_LINES } from '@/models/constants';
import * as cartRepository from '@/repositories/cart.repository';
import * as cartStore from '@/repositories/cart.store';
import type { StoredCart } from '@/repositories/cart.store';
import {
  type CouponTerms,
  computeTotals,
  lineTotalCents,
  shipmentOf,
  waivesFreight,
} from './cart.rules';
import { quoteShipment } from './freight.service';
import { normalizeCep } from './freight.rules';

const COUPON_TTL_SECONDS = 60 * 60;
export const UNKNOWN_COUPON_MESSAGE = 'Esse cupom não consta no livro-caixa.';

export async function getCart(cartId: string | null): Promise<CartView> {
  return cartId ? (await hydrate(await cartStore.readCart(cartId))).view : EMPTY_CART;
}

/**
 * Adds units of a variant, creating the cart on first use. Returns the cart id so the caller
 * can (re)issue the cookie, and the recomputed cart for the client to reconcile with.
 */
export async function addToCart(
  cartId: string | null,
  variantId: number,
  quantity: number,
): Promise<{ cartId: string; cart: CartView }> {
  const id = cartId ?? randomUUID();
  const [variant] = await cartRepository.findCartVariants([variantId]);
  if (!variant) throw new NotFoundError('Essa mercadoria não está mais na prateleira.');

  const stored = await cartStore.readCart(id);
  const existing = stored.lines.find((line) => line.variantId === variantId);
  if (!existing && stored.lines.length >= MAX_CART_LINES) {
    throw new ConflictError(
      `A carroça está cheia: no máximo ${MAX_CART_LINES} mercadorias diferentes.`,
    );
  }
  assertInStock(
    variant.productName,
    variant.available,
    (existing?.quantity ?? 0) + quantity,
    variantId,
  );

  await cartStore.adjustLine(id, variantId, quantity, 'add');
  return { cartId: id, cart: await getCart(id) };
}

/** Sets a line's quantity; 0 takes it off the cart ("riscar da caderneta"). */
export async function updateCartLine(
  cartId: string,
  variantId: number,
  quantity: number,
): Promise<CartView> {
  if (quantity > 0) {
    const [variant] = await cartRepository.findCartVariants([variantId]);
    if (!variant) throw new NotFoundError('Essa mercadoria não está mais na prateleira.');
    assertInStock(variant.productName, variant.available, quantity, variantId);
  }
  await cartStore.adjustLine(cartId, variantId, quantity, 'set');
  return getCart(cartId);
}

export async function applyCoupon(cartId: string, code: string): Promise<CartView> {
  if (!(await findCoupon(code))) {
    throw new ValidationError(UNKNOWN_COUPON_MESSAGE, { code: [UNKNOWN_COUPON_MESSAGE] });
  }
  await cartStore.updateSettings(cartId, { coupon: code });
  return getCart(cartId);
}

/** Remembers where the cart is going; the view then carries a quote for every animal. */
export async function setDestination(cartId: string, cep: string): Promise<CartView> {
  const digits = normalizeCep(cep);
  if (!digits) throw new ValidationError('O CEP precisa de 8 números, como 37540-000.');
  await cartStore.updateSettings(cartId, { cep: digits });
  return getCart(cartId);
}

export async function chooseFreight(cartId: string, method: FreightMethodCode): Promise<CartView> {
  const { view, coupon } = await hydrate(await cartStore.readCart(cartId));
  const option = view.freightOptions.find((o) => o.code === method);
  if (!option) throw new ValidationError('Informe o CEP antes de escolher o animal.');
  if (option.unavailableReason) throw new ValidationError(option.unavailableReason);
  await cartStore.updateSettings(cartId, { freight: method });
  return {
    ...view,
    selectedFreight: method,
    totals: computeTotals(view.lines, coupon, option.priceCents),
  };
}

export async function clearCart(cartId: string): Promise<void> {
  await cartStore.deleteCart(cartId);
}

// ---------------------------------------------------------------------------------------------

export interface ResolvedCart {
  view: CartView;
  stored: StoredCart;
  coupon: CouponTerms | null;
}

/** The cart as stored plus everything derived from it; checkout builds the order from this. */
export async function resolveCart(cartId: string): Promise<ResolvedCart> {
  const stored = await cartStore.readCart(cartId);
  return { ...(await hydrate(stored)), stored };
}

/**
 * Hydrates a stored cart: one SQL query for every line's product, price and stock; coupon and
 * freight quote from cache. Prices always come from the catalog, never from the client.
 */
async function hydrate(
  stored: StoredCart,
): Promise<{ view: CartView; coupon: CouponTerms | null }> {
  const [variants, coupon] = await Promise.all([
    cartRepository.findCartVariants(stored.lines.map((line) => line.variantId)),
    findCouponOrNull(stored.couponCode),
  ]);
  const byId = new Map(variants.map((v) => [v.variantId, v]));
  const lines = stored.lines.flatMap((line): CartLine[] => {
    const variant = byId.get(line.variantId);
    // A product that left the catalog simply drops out of the cart.
    if (!variant) return [];
    return [
      {
        variantId: line.variantId,
        productSlug: variant.productSlug,
        productName: variant.productName,
        optionName: variant.optionName,
        optionValue: variant.optionValue,
        unitPriceCents: variant.unitPriceCents,
        quantity: line.quantity,
        lineTotalCents: lineTotalCents(variant.unitPriceCents, line.quantity),
        available: variant.available,
        isBulky: variant.isBulky,
        weightGrams: variant.weightGrams,
        addedAt: line.addedAt,
      },
    ];
  });

  const quote =
    stored.cep && lines.length > 0
      ? await quoteShipment(stored.cep, shipmentOf(lines), { freeFreight: waivesFreight(coupon) })
      : null;
  const selected =
    quote?.options.find((o) => o.code === stored.freight && !o.unavailableReason) ?? null;

  const view: CartView = {
    lines,
    totals: computeTotals(lines, coupon, selected?.priceCents ?? null),
    coupon: coupon ? { code: coupon.code, message: coupon.message } : null,
    destination: quote?.destination ?? null,
    cep: stored.cep,
    freightOptions: quote?.options ?? [],
    selectedFreight: selected?.code ?? null,
  };
  return { view, coupon };
}

function assertInStock(name: string, available: number, wanted: number, variantId: number): void {
  if (available <= 0) throw new OutOfStockError(`${name} esgotou no paiol.`, [variantId]);
  if (wanted > available) {
    throw new OutOfStockError(`Só restam ${available} de ${name} no paiol.`, [variantId]);
  }
}

async function findCoupon(code: string): Promise<CouponTerms | null> {
  return cached(cacheKey('coupon', code), COUPON_TTL_SECONDS, async () => {
    return (await cartRepository.findActiveCoupon(code)) ?? null;
  });
}

function findCouponOrNull(code: string | null): Promise<CouponTerms | null> {
  return code ? findCoupon(code) : Promise.resolve(null);
}
