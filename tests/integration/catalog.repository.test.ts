import { sql } from 'drizzle-orm';
import { beforeAll, describe, expect, it } from 'vitest';
import { db } from '@/lib/db';
import { LISTING_SORTS, type ListingSort } from '@/models/constants';
import * as catalog from '@/repositories/catalog.repository';
import type { KeysetWindow } from '@/repositories/keyset';
import * as search from '@/repositories/search.repository';
import { resetCatalog } from './fixtures';

const PAGE = 7;

/** Every id of a listing, walking keyset pages forward. */
async function walkForward(criteria: catalog.ListingCriteria) {
  const pages: number[][] = [];
  let window: KeysetWindow = {};
  for (;;) {
    const { rows, hasMore } = await catalog.findListingPage(criteria, window, PAGE);
    pages.push(rows.map((r) => r.id));
    const last = rows.at(-1);
    if (!hasMore || !last) return pages;
    window = { after: { value: last.sortValue, id: last.id } };
  }
}

const ORDER_BY: Record<ListingSort, string> = {
  relevancia: 'popularity DESC, id DESC',
  'menor-preco': 'price_cents ASC, id ASC',
  'maior-preco': 'price_cents DESC, id DESC',
  ferraduras: 'rating_avg DESC, id DESC',
};

describe('catalog repository (real Postgres)', () => {
  let lampioesId: number;
  let iluminacaoLeafIds: number[];

  beforeAll(async () => {
    await resetCatalog();
    const sections = await catalog.findSections();
    lampioesId = sections.find((s) => s.slug === 'lampioes')!.id;
    const iluminacao = sections.find((s) => s.slug === 'iluminacao')!;
    iluminacaoLeafIds = sections.filter((s) => s.parentId === iluminacao.id).map((s) => s.id);
  });

  describe.each(LISTING_SORTS)('keyset listing sorted by %s', (sort) => {
    const criteria = (): catalog.ListingCriteria => ({
      categoryIds: iluminacaoLeafIds,
      maxPriceCents: null,
      bulky: null,
      sort,
    });

    it('walks every row exactly once, in the same order as a plain ORDER BY', async () => {
      const ids = (await walkForward(criteria())).flat();
      const expected = await db.execute<{ id: number }>(
        sql.raw(`SELECT id FROM products WHERE is_active AND category_id IN (${iluminacaoLeafIds.join(',')})
                 ORDER BY ${ORDER_BY[sort]}`),
      );
      expect(ids).toEqual(expected.map((r) => r.id));
      expect(await catalog.countListing(criteria())).toBe(ids.length);
    });

    it('walking backwards from a later page returns the earlier pages unchanged', async () => {
      const pages = await walkForward(criteria());
      const third = pages[2]!;
      const { rows: firstOnThird } = await catalog.findListingPage(
        criteria(),
        { after: await positionOf(pages[1]!.at(-1)!, sort) },
        PAGE,
      );
      expect(firstOnThird.map((r) => r.id)).toEqual(third);
      const back = await catalog.findListingPage(
        criteria(),
        { before: await positionOf(third[0]!, sort) },
        PAGE,
      );
      expect(back.rows.map((r) => r.id)).toEqual(pages[1]);
      expect(back.hasMore).toBe(true);
    });
  });

  it('applies price, bulk and section filters', async () => {
    const { rows } = await catalog.findListingPage(
      { categoryIds: null, maxPriceCents: 50_000, bulky: true, sort: 'menor-preco' },
      {},
      100,
    );
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.isBulky && r.priceCents <= 50_000)).toBe(true);

    const lamps = await catalog.findListingPage(
      { categoryIds: [lampioesId], maxPriceCents: null, bulky: null, sort: 'relevancia' },
      {},
      100,
    );
    expect(lamps.rows.every((r) => r.categoryId === lampioesId)).toBe(true);
    expect(lamps.rows[0]?.slug).toBe('lampiao'); // the design's best seller leads
  });

  it('loads a product page in parallel, slug-keyed queries', async () => {
    const [product, variants, reviews, related] = await Promise.all([
      catalog.findProductBySlug('lampiao'),
      catalog.findVariantsBySlug('lampiao'),
      catalog.findReviewsBySlug('lampiao', 3),
      catalog.findRelatedBySlug('lampiao', 4),
    ]);
    expect(product).toMatchObject({
      name: 'Lampião a querosene',
      priceCents: 8990,
      defaultOptionValue: 'Latão',
    });
    expect(variants.map((v) => v.optionValue)).toEqual(['Latão', 'Ferro negro', 'Cobre']);
    expect(variants.every((v) => v.available === 7 + (128 % 20))).toBe(true);
    expect(reviews.map((r) => r.authorName)).toEqual([
      'Dona Benedita',
      'Seu Juvenal',
      'Sinhá Mariquinha',
    ]);
    expect(related).toHaveLength(4);
    expect(related.every((r) => r.categoryId === product?.categoryId && r.slug !== 'lampiao')).toBe(
      true,
    );
  });

  it('reports availability net of reserved units', async () => {
    await db.execute(
      sql`UPDATE inventory SET reserved = 5 WHERE variant_id = (SELECT id FROM variants WHERE sku = 'TC-00001-1')`,
    );
    const [latao] = await catalog.findVariantsBySlug('lampiao');
    expect(latao?.available).toBe(15 - 5);
    expect(await catalog.setStock('lampiao', 'TC-00001-1', 4)).toEqual({
      status: 'below_reserved',
    });
    expect(await catalog.setStock('chapeu', 'TC-00001-1', 40)).toEqual({ status: 'not_found' });
    expect(await catalog.setStock('lampiao', 'TC-00001-1', 40)).toEqual({
      status: 'updated',
      slug: 'lampiao',
    });
  });

  it('suggests names by word prefix, best sellers first', async () => {
    const suggestions = await search.findSuggestions('lamp', 5);
    expect(suggestions[0]?.name).toBe('Lampião a querosene');
    expect(suggestions.every((s) => s.name.startsWith('Lampião'))).toBe(true);
    const coffee = await search.findSuggestions('cafe', 5);
    expect(coffee[0]?.name).toBe('Saco de café 5 kg'); // matches a word in the middle, accent-free
  });

  it('falls back to typo-tolerant matches when no word starts with the term', async () => {
    const suggestions = await search.findSuggestions('lampiam', 5);
    expect(suggestions).toHaveLength(5);
    expect(suggestions.every((s) => s.name.startsWith('Lampião'))).toBe(true);
    expect(await search.findSuggestions('zzzzqqq', 5)).toEqual([]);
  });

  it('treats regex metacharacters in the term literally', async () => {
    await expect(search.findSuggestions('(lamp[', 5)).resolves.toBeInstanceOf(Array);
  });

  it('finds plurals the stemmer misses through the trigram fallback', async () => {
    const { rows } = await search.findSearchPage('lampioes', {}, 50);
    expect(rows.map((r) => r.slug)).toContain('lampiao');
  });

  it('ranks the best seller first among equally good matches', async () => {
    const { rows } = await search.findSearchPage('cafe', {}, 3);
    expect(rows[0]?.slug).toBe('cafe');
  });

  it('finds products through their section names', async () => {
    const { rows } = await search.findSearchPage('iluminacao', {}, 100);
    expect(rows.map((r) => r.slug)).toEqual(expect.arrayContaining(['vela', 'querosene']));
  });

  it('pages search results with stable keyset cursors', async () => {
    const all = (await search.findSearchPage('cafe', {}, 500)).rows.map((r) => r.id);
    expect(all.length).toBeGreaterThan(PAGE);
    expect(await search.countSearchMatches('cafe')).toBe(all.length);
    const first = await search.findSearchPage('cafe', {}, PAGE);
    const last = first.rows.at(-1)!;
    const second = await search.findSearchPage(
      'cafe',
      { after: { value: last.sortValue, id: last.id } },
      PAGE,
    );
    expect([...first.rows, ...second.rows].map((r) => r.id)).toEqual(all.slice(0, PAGE * 2));
  });
});

async function positionOf(id: number, sort: ListingSort) {
  const column = {
    relevancia: 'popularity',
    'menor-preco': 'price_cents',
    'maior-preco': 'price_cents',
    ferraduras: 'rating_avg',
  }[sort];
  const [row] = await db.execute<{ value: string }>(
    sql.raw(`SELECT ${column}::text AS value FROM products WHERE id = ${id}`),
  );
  return { value: Number(row!.value), id };
}
