import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { generateCatalog } from '../../db/seed/generator';
import { seedDatabase, type SeedSummary } from '../../db/seed/seed';
import { connectTestDatabase } from './test-database';

const PRODUCT_COUNT = 300;
const REFERENCE_DATE = new Date('2026-10-01T12:00:00Z');

describe('schema + seed (real Postgres)', () => {
  const { db, close } = connectTestDatabase();
  let summary: SeedSummary;

  const names = async (query: ReturnType<typeof sql>) =>
    (await db.execute<{ name: string }>(query)).map((row) => row.name);

  beforeAll(async () => {
    const catalog = generateCatalog({
      productCount: PRODUCT_COUNT,
      seed: 1887,
      referenceDate: REFERENCE_DATE,
    });
    summary = await seedDatabase(db, catalog);
  });

  afterAll(async () => {
    await close();
  });

  it('loads the whole catalog with stock for every variant', async () => {
    expect(summary.products).toBe(PRODUCT_COUNT);
    const [counts] = await db.execute<{ variants: number; stocked: number }>(sql`
      SELECT (SELECT count(*) FROM variants)::int AS variants,
             (SELECT count(*) FROM inventory)::int AS stocked
    `);
    expect(counts).toEqual({ variants: summary.variants, stocked: summary.variants });
  });

  it('is idempotent: reseeding replaces rather than duplicates', async () => {
    const again = await seedDatabase(
      db,
      generateCatalog({ productCount: PRODUCT_COUNT, seed: 1887, referenceDate: REFERENCE_DATE }),
    );
    expect(again).toEqual(summary);
  });

  it('full-text search ignores accents', async () => {
    const found = await names(sql`
      SELECT name FROM products WHERE search_vector @@ websearch_to_tsquery('trote_pt', 'lampiao')
    `);
    expect(found).toContain('Lampião a querosene');
  });

  it('full-text search stems Portuguese plurals', async () => {
    const found = await names(sql`
      SELECT name FROM products WHERE search_vector @@ websearch_to_tsquery('trote_pt', 'cafés')
    `);
    expect(found).toContain('Saco de café 5 kg');
  });

  it('finds a product by its section name through the search keywords', async () => {
    const found = await names(sql`
      SELECT name FROM products WHERE search_vector @@ websearch_to_tsquery('trote_pt', 'iluminacao')
    `);
    expect(found).toContain('Caixa de velas de sebo');
  });

  it('autocomplete tolerates typos through trigram similarity', async () => {
    const found = await names(sql`
      SELECT name FROM products
      WHERE f_unaccent(lower('lampiam')) <% search_name
      ORDER BY word_similarity(f_unaccent(lower('lampiam')), search_name) DESC
    `);
    expect(found).toContain('Lampião a querosene');
  });

  it('rejects money and stock that break invariants', async () => {
    const violated = (constraint: string) => ({ cause: { constraint_name: constraint } });
    await expect(
      db.execute(sql`UPDATE products SET price_cents = 0 WHERE slug = 'lampiao'`),
    ).rejects.toMatchObject(violated('products_price_positive'));
    await expect(
      db.execute(sql`UPDATE inventory SET reserved = on_hand + 1 WHERE variant_id = 1`),
    ).rejects.toMatchObject(violated('inventory_reserved_within_on_hand'));
  });

  it('numbers orders from the founding year onward', async () => {
    const [row] = await db.execute<{ number: string }>(
      sql`SELECT ('TC-' || nextval('order_number_seq')) AS number`,
    );
    expect(row?.number).toBe('TC-1888');
  });
});
