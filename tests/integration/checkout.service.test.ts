import { randomUUID } from 'node:crypto';
import { Queue } from 'bullmq';
import { sql } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/db';
import { ConflictError, OutOfStockError, ValidationError } from '@/lib/errors';
import { TELEGRAM_QUEUE, queueConnection } from '@/lib/queue';
import * as cart from '@/services/cart.service';
import { placeOrder } from '@/services/checkout.service';
import { getOrderConfirmation, sendOrderTelegram } from '@/services/order.service';
import type { PlaceOrderInput } from '@/validators/checkout';
import { resetCatalog } from './fixtures';

const queue = new Queue(TELEGRAM_QUEUE, { connection: queueConnection() });
afterAll(() => queue.close());

const address = {
  nome: 'Joaquina da Silva',
  tel: '(35) 99999-0000',
  cep: '30140071',
  rua: 'Estrada Velha do Rosário',
  num: '12',
  comp: 'Sítio, porteira azul',
  cidade: 'Belo Horizonte',
  uf: 'MG',
};

function orderInput(overrides: Partial<PlaceOrderInput> = {}): PlaceOrderInput {
  return {
    address,
    freight: 'cavalo',
    payment: { payment: 'cocheiro' },
    idempotencyKey: randomUUID(),
    ...overrides,
  };
}

async function variantId(sku: string): Promise<number> {
  const [row] = await db.execute<{ id: number }>(sql`SELECT id FROM variants WHERE sku = ${sku}`);
  return row!.id;
}

async function stock(id: number) {
  const [row] = await db.execute<{ on_hand: number; reserved: number }>(
    sql`SELECT on_hand, reserved FROM inventory WHERE variant_id = ${id}`,
  );
  return row!;
}

async function count(table: string): Promise<number> {
  const [row] = await db.execute<{ n: number }>(sql.raw(`SELECT count(*)::int AS n FROM ${table}`));
  return row!.n;
}

describe('checkout (one transaction, idempotent)', () => {
  let lamp: number;
  let coffee: number;

  beforeEach(async () => {
    await resetCatalog(200);
    await queue.obliterate({ force: true });
    [lamp, coffee] = await Promise.all([variantId('TC-00001-1'), variantId('TC-00004-2')]);
  });

  async function filledCart(): Promise<string> {
    const { cartId } = await cart.addToCart(null, lamp, 1);
    await cart.addToCart(cartId, coffee, 2);
    await cart.applyCoupon(cartId, 'GALINHA10');
    return cartId;
  }

  it('places the order: totals from the catalog, stock reserved, cart snapshotted and cleared', async () => {
    const cartId = await filledCart();
    const result = await placeOrder(cartId, orderInput());
    expect(result.replayed).toBe(false);
    expect(result.order.number).toBe('TC-1888');
    expect(result.restockedSlugs.sort()).toEqual(['cafe', 'lampiao']);

    const order = await getOrderConfirmation(result.order.publicId);
    expect(order).toMatchObject({
      customerName: 'Joaquina da Silva',
      city: 'Belo Horizonte',
      freightMethod: 'cavalo',
      freightMethodName: 'Cavalo',
      leagues: 55,
      subtotalCents: 32790,
      discountCents: 3279,
      totalCents: 32790 - 3279 + order!.freightCents,
    });
    expect(order?.lines.map((l) => [l.productName, l.optionValue, l.quantity])).toEqual([
      ['Lampião a querosene', 'Latão', 1],
      ['Saco de café 5 kg', 'Média', 2],
    ]);

    expect((await stock(lamp)).reserved).toBe(1);
    expect((await stock(coffee)).reserved).toBe(2);
    expect(await count('cart_items')).toBe(2);
    expect((await cart.getCart(cartId)).lines).toEqual([]);
  });

  it('queues exactly one confirmation telegram, which renders in house style', async () => {
    const { order } = await placeOrder(await filledCart(), orderInput());
    const [row] = await db.execute<{ id: number }>(
      sql`SELECT id::int AS id FROM orders WHERE public_id = ${order.publicId}`,
    );
    const job = await queue.getJob(`order-telegram-${row!.id}`);
    expect(job?.data).toEqual({ orderId: row!.id });

    const telegram = await sendOrderTelegram(row!.id);
    expect(telegram).toContain('PREZADO(A) JOAQUINA STOP');
    expect(telegram).toContain('NO LOMBO DO CAVALO RUMO A BELO HORIZONTE MG STOP');
    expect(telegram).toContain('PAGAMENTO: PAGAR AO COCHEIRO NA ENTREGA STOP');
  });

  it('is idempotent: retrying with the same key returns the same order and reserves once', async () => {
    const cartId = await filledCart();
    const input = orderInput();
    const first = await placeOrder(cartId, input);
    const retry = await placeOrder(cartId, input);
    expect(retry).toMatchObject({ order: first.order, replayed: true });
    expect(await count('orders')).toBe(1);
    expect((await stock(coffee)).reserved).toBe(2);
  });

  it('survives a double click: concurrent submits with one key place one order', async () => {
    const cartId = await filledCart();
    const input = orderInput();
    const [a, b] = await Promise.all([placeOrder(cartId, input), placeOrder(cartId, input)]);
    expect(a.order).toEqual(b.order);
    expect([a.replayed, b.replayed].sort()).toEqual([false, true]);
    expect(await count('orders')).toBe(1);
    expect((await stock(lamp)).reserved).toBe(1);
  });

  it('sells the last unit exactly once when two carts race for it', async () => {
    await db.execute(sql`UPDATE inventory SET on_hand = 1 WHERE variant_id = ${lamp}`);
    const carts = await Promise.all([cart.addToCart(null, lamp, 1), cart.addToCart(null, lamp, 1)]);
    const results = await Promise.allSettled(
      carts.map(({ cartId }) => placeOrder(cartId, orderInput())),
    );

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const failure = results.find((r) => r.status === 'rejected');
    expect(failure?.status === 'rejected' && failure.reason).toBeInstanceOf(OutOfStockError);
    expect(await stock(lamp)).toEqual({ on_hand: 1, reserved: 1 });
    expect(await count('orders')).toBe(1);
  });

  it('rolls everything back when stock runs out mid-order', async () => {
    const cartId = await filledCart();
    await db.execute(sql`UPDATE inventory SET reserved = on_hand WHERE variant_id = ${coffee}`);
    await expect(placeOrder(cartId, orderInput())).rejects.toThrow(/Acabou no paiol.*Saco de café/);
    expect((await stock(lamp)).reserved).toBe(0);
    expect(await count('orders')).toBe(0);
    expect(await count('carts')).toBe(0);
    expect((await cart.getCart(cartId)).lines).toHaveLength(2); // the cart is still there to fix
  });

  it('refuses an animal that cannot carry the order', async () => {
    const { cartId } = await cart.addToCart(null, await variantId('TC-00017-1'), 1); // fogão
    await expect(placeOrder(cartId, orderInput({ freight: 'burro' }))).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it('refuses a second order from the same cart under a different key', async () => {
    const cartId = await filledCart();
    const snapshot = await cart.resolveCart(cartId);
    await placeOrder(cartId, orderInput());
    // Simulate another tab that still holds the cart: put the lines back and submit again.
    for (const line of snapshot.stored.lines)
      await cart.addToCart(cartId, line.variantId, line.quantity);
    await expect(placeOrder(cartId, orderInput())).rejects.toThrow(/já partiu/);
    expect(await count('orders')).toBe(1);
  });

  it('refuses an empty or missing cart', async () => {
    await expect(placeOrder(null, orderInput())).rejects.toBeInstanceOf(ConflictError);
    await expect(placeOrder(randomUUID(), orderInput())).rejects.toBeInstanceOf(ConflictError);
  });

  it('keeps the fiado signature and waives freight with TROTE', async () => {
    const { cartId } = await cart.addToCart(null, lamp, 1);
    await cart.applyCoupon(cartId, 'TROTE');
    const { order } = await placeOrder(
      cartId,
      orderInput({ payment: { payment: 'fiado', assinatura: 'Joaquina da Silva' } }),
    );
    const [row] = await db.execute<{
      payment_signature: string;
      freight_cents: number;
      total_cents: number;
    }>(
      sql`SELECT payment_signature, freight_cents, total_cents FROM orders WHERE public_id = ${order.publicId}`,
    );
    expect(row).toEqual({
      payment_signature: 'Joaquina da Silva',
      freight_cents: 0,
      total_cents: 8990,
    });
  });
});
