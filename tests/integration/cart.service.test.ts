import { sql } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/db';
import { OutOfStockError, ValidationError } from '@/lib/errors';
import * as cart from '@/services/cart.service';
import { resetCatalog } from './fixtures';

/** Variant ids by SKU from the deterministic seed (first product = lampião, etc.). */
async function variantId(sku: string): Promise<number> {
  const [row] = await db.execute<{ id: number }>(sql`SELECT id FROM variants WHERE sku = ${sku}`);
  return row!.id;
}

describe('guest cart (Redis + Postgres)', () => {
  let lampiaoLatao: number;
  let cafeClara: number;
  let fogao: number;

  beforeEach(async () => {
    await resetCatalog(200);
    [lampiaoLatao, cafeClara, fogao] = await Promise.all([
      variantId('TC-00001-1'),
      variantId('TC-00004-1'),
      variantId('TC-00017-1'),
    ]);
  });

  it('creates a cart on first add and prices lines from the catalog', async () => {
    const { cartId, cart: view } = await cart.addToCart(null, lampiaoLatao, 1);
    expect(cartId).toMatch(/^[0-9a-f-]{36}$/);
    expect(view.lines).toEqual([
      expect.objectContaining({
        productName: 'Lampião a querosene',
        optionValue: 'Latão',
        unitPriceCents: 8990,
        quantity: 1,
      }),
    ]);
    expect(view.totals).toMatchObject({
      itemCount: 1,
      subtotalCents: 8990,
      totalCents: 8990,
      freightCents: null,
    });
  });

  it('adds to an existing line and keeps lines in the order they were added', async () => {
    const { cartId } = await cart.addToCart(null, cafeClara, 2);
    await cart.addToCart(cartId, lampiaoLatao, 1);
    const { cart: view } = await cart.addToCart(cartId, cafeClara, 1);
    expect(view.lines.map((l) => [l.productName, l.quantity])).toEqual([
      ['Saco de café 5 kg', 3],
      ['Lampião a querosene', 1],
    ]);
  });

  it('refuses more units than the shelf holds', async () => {
    const { cartId } = await cart.addToCart(null, lampiaoLatao, 15);
    await expect(cart.addToCart(cartId, lampiaoLatao, 1)).rejects.toBeInstanceOf(OutOfStockError);
    await expect(cart.updateCartLine(cartId, lampiaoLatao, 16)).rejects.toThrow(/Só restam 15/);
  });

  it('caps a line at 99 even when stock allows more', async () => {
    await db.execute(sql`UPDATE inventory SET on_hand = 500 WHERE variant_id = ${lampiaoLatao}`);
    const { cartId } = await cart.addToCart(null, lampiaoLatao, 99);
    const { cart: view } = await cart
      .addToCart(cartId, lampiaoLatao, 0 + 1)
      .catch(() => ({ cart: null }));
    const after = view ?? (await cart.getCart(cartId));
    expect(after.lines[0]?.quantity).toBe(99);
  });

  it('removes a line when its quantity is set to zero', async () => {
    const { cartId } = await cart.addToCart(null, lampiaoLatao, 1);
    expect((await cart.updateCartLine(cartId, lampiaoLatao, 0)).lines).toEqual([]);
  });

  it('applies coupons server-side and rejects unknown ones', async () => {
    const { cartId } = await cart.addToCart(null, lampiaoLatao, 1);
    await cart.addToCart(cartId, cafeClara, 2);
    const view = await cart.applyCoupon(cartId, 'GALINHA10');
    expect(view.coupon?.message).toBe('Cupom aceito: 10% de desconto em toda a carroça.');
    expect(view.totals).toMatchObject({
      subtotalCents: 32790,
      discountCents: 3279,
      totalCents: 29511,
    });
    await expect(cart.applyCoupon(cartId, 'GALINHA99')).rejects.toBeInstanceOf(ValidationError);
  });

  it('quotes freight for the cart and adds the chosen animal to the total', async () => {
    const { cartId } = await cart.addToCart(null, lampiaoLatao, 1);
    const quoted = await cart.setDestination(cartId, '30140-071');
    expect(quoted.destination).toMatchObject({ city: 'Belo Horizonte', leagues: 55 });
    expect(quoted.freightOptions.map((o) => o.code)).toEqual(['burro', 'cavalo', 'charrete']);
    expect(quoted.totals.freightCents).toBeNull();

    const chosen = await cart.chooseFreight(cartId, 'cavalo');
    expect(chosen.selectedFreight).toBe('cavalo');
    expect(chosen.totals).toMatchObject({ freightCents: 1785, totalCents: 8990 + 1785 });
    expect((await cart.getCart(cartId)).totals.totalCents).toBe(8990 + 1785);
  });

  it('waives freight with TROTE and forces the charrete for bulky goods', async () => {
    const { cartId } = await cart.addToCart(null, fogao, 1);
    await cart.setDestination(cartId, '01310-100');
    await cart.applyCoupon(cartId, 'TROTE');
    await expect(cart.chooseFreight(cartId, 'burro')).rejects.toThrow(/Não cabe no lombo/);
    const view = await cart.chooseFreight(cartId, 'charrete');
    expect(view.totals.freightCents).toBe(0);
  });

  it('drops a chosen animal that can no longer carry the cart', async () => {
    const { cartId } = await cart.addToCart(null, lampiaoLatao, 1);
    await cart.setDestination(cartId, '30140-071');
    await cart.chooseFreight(cartId, 'burro');
    const { cart: view } = await cart.addToCart(cartId, fogao, 1);
    expect(view.selectedFreight).toBeNull();
    expect(view.totals.freightCents).toBeNull();
  });

  it('keeps a product page quote for the cart, even before the first add', async () => {
    const { cartId } = await cart.rememberFreight(null, { cep: '30140-071' });
    await cart.rememberFreight(cartId, { cep: '30140-071', method: 'cavalo' });
    const { cart: view } = await cart.addToCart(cartId, lampiaoLatao, 1);
    expect(view.cep).toBe('30140071');
    expect(view.destination).toMatchObject({ city: 'Belo Horizonte' });
    expect(view.selectedFreight).toBe('cavalo');
    expect(view.totals).toMatchObject({ freightCents: 1785, totalCents: 8990 + 1785 });
  });

  it('silently drops products that left the catalog', async () => {
    const { cartId } = await cart.addToCart(null, lampiaoLatao, 1);
    await db.execute(sql`UPDATE products SET is_active = false WHERE slug = 'lampiao'`);
    expect((await cart.getCart(cartId)).lines).toEqual([]);
  });

  it('hydrates any number of lines with one SQL query', async () => {
    const { countingQueries } = await import('./fixtures');
    const { cartId } = await cart.addToCart(null, lampiaoLatao, 1);
    for (const sku of ['TC-00002-1', 'TC-00003-1', 'TC-00004-2', 'TC-00005-1', 'TC-00006-1']) {
      await cart.addToCart(cartId, await variantId(sku), 1);
    }
    const { result, queries } = await countingQueries(() => cart.getCart(cartId));
    expect(result.lines).toHaveLength(6);
    expect(queries).toBe(1);
  });
});
