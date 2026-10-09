import 'server-only';
import { type SQL, and, count, desc, eq, inArray, lte, ne, sql } from 'drizzle-orm';
import { type Executor, db } from '@/lib/db';
import { categories, inventory, products, reviews, variants } from '@/models/catalog.schema';
import type { ListingSort } from '@/models/constants';
import { isConstraintViolation } from './db-errors';
import { type KeysetOrder, type KeysetWindow, keysetClauses, takePage } from './keyset';

// Columns for a product card. The default variant (position 0) is joined in so "add to cart"
// works straight from a listing without another query.
const cardColumns = {
  id: products.id,
  slug: products.slug,
  name: products.name,
  categoryId: products.categoryId,
  priceCents: products.priceCents,
  compareAtCents: products.compareAtCents,
  badge: products.badge,
  isBulky: products.isBulky,
  ratingAvg: products.ratingAvg,
  ratingCount: products.ratingCount,
  optionName: products.optionName,
  defaultVariantId: variants.id,
  defaultOptionValue: variants.optionValue,
};

const defaultVariantJoin = and(eq(variants.productId, products.id), eq(variants.position, 0));
const isActive = eq(products.isActive, true);

function selectCards() {
  return db.select(cardColumns).from(products).innerJoin(variants, defaultVariantJoin);
}

export type CardRow = Awaited<ReturnType<typeof selectCards>>[number];

// ---------------------------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------------------------

export function findSections() {
  return db
    .select({
      id: categories.id,
      parentId: categories.parentId,
      slug: categories.slug,
      name: categories.name,
    })
    .from(categories)
    .orderBy(categories.position, categories.id);
}

/** Active products per (leaf) section. Index-only over the category listing indexes. */
export function countProductsBySection() {
  return db
    .select({ categoryId: products.categoryId, count: count() })
    .from(products)
    .where(isActive)
    .groupBy(products.categoryId);
}

// ---------------------------------------------------------------------------------------------
// Listings
// ---------------------------------------------------------------------------------------------

export interface ListingCriteria {
  /** Leaf section ids to include; null = every section. */
  categoryIds: readonly number[] | null;
  maxPriceCents: number | null;
  /** true = bulky only, false = non-bulky only, null = either. */
  bulky: boolean | null;
  sort: ListingSort;
}

const SORT_ORDERS: Readonly<Record<ListingSort, KeysetOrder>> = {
  relevancia: { value: products.popularity, id: products.id, descending: true },
  'menor-preco': { value: products.priceCents, id: products.id, descending: false },
  'maior-preco': { value: products.priceCents, id: products.id, descending: true },
  ferraduras: { value: products.ratingAvg, id: products.id, descending: true },
};

function listingFilter(criteria: ListingCriteria): SQL | undefined {
  return and(
    isActive,
    criteria.categoryIds ? inArray(products.categoryId, [...criteria.categoryIds]) : undefined,
    criteria.maxPriceCents !== null ? lte(products.priceCents, criteria.maxPriceCents) : undefined,
    criteria.bulky !== null ? eq(products.isBulky, criteria.bulky) : undefined,
  );
}

/** One page of a listing (fetches limit + 1 to learn whether another page exists). */
export async function findListingPage(
  criteria: ListingCriteria,
  window: KeysetWindow,
  limit: number,
) {
  const order = SORT_ORDERS[criteria.sort];
  const { where, orderBy, reversed } = keysetClauses(order, window);
  const rows = await db
    // `sortValue` is what the next/previous cursor must remember for this ordering.
    .select({ ...cardColumns, sortValue: sql<number>`${order.value}`.mapWith(Number) })
    .from(products)
    .innerJoin(variants, defaultVariantJoin)
    .where(and(listingFilter(criteria), where))
    .orderBy(...orderBy)
    .limit(limit + 1);
  return takePage(rows, limit, reversed);
}

export async function countListing(criteria: ListingCriteria): Promise<number> {
  const [row] = await db.select({ total: count() }).from(products).where(listingFilter(criteria));
  return row?.total ?? 0;
}

export function findNewArrivals(limit: number) {
  return selectCards()
    .where(isActive)
    .orderBy(desc(products.arrivedAt), desc(products.id))
    .limit(limit);
}

// ---------------------------------------------------------------------------------------------
// Product page. Every query keys on the slug, so all four run in parallel (no waterfall).
// ---------------------------------------------------------------------------------------------

export async function findProductBySlug(slug: string) {
  const [row] = await db
    .select({
      ...cardColumns,
      description: products.description,
      weightGrams: products.weightGrams,
      specs: products.specs,
      ratingHistogram: products.ratingHistogram,
    })
    .from(products)
    .innerJoin(variants, defaultVariantJoin)
    .where(and(eq(products.slug, slug), isActive))
    .limit(1);
  return row;
}

export function findVariantsBySlug(slug: string) {
  return db
    .select({
      id: variants.id,
      optionValue: variants.optionValue,
      available: sql<number>`${inventory.onHand} - ${inventory.reserved}`.mapWith(Number),
    })
    .from(variants)
    .innerJoin(products, eq(products.id, variants.productId))
    .innerJoin(inventory, eq(inventory.variantId, variants.id))
    .where(eq(products.slug, slug))
    .orderBy(variants.position);
}

export function findReviewsBySlug(slug: string, limit: number) {
  return db
    .select({
      id: reviews.id,
      authorName: reviews.authorName,
      authorPlace: reviews.authorPlace,
      rating: reviews.rating,
      title: reviews.title,
      body: reviews.body,
    })
    .from(reviews)
    .innerJoin(products, eq(products.id, reviews.productId))
    .where(eq(products.slug, slug))
    .orderBy(desc(reviews.createdAt), desc(reviews.id))
    .limit(limit);
}

/** Best sellers from the same leaf section ("Quem levou isso também levou"). */
export function findRelatedBySlug(slug: string, limit: number) {
  const sameSection = db
    .select({ categoryId: products.categoryId })
    .from(products)
    .where(eq(products.slug, slug));
  return selectCards()
    .where(and(isActive, inArray(products.categoryId, sameSection), ne(products.slug, slug)))
    .orderBy(desc(products.popularity), desc(products.id))
    .limit(limit);
}

/** What freight depends on for one product: its weight and whether only the cart can take it. */
export async function findShippingInfoBySlug(slug: string) {
  const [row] = await db
    .select({ weightGrams: products.weightGrams, isBulky: products.isBulky })
    .from(products)
    .where(and(eq(products.slug, slug), isActive))
    .limit(1);
  return row;
}

/** Best sellers, prerendered at build time; the long tail is rendered on first visit. */
export function findPopularSlugs(limit: number) {
  return db
    .select({ slug: products.slug })
    .from(products)
    .where(isActive)
    .orderBy(desc(products.popularity), desc(products.id))
    .limit(limit);
}

// ---------------------------------------------------------------------------------------------
// Catalog maintenance (price and stock changes)
// ---------------------------------------------------------------------------------------------

export async function updatePricing(
  slug: string,
  priceCents: number,
  compareAtCents: number | null,
  executor: Executor = db,
): Promise<boolean> {
  const updated = await executor
    .update(products)
    .set({ priceCents, compareAtCents })
    .where(eq(products.slug, slug))
    .returning({ id: products.id });
  return updated.length > 0;
}

export type SetStockResult =
  | { status: 'updated'; slug: string }
  | { status: 'not_found' }
  /** Fewer units than placed orders already reserved. */
  | { status: 'below_reserved' };

/** Sets units on hand for one of `slug`'s variants. */
export async function setStock(
  slug: string,
  sku: string,
  onHand: number,
  executor: Executor = db,
): Promise<SetStockResult> {
  try {
    const [row] = await executor
      .update(inventory)
      .set({ onHand })
      .from(variants)
      .innerJoin(products, eq(products.id, variants.productId))
      .where(
        and(eq(inventory.variantId, variants.id), eq(variants.sku, sku), eq(products.slug, slug)),
      )
      .returning({ slug: products.slug });
    return row ? { status: 'updated', slug: row.slug } : { status: 'not_found' };
  } catch (error) {
    if (isConstraintViolation(error, 'inventory_reserved_within_on_hand')) {
      return { status: 'below_reserved' };
    }
    throw error;
  }
}
