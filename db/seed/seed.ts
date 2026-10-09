import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { categories, inventory, products, reviews, variants } from '@/models/catalog.schema';
import { coupons, freightMethods } from '@/models/commerce.schema';
import type { SeedCatalog, SeedProduct } from './types';

/** Rows per INSERT: stays well under Postgres' 65,535 bind-parameter limit for every table. */
const BATCH_SIZE = 1000;

type Db = PostgresJsDatabase;
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

export interface SeedSummary {
  sections: number;
  products: number;
  variants: number;
  reviews: number;
}

/** Replaces all catalog and commerce data with `catalog`, atomically. */
export async function seedDatabase(db: Db, catalog: SeedCatalog): Promise<SeedSummary> {
  const summary = await db.transaction(async (tx) => {
    await truncateAll(tx);
    const categoryIds = await insertSections(tx, catalog);
    await tx.insert(freightMethods).values([...catalog.freightMethods]);
    await tx.insert(coupons).values([...catalog.coupons]);
    const productIds = await insertProducts(tx, catalog.products, categoryIds);
    const variantCount = await insertVariantsAndStock(tx, catalog.products, productIds);
    const reviewCount = await insertReviews(tx, catalog.products, productIds);
    return {
      sections: categoryIds.size,
      products: productIds.size,
      variants: variantCount,
      reviews: reviewCount,
    };
  });
  // Fresh planner statistics, so the first queries after a bulk load pick the right indexes.
  await db.execute(sql`ANALYZE`);
  return summary;
}

export async function hasProducts(db: Db): Promise<boolean> {
  const rows = await db.select({ id: products.id }).from(products).limit(1);
  return rows.length > 0;
}

async function truncateAll(tx: Tx): Promise<void> {
  await tx.execute(sql`
    TRUNCATE order_items, orders, cart_items, carts, reviews, inventory, variants, products,
             categories, freight_methods, coupons
    RESTART IDENTITY CASCADE
  `);
  await tx.execute(sql`ALTER SEQUENCE order_number_seq RESTART`);
}

/** Returns category ids by slug. Parents go first so children can reference them. */
async function insertSections(tx: Tx, catalog: SeedCatalog): Promise<Map<string, number>> {
  const parents = await tx
    .insert(categories)
    .values(catalog.sections.map((s, position) => ({ slug: s.slug, name: s.name, position })))
    .returning({ id: categories.id, slug: categories.slug });
  const parentIds = new Map(parents.map((row) => [row.slug, row.id]));

  const children = await tx
    .insert(categories)
    .values(
      catalog.sections.flatMap((section) =>
        section.children.map((child, position) => ({
          slug: child.slug,
          name: child.name,
          position,
          parentId: mustGet(parentIds, section.slug),
        })),
      ),
    )
    .returning({ id: categories.id, slug: categories.slug });

  return new Map([...parents, ...children].map((row) => [row.slug, row.id]));
}

async function insertProducts(
  tx: Tx,
  seedProducts: readonly SeedProduct[],
  categoryIds: ReadonlyMap<string, number>,
): Promise<Map<string, number>> {
  const ids = new Map<string, number>();
  for (const batch of chunks(seedProducts, BATCH_SIZE)) {
    const rows = await tx
      .insert(products)
      .values(
        batch.map((p) => ({
          slug: p.slug,
          name: p.name,
          description: p.description,
          categoryId: mustGet(categoryIds, p.categorySlug),
          priceCents: p.priceCents,
          compareAtCents: p.compareAtCents,
          optionName: p.optionName,
          badge: p.badge,
          isBulky: p.isBulky,
          weightGrams: p.weightGrams,
          specs: p.specs,
          searchKeywords: p.searchKeywords,
          ratingAvg: p.ratingAvg,
          ratingCount: p.ratingCount,
          ratingHistogram: p.ratingHistogram,
          popularity: p.popularity,
          arrivedAt: p.arrivedAt,
        })),
      )
      .returning({ id: products.id, slug: products.slug });
    for (const row of rows) ids.set(row.slug, row.id);
  }
  return ids;
}

async function insertVariantsAndStock(
  tx: Tx,
  seedProducts: readonly SeedProduct[],
  productIds: ReadonlyMap<string, number>,
): Promise<number> {
  const seedVariants = seedProducts.flatMap((p) =>
    p.variants.map((v, position) => ({ ...v, position, productId: mustGet(productIds, p.slug) })),
  );
  const stockBySku = new Map(seedVariants.map((v) => [v.sku, v.stock]));
  for (const batch of chunks(seedVariants, BATCH_SIZE)) {
    const rows = await tx
      .insert(variants)
      .values(
        batch.map(({ productId, sku, optionValue, position }) => ({
          productId,
          sku,
          optionValue,
          position,
        })),
      )
      .returning({ id: variants.id, sku: variants.sku });
    await tx
      .insert(inventory)
      .values(rows.map((row) => ({ variantId: row.id, onHand: mustGet(stockBySku, row.sku) })));
  }
  return seedVariants.length;
}

async function insertReviews(
  tx: Tx,
  seedProducts: readonly SeedProduct[],
  productIds: ReadonlyMap<string, number>,
): Promise<number> {
  const rows = seedProducts.flatMap((p) =>
    p.reviews.map((review) => ({ ...review, productId: mustGet(productIds, p.slug) })),
  );
  for (const batch of chunks(rows, BATCH_SIZE)) {
    await tx.insert(reviews).values(batch);
  }
  return rows.length;
}

function* chunks<T>(items: readonly T[], size: number): Generator<T[]> {
  for (let i = 0; i < items.length; i += size) yield items.slice(i, i + size);
}

function mustGet<K, V>(map: ReadonlyMap<K, V>, key: K): V {
  const value = map.get(key);
  if (value === undefined) throw new Error(`Seed reference not found: ${String(key)}`);
  return value;
}
