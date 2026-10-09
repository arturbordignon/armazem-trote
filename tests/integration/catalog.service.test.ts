import { beforeEach, describe, expect, it } from 'vitest';
import { NotFoundError } from '@/lib/errors';
import { updateProduct } from '@/services/catalog-admin.service';
import { getHomePage, getListingPage, getProductPage } from '@/services/catalog.service';
import { quoteProduct } from '@/services/freight.service';
import { getSearchPage, suggest } from '@/services/search.service';
import { countingQueries, resetCatalog } from './fixtures';

const firstPage = (sections: string[] = []) => ({
  filters: {
    sections,
    maxPriceCents: null,
    fit: 'tanto-faz' as const,
    sort: 'relevancia' as const,
  },
  page: 1,
});

describe('catalog services with Redis cache-aside (real Postgres + Redis)', () => {
  beforeEach(async () => {
    await resetCatalog(300);
  });

  it('builds the home page in one call and serves repeats from Redis without SQL', async () => {
    const cold = await countingQueries(getHomePage);
    expect(cold.result.newArrivals.slice(0, 6).map((p) => p.slug)).toEqual([
      'lampiao',
      'chapeu',
      'cafe',
      'radio',
      'cuia',
      'barril',
    ]);
    expect(cold.result.sections.map((s) => s.name)).toEqual([
      'Mantimentos',
      'Iluminação',
      'Vestuário',
      'Montaria',
      'Ferramentas',
      'Utensílios',
      'Curiosidades',
    ]);
    expect(cold.result.freightMethods.map((m) => [m.code, m.isFree])).toEqual([
      ['burro', true],
      ['cavalo', false],
      ['charrete', false],
    ]);
    expect(cold.queries).toBeGreaterThan(0);
    expect(cold.queries).toBeLessThanOrEqual(4); // tree (2) + arrivals + freight methods: no N+1

    const warm = await countingQueries(getHomePage);
    expect(warm.result).toEqual(cold.result);
    expect(warm.queries).toBe(0);
  });

  it('lists a section with its sub-sections, facets and pagination', async () => {
    const page = await getListingPage(firstPage(['iluminacao']));
    expect(page.title).toBe('Iluminação');
    expect(page.section?.children.map((c) => c.slug)).toEqual([
      'lampioes',
      'velas-e-pavios',
      'combustiveis',
    ]);
    expect(page.items[0]?.slug).toBe('lampiao');
    expect(page.items.every((i) => i.sectionName === 'Iluminação')).toBe(true);
    expect(page.sectionFacets).toHaveLength(7);
    expect(page.prevCursor).toBeNull();
    expect(page.pageCount).toBe(Math.ceil(page.total / 24));

    const next = await getListingPage({
      ...firstPage(['iluminacao']),
      after: page.nextCursor!,
      page: 2,
    });
    expect(next.page).toBe(2);
    expect(next.items.map((i) => i.id)).not.toContain(page.items[0]?.id);
  });

  it('titles listings with no section or several sections', async () => {
    expect((await getListingPage(firstPage())).title).toBe('Todas as mercadorias');
    expect((await getListingPage(firstPage(['iluminacao', 'vestuario']))).title).toBe(
      'Seções escolhidas',
    );
  });

  it('404s unknown sections', async () => {
    await expect(getListingPage(firstPage(['nao-existe']))).rejects.toBeInstanceOf(NotFoundError);
  });

  it('a price change reaches the product page, listings and search immediately', async () => {
    await getProductPage('lampiao');
    await getListingPage(firstPage(['iluminacao']));
    await getSearchPage({ query: 'lampiao', page: 1 });

    expect(
      await updateProduct('lampiao', { pricing: { priceCents: 7990, compareAtCents: 10990 } }),
    ).toBe('content');

    expect((await getProductPage('lampiao'))?.product.priceCents).toBe(7990);
    const listed = (await getListingPage(firstPage(['iluminacao']))).items.find(
      (i) => i.slug === 'lampiao',
    );
    expect(listed?.priceCents).toBe(7990);
    const found = (await getSearchPage({ query: 'lampiao', page: 1 })).items.find(
      (i) => i.slug === 'lampiao',
    );
    expect(found?.priceCents).toBe(7990);
  });

  it('a stock change refreshes the product page but leaves listing caches warm', async () => {
    const before = await getProductPage('chapeu');
    await getListingPage(firstPage(['vestuario']));

    expect(await updateProduct('chapeu', { stock: [{ sku: 'TC-00002-1', onHand: 3 }] })).toBe(
      'stock',
    );

    const after = await getProductPage('chapeu');
    expect(after?.product.variants[0]?.available).toBe(3);
    expect(after?.product.variants[1]).toEqual(before?.product.variants[1]);
    const listing = await countingQueries(() => getListingPage(firstPage(['vestuario'])));
    expect(listing.queries).toBe(0);
  });

  it('rolls back a partial update when one SKU is wrong', async () => {
    await expect(
      updateProduct('lampiao', {
        pricing: { priceCents: 5000, compareAtCents: null },
        stock: [{ sku: 'TC-99999-1', onHand: 1 }],
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect((await getProductPage('lampiao'))?.product.priceCents).toBe(8990);
  });

  it('returns null for unknown products and caches that answer too', async () => {
    expect(await getProductPage('nao-existe')).toBeNull();
    expect((await countingQueries(() => getProductPage('nao-existe'))).queries).toBe(0);
  });

  it('caches freight by CEP prefix and weight: a neighbour on the same street costs no quote work', async () => {
    const first = await quoteProduct('30140-071', 'lampiao', 1);
    expect(first.destination).toMatchObject({ city: 'Belo Horizonte', uf: 'MG', leagues: 55 });
    expect(first.options.map((o) => o.priceCents)).toEqual([0, 1785, 3260]);

    const neighbour = await countingQueries(() => quoteProduct('30140-999', 'lampiao', 1));
    expect(neighbour.result).toEqual(first);
    expect(neighbour.queries).toBe(1); // the product's weight only; methods and quote come from Redis
  });

  it('only the charrete takes bulky products', async () => {
    const quote = await quoteProduct('01310-100', 'fogao', 1);
    expect(quote.options.map((o) => o.unavailableReason !== null)).toEqual([true, true, false]);
  });

  it('suggests and searches through the same cache', async () => {
    const suggestions = await suggest('Lampiam');
    expect(suggestions[0]).toMatchObject({ sectionName: 'Iluminação' });
    expect((await countingQueries(() => suggest('lampiam'))).queries).toBe(0);
    expect(await suggest('a')).toEqual([]);
  });
});
