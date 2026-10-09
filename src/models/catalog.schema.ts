import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  smallint,
  text,
  unique,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { createdAt, timestamptz, tsvector, updatedAt } from './columns';
import { RATING_LEVELS } from './constants';

/** One row of the "Ficha da mercadoria" table, e.g. ["Peso", "1,2 kg"]. */
export type ProductSpec = readonly [label: string, value: string];

// Partial-index predicate shared by every storefront listing index: inactive products are never listed.
const ACTIVE_ONLY = sql`is_active`;

/** Section tree (adjacency list). Small and read-mostly: loaded whole and cached. */
export const categories = pgTable(
  'categories',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    parentId: integer().references((): AnyPgColumn => categories.id, { onDelete: 'restrict' }),
    slug: text().notNull(),
    name: text().notNull(),
    position: smallint().notNull().default(0),
  },
  (t) => [
    uniqueIndex('categories_slug_key').on(t.slug),
    index('categories_parent_id_idx').on(t.parentId),
  ],
);

export const products = pgTable(
  'products',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    slug: text().notNull(),
    name: text().notNull(),
    description: text().notNull(),
    categoryId: integer()
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    priceCents: integer().notNull(),
    /** "de R$ 109,90" — the struck-through price. */
    compareAtCents: integer(),
    /** Label of the variant picker ("Acabamento", "Tamanho"); null when there is a single variant. */
    optionName: text(),
    /** Rubber-stamp badge on the card ("Mais vendido", "Dá sorte"). */
    badge: text(),
    /** Doesn't fit on a donkey's back: only the charrete can carry it. */
    isBulky: boolean().notNull().default(false),
    weightGrams: integer().notNull(),
    specs: jsonb().$type<ProductSpec[]>().notNull().default([]),
    /** Extra searchable words maintained by the catalog writer (section names, variant options). */
    searchKeywords: text().notNull().default(''),
    // Rating aggregates are denormalized so listings can sort by them through an index.
    ratingAvg: numeric({ precision: 2, scale: 1, mode: 'number' }).notNull().default(0),
    ratingCount: integer().notNull().default(0),
    /** Review counts per horseshoe level, index 0 = 1 horseshoe. */
    ratingHistogram: integer()
      .array()
      .notNull()
      .default(sql`'{0,0,0,0,0}'::integer[]`),
    /** Default ("Relevância") ordering for listings without a search term. */
    popularity: integer().notNull().default(0),
    isActive: boolean().notNull().default(true),
    /** Drives "Novidades da Semana". */
    arrivedAt: timestamptz().notNull().defaultNow(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    searchName: text().generatedAlwaysAs(sql`f_unaccent(lower(name))`),
    searchVector: tsvector().generatedAlwaysAs(
      sql`setweight(to_tsvector('trote_pt'::regconfig, name), 'A')
        || setweight(to_tsvector('trote_pt'::regconfig, search_keywords), 'B')
        || setweight(to_tsvector('trote_pt'::regconfig, description), 'C')`,
    ),
  },
  (t) => [
    uniqueIndex('products_slug_key').on(t.slug),
    index('products_category_popularity_idx')
      .on(t.categoryId, t.popularity, t.id)
      .where(ACTIVE_ONLY),
    index('products_category_price_idx').on(t.categoryId, t.priceCents, t.id).where(ACTIVE_ONLY),
    index('products_category_rating_idx').on(t.categoryId, t.ratingAvg, t.id).where(ACTIVE_ONLY),
    index('products_popularity_idx').on(t.popularity, t.id).where(ACTIVE_ONLY),
    index('products_price_idx').on(t.priceCents, t.id).where(ACTIVE_ONLY),
    index('products_rating_idx').on(t.ratingAvg, t.id).where(ACTIVE_ONLY),
    index('products_arrived_at_idx').on(t.arrivedAt, t.id).where(ACTIVE_ONLY),
    index('products_search_vector_idx').using('gin', t.searchVector),
    index('products_search_name_trgm_idx').using('gist', t.searchName.op('gist_trgm_ops')),
    check('products_price_positive', sql`${t.priceCents} > 0`),
    check(
      'products_compare_at_above_price',
      sql`${t.compareAtCents} IS NULL OR ${t.compareAtCents} > ${t.priceCents}`,
    ),
    check('products_weight_positive', sql`${t.weightGrams} > 0`),
    check(
      'products_rating_avg_range',
      sql`${t.ratingAvg} BETWEEN 0 AND ${sql.raw(String(RATING_LEVELS))}`,
    ),
    check('products_rating_count_nonnegative', sql`${t.ratingCount} >= 0`),
    check(
      'products_rating_histogram_levels',
      sql`cardinality(${t.ratingHistogram}) = ${sql.raw(String(RATING_LEVELS))}`,
    ),
  ],
);

/** Every product has at least one variant; stock and cart lines point at variants, not products. */
export const variants = pgTable(
  'variants',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    productId: integer()
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    sku: text().notNull(),
    /** "Latão", "M", "42"… Null for a product's single default variant. */
    optionValue: text(),
    position: smallint().notNull().default(0),
  },
  (t) => [
    uniqueIndex('variants_sku_key').on(t.sku),
    unique('variants_product_option_key').on(t.productId, t.optionValue).nullsNotDistinct(),
  ],
);

/**
 * Stock per variant. Kept apart from `variants` so frequent stock writes don't rewrite (and
 * bloat) catalog rows. `reserved` counts units held by placed orders not yet dispatched.
 */
export const inventory = pgTable(
  'inventory',
  {
    variantId: integer()
      .primaryKey()
      .references(() => variants.id, { onDelete: 'cascade' }),
    onHand: integer().notNull(),
    reserved: integer().notNull().default(0),
    updatedAt: updatedAt(),
  },
  (t) => [
    check('inventory_on_hand_nonnegative', sql`${t.onHand} >= 0`),
    check('inventory_reserved_within_on_hand', sql`${t.reserved} BETWEEN 0 AND ${t.onHand}`),
  ],
);

/** "Cartas dos freguezes": written reviews. Star-only ratings live in the product aggregates. */
export const reviews = pgTable(
  'reviews',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    productId: integer()
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    authorName: text().notNull(),
    authorPlace: text().notNull(),
    rating: smallint().notNull(),
    title: text().notNull(),
    body: text().notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index('reviews_product_created_at_idx').on(t.productId, t.createdAt),
    check('reviews_rating_range', sql`${t.rating} BETWEEN 1 AND ${sql.raw(String(RATING_LEVELS))}`),
  ],
);
