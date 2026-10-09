import 'server-only';
import { asc, eq, inArray, sql } from 'drizzle-orm';
import { type Executor, db } from '@/lib/db';
import { inventory } from '@/models/catalog.schema';
import { freightMethods, orderItems, orders } from '@/models/commerce.schema';
import { isConstraintViolation } from './db-errors';

export type NewOrder = Omit<
  typeof orders.$inferInsert,
  'id' | 'publicId' | 'number' | 'status' | 'createdAt'
>;
export type NewOrderLine = Omit<typeof orderItems.$inferInsert, 'id' | 'orderId'>;

const placedColumns = { id: orders.id, publicId: orders.publicId, number: orders.number };

export async function findOrderByIdempotencyKey(key: string, executor: Executor = db) {
  const [row] = await executor
    .select(placedColumns)
    .from(orders)
    .where(eq(orders.idempotencyKey, key))
    .limit(1);
  return row;
}

/**
 * Reserves stock for every line, or for none. Rows are locked in variant-id order first, so two
 * orders sharing products always queue in the same order and can never deadlock. Returns the
 * variant ids that lacked stock (empty = all reserved).
 */
export async function reserveStock(
  tx: Executor,
  lines: readonly { variantId: number; quantity: number }[],
): Promise<number[]> {
  const ids = lines.map((l) => l.variantId);
  const locked = await tx
    .select({
      variantId: inventory.variantId,
      onHand: inventory.onHand,
      reserved: inventory.reserved,
    })
    .from(inventory)
    .where(inArray(inventory.variantId, ids))
    .orderBy(asc(inventory.variantId))
    .for('update');

  const stockById = new Map(locked.map((row) => [row.variantId, row.onHand - row.reserved]));
  const short = lines
    .filter((l) => (stockById.get(l.variantId) ?? 0) < l.quantity)
    .map((l) => l.variantId);
  if (short.length > 0) return short;

  for (const line of [...lines].sort((a, b) => a.variantId - b.variantId)) {
    await tx
      .update(inventory)
      .set({ reserved: sql`${inventory.reserved} + ${line.quantity}` })
      .where(eq(inventory.variantId, line.variantId));
  }
  return [];
}

export type InsertOrderResult =
  | { status: 'inserted'; order: { id: number; publicId: string; number: string } }
  /** Another request with the same idempotency key won the race. */
  | { status: 'duplicate_key' };

export async function insertOrder(
  tx: Executor,
  order: NewOrder,
  lines: readonly NewOrderLine[],
): Promise<InsertOrderResult> {
  try {
    const [inserted] = await tx.insert(orders).values(order).returning(placedColumns);
    if (!inserted) throw new Error('Order insert returned no row');
    await tx.insert(orderItems).values(lines.map((line) => ({ ...line, orderId: inserted.id })));
    return { status: 'inserted', order: inserted };
  } catch (error) {
    if (isConstraintViolation(error, 'orders_idempotency_key_key'))
      return { status: 'duplicate_key' };
    throw error;
  }
}

/** The confirmation telegram: the order, its animal's name, and its lines (two queries). */
export async function findOrderConfirmation(by: { publicId: string } | { id: number }) {
  const [order] = await db
    .select({
      id: orders.id,
      publicId: orders.publicId,
      number: orders.number,
      customerName: orders.customerName,
      city: orders.city,
      uf: orders.uf,
      freightMethod: orders.freightMethodCode,
      freightMethodName: freightMethods.name,
      freightMinDays: orders.freightMinDays,
      freightMaxDays: orders.freightMaxDays,
      leagues: orders.leagues,
      paymentMethod: orders.paymentMethod,
      subtotalCents: orders.subtotalCents,
      discountCents: orders.discountCents,
      freightCents: orders.freightCents,
      totalCents: orders.totalCents,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .innerJoin(freightMethods, eq(freightMethods.code, orders.freightMethodCode))
    .where('publicId' in by ? eq(orders.publicId, by.publicId) : eq(orders.id, by.id))
    .limit(1);
  if (!order) return undefined;

  const lines = await db
    .select({
      productName: orderItems.productName,
      optionName: orderItems.optionName,
      optionValue: orderItems.optionValue,
      unitPriceCents: orderItems.unitPriceCents,
      quantity: orderItems.quantity,
      lineTotalCents: orderItems.lineTotalCents,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id))
    .orderBy(asc(orderItems.id));
  return { ...order, lines };
}
