import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  char,
  check,
  index,
  integer,
  pgEnum,
  pgSequence,
  pgTable,
  primaryKey,
  smallint,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { variants } from './catalog.schema';
import { createdAt, timestamptz } from './columns';
import {
  CEP_DIGITS,
  COUPON_KINDS,
  type FreightMethodCode,
  MAX_LINE_QUANTITY,
  ORDER_STATUSES,
  PAYMENT_METHODS,
} from './constants';

const MAX_PERCENT = 100;
const FIRST_ORDER_NUMBER = 1888; // the shop opened in 1887

/**
 * Animal-drawn delivery methods. Pricing parameters live here; the pricing and ETA rules that
 * combine them with distance and road conditions are pure functions in the freight service.
 */
export const freightMethods = pgTable(
  'freight_methods',
  {
    code: text().$type<FreightMethodCode>().primaryKey(),
    name: text().notNull(),
    tier: text().notNull(),
    description: text().notNull(),
    basePriceCents: integer().notNull(),
    pricePerLeagueCents: integer().notNull(),
    /** Weight carried for the base price; heavier carts pay per extra kg. */
    includedWeightGrams: integer().notNull(),
    pricePerExtraKgCents: integer().notNull(),
    minDays: smallint().notNull(),
    maxDays: smallint().notNull(),
    /** Every this-many leagues adds a day to the ETA. */
    leaguesPerExtraDay: integer().notNull(),
    carriesBulky: boolean().notNull(),
    position: smallint().notNull(),
    isActive: boolean().notNull().default(true),
  },
  (t) => [
    check(
      'freight_methods_prices_nonnegative',
      sql`${t.basePriceCents} >= 0 AND ${t.pricePerLeagueCents} >= 0 AND ${t.pricePerExtraKgCents} >= 0`,
    ),
    check('freight_methods_days_range', sql`${t.minDays} > 0 AND ${t.maxDays} > ${t.minDays}`),
    check('freight_methods_leagues_per_day_positive', sql`${t.leaguesPerExtraDay} > 0`),
  ],
);

export const couponKind = pgEnum('coupon_kind', COUPON_KINDS);

export const coupons = pgTable(
  'coupons',
  {
    code: text().primaryKey(),
    kind: couponKind().notNull(),
    percentOff: smallint(),
    amountOffCents: integer(),
    /** Shown when the coupon is accepted ("Cupom aceito: …"). */
    message: text().notNull(),
    isActive: boolean().notNull().default(true),
  },
  (t) => [
    check(
      'coupons_value_matches_kind',
      sql`(${t.kind} = 'percent_off' AND ${t.percentOff} BETWEEN 1 AND ${sql.raw(String(MAX_PERCENT))} AND ${t.amountOffCents} IS NULL)
        OR (${t.kind} = 'amount_off' AND ${t.amountOffCents} > 0 AND ${t.percentOff} IS NULL)
        OR (${t.kind} = 'free_freight' AND ${t.percentOff} IS NULL AND ${t.amountOffCents} IS NULL)`,
    ),
    check('coupons_code_uppercase', sql`${t.code} = upper(${t.code})`),
  ],
);

/**
 * Guest carts live in Redis while shopping; a cart is written here once, as an audit snapshot,
 * in the same transaction that places its order. `id` is the Redis cart id.
 */
export const carts = pgTable('carts', {
  id: uuid().primaryKey(),
  createdAt: timestamptz().notNull(),
  convertedAt: createdAt(),
});

export const cartItems = pgTable(
  'cart_items',
  {
    cartId: uuid()
      .notNull()
      .references(() => carts.id, { onDelete: 'cascade' }),
    variantId: integer()
      .notNull()
      .references(() => variants.id, { onDelete: 'restrict' }),
    quantity: smallint().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.cartId, t.variantId] }),
    index('cart_items_variant_id_idx').on(t.variantId),
    check(
      'cart_items_quantity_range',
      sql`${t.quantity} BETWEEN 1 AND ${sql.raw(String(MAX_LINE_QUANTITY))}`,
    ),
  ],
);

export const orderStatus = pgEnum('order_status', ORDER_STATUSES);
export const paymentMethod = pgEnum('payment_method', PAYMENT_METHODS);

export const orderNumberSeq = pgSequence('order_number_seq', { startWith: FIRST_ORDER_NUMBER });

export const orders = pgTable(
  'orders',
  {
    id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    /** Unguessable id used in URLs, so order pages can't be enumerated. */
    publicId: uuid().notNull().defaultRandom(),
    /** Human-friendly number printed on the telegram ("TC-1888"). */
    number: text()
      .notNull()
      .default(sql`('TC-' || nextval('order_number_seq'))`),
    /** Client-generated per checkout attempt; a retried submit returns the original order. */
    idempotencyKey: uuid().notNull(),
    cartId: uuid()
      .notNull()
      .references(() => carts.id, { onDelete: 'restrict' }),
    status: orderStatus().notNull().default('placed'),

    customerName: text().notNull(),
    phone: text().notNull(),
    cep: char({ length: CEP_DIGITS }).notNull(),
    street: text().notNull(),
    streetNumber: text().notNull(),
    complement: text(),
    city: text().notNull(),
    uf: char({ length: 2 }).notNull(),

    freightMethodCode: text()
      .$type<FreightMethodCode>()
      .notNull()
      .references(() => freightMethods.code, { onDelete: 'restrict' }),
    freightCents: integer().notNull(),
    freightMinDays: smallint().notNull(),
    freightMaxDays: smallint().notNull(),
    leagues: integer().notNull(),

    paymentMethod: paymentMethod().notNull(),
    /** "Assigne a caderneta": the signature required for fiado. */
    paymentSignature: text(),

    couponCode: text().references(() => coupons.code, { onDelete: 'restrict' }),
    subtotalCents: integer().notNull(),
    discountCents: integer().notNull().default(0),
    totalCents: integer().notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('orders_public_id_key').on(t.publicId),
    uniqueIndex('orders_number_key').on(t.number),
    uniqueIndex('orders_idempotency_key_key').on(t.idempotencyKey),
    uniqueIndex('orders_cart_id_key').on(t.cartId),
    check('orders_cep_digits', sql`${t.cep} ~ '^[0-9]{8}$'`),
    check('orders_uf_letters', sql`${t.uf} ~ '^[A-Z]{2}$'`),
    check(
      'orders_amounts_nonnegative',
      sql`${t.subtotalCents} >= 0 AND ${t.discountCents} >= 0 AND ${t.freightCents} >= 0`,
    ),
    check('orders_discount_within_subtotal', sql`${t.discountCents} <= ${t.subtotalCents}`),
    check(
      'orders_total_consistent',
      sql`${t.totalCents} = ${t.subtotalCents} - ${t.discountCents} + ${t.freightCents}`,
    ),
    check(
      'orders_fiado_signed',
      sql`${t.paymentMethod} <> 'fiado' OR ${t.paymentSignature} IS NOT NULL`,
    ),
  ],
);

/** Order lines snapshot name and price at purchase time; later catalog edits don't rewrite history. */
export const orderItems = pgTable(
  'order_items',
  {
    id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    orderId: bigint({ mode: 'number' })
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    variantId: integer()
      .notNull()
      .references(() => variants.id, { onDelete: 'restrict' }),
    productName: text().notNull(),
    optionName: text(),
    optionValue: text(),
    unitPriceCents: integer().notNull(),
    quantity: smallint().notNull(),
    lineTotalCents: integer().notNull(),
  },
  (t) => [
    index('order_items_order_id_idx').on(t.orderId),
    index('order_items_variant_id_idx').on(t.variantId),
    check(
      'order_items_quantity_range',
      sql`${t.quantity} BETWEEN 1 AND ${sql.raw(String(MAX_LINE_QUANTITY))}`,
    ),
    check('order_items_unit_price_positive', sql`${t.unitPriceCents} > 0`),
    check(
      'order_items_line_total_consistent',
      sql`${t.lineTotalCents} = ${t.unitPriceCents} * ${t.quantity}`,
    ),
  ],
);
