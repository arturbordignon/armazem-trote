import 'server-only';
import { ConflictError, OutOfStockError, ValidationError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { enqueueOrderTelegram } from '@/lib/queue';
import type { CartLine } from '@/models/cart.types';
import type { PlacedOrder } from '@/models/order.types';
import * as cartRepository from '@/repositories/cart.repository';
import * as orderRepository from '@/repositories/order.repository';
import { inTransaction } from '@/repositories/transaction';
import type { PlaceOrderInput } from '@/validators/checkout';
import { computeTotals, shipmentOf, waivesFreight } from './cart.rules';
import { clearCart, resolveCart } from './cart.service';
import { invalidateProducts } from './catalog.service';
import { quoteShipment } from './freight.service';

const EMPTY_CART_MESSAGE = 'A carroça está vazia.';

export interface PlaceOrderResult {
  order: PlacedOrder;
  /** True when this idempotency key had already placed the order (a retried submit). */
  replayed: boolean;
  /** Products whose stock changed, for the caller to expire rendered pages. */
  restockedSlugs: string[];
}

/**
 * Thrown inside the transaction to roll it back when another submission got there first: the
 * same idempotency key (a double click) or the same cart (another tab).
 */
class AlreadyConverted extends Error {}

/**
 * Places an order from the guest cart. Prices, discount and freight are recomputed here from
 * the catalog; the browser only says what it wants. Stock reservation, the cart snapshot and
 * the order rows commit together or not at all, and the idempotency key makes retries safe:
 * the same key always yields the same single order.
 */
export async function placeOrder(
  cartId: string | null,
  input: PlaceOrderInput,
): Promise<PlaceOrderResult> {
  const previous = await orderRepository.findOrderByIdempotencyKey(input.idempotencyKey);
  if (previous) return { order: placed(previous), replayed: true, restockedSlugs: [] };
  if (!cartId) throw new ConflictError(EMPTY_CART_MESSAGE);

  const { view, stored, coupon } = await resolveCart(cartId);
  if (view.lines.length === 0) throw new ConflictError(EMPTY_CART_MESSAGE);

  const quote = await quoteShipment(input.address.cep, shipmentOf(view.lines), {
    freeFreight: waivesFreight(coupon),
  });
  const freight = quote.options.find((option) => option.code === input.freight);
  if (!freight || freight.unavailableReason) {
    const message =
      freight?.unavailableReason ?? 'Escolha um animal de entrega para seguir viagem.';
    throw new ValidationError(message, { freight: [message] });
  }
  const totals = computeTotals(view.lines, coupon, freight.priceCents);
  const { address, payment } = input;

  let order: PlacedOrder & { id: number };
  try {
    order = await inTransaction(async (tx) => {
      const short = await orderRepository.reserveStock(tx, view.lines);
      if (short.length > 0) throw outOfStock(view.lines, short);

      const fresh = await cartRepository.insertCartSnapshot(tx, {
        id: cartId,
        createdAt: new Date(stored.createdAt ?? Date.now()),
        lines: view.lines,
      });
      if (!fresh) throw new AlreadyConverted();

      const result = await orderRepository.insertOrder(
        tx,
        {
          idempotencyKey: input.idempotencyKey,
          cartId,
          customerName: address.nome,
          phone: address.tel,
          cep: address.cep,
          street: address.rua,
          streetNumber: address.num,
          complement: address.comp || null,
          city: address.cidade,
          uf: address.uf,
          freightMethodCode: freight.code,
          freightCents: freight.priceCents,
          freightMinDays: freight.minDays,
          freightMaxDays: freight.maxDays,
          leagues: quote.destination.leagues,
          paymentMethod: payment.payment,
          paymentSignature: payment.payment === 'fiado' ? (payment.assinatura ?? null) : null,
          couponCode: coupon?.code ?? null,
          subtotalCents: totals.subtotalCents,
          discountCents: totals.discountCents,
          totalCents: totals.totalCents,
        },
        view.lines.map((line) => ({
          variantId: line.variantId,
          productName: line.productName,
          optionName: line.optionName,
          optionValue: line.optionValue,
          unitPriceCents: line.unitPriceCents,
          quantity: line.quantity,
          lineTotalCents: line.lineTotalCents,
        })),
      );
      if (result.status === 'duplicate_key') throw new AlreadyConverted();
      return result.order;
    });
  } catch (error) {
    if (!(error instanceof AlreadyConverted)) throw error;
    // Same key: this is a retry of the winning submission, so answer with its order.
    const winner = await orderRepository.findOrderByIdempotencyKey(input.idempotencyKey);
    if (winner) return { order: placed(winner), replayed: true, restockedSlugs: [] };
    throw new ConflictError('Esta carroça já partiu: a encomenda foi feita em outra aba.');
  }

  const restockedSlugs = [...new Set(view.lines.map((line) => line.productSlug))];
  await afterOrderPlaced(cartId, order.id, restockedSlugs);
  return { order: placed(order), replayed: false, restockedSlugs };
}

/**
 * Follow-ups once the order is committed. None of them may undo or fail the order: the cart is
 * gone either way, caches expire on their own TTL, and the telegram job can be re-enqueued.
 */
async function afterOrderPlaced(cartId: string, orderId: number, slugs: string[]): Promise<void> {
  const results = await Promise.allSettled([
    clearCart(cartId),
    invalidateProducts(slugs, 'stock'),
    enqueueOrderTelegram(orderId),
  ]);
  for (const result of results) {
    if (result.status === 'rejected')
      logger.error({ err: result.reason, orderId }, 'post-order step failed');
  }
}

function placed(order: { publicId: string; number: string }): PlacedOrder {
  return { publicId: order.publicId, number: order.number };
}

function outOfStock(lines: readonly CartLine[], shortIds: readonly number[]): OutOfStockError {
  const names = lines.filter((l) => shortIds.includes(l.variantId)).map((l) => l.productName);
  return new OutOfStockError(
    `Acabou no paiol enquanto você escolhia: ${names.join(', ')}. Ajuste a carroça e tente de novo.`,
    shortIds,
  );
}
