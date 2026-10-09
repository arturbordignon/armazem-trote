import { describe, expect, it } from 'vitest';
import { HANDCRAFTED_PRODUCTS, SECTIONS } from '../../db/seed/fixtures';
import {
  averageRating,
  formatWeight,
  generateCatalog,
  ratingHistogram,
  slugify,
} from '../../db/seed/generator';
import { RATING_LEVELS } from '@/models/constants';

const REFERENCE_DATE = new Date('2026-10-01T12:00:00Z');
const options = { productCount: 600, seed: 1887, referenceDate: REFERENCE_DATE };

describe('generateCatalog', () => {
  const catalog = generateCatalog(options);

  it('is deterministic for the same seed', () => {
    expect(generateCatalog(options)).toEqual(catalog);
  });

  it('varies with the seed', () => {
    const other = generateCatalog({ ...options, seed: 7 });
    expect(other.products.map((p) => p.slug)).not.toEqual(catalog.products.map((p) => p.slug));
  });

  it('produces exactly the requested number of products', () => {
    expect(catalog.products).toHaveLength(options.productCount);
  });

  it('keeps slugs and SKUs unique', () => {
    const slugs = catalog.products.map((p) => p.slug);
    const skus = catalog.products.flatMap((p) => p.variants.map((v) => v.sku));
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(skus).size).toBe(skus.length);
  });

  it('starts with the hand-written design products, unchanged', () => {
    HANDCRAFTED_PRODUCTS.forEach((design, index) => {
      const product = catalog.products[index]!;
      expect(product).toMatchObject({
        slug: design.slug,
        name: design.name,
        description: design.description,
        priceCents: design.priceCents,
        compareAtCents: design.compareAtCents ?? null,
        ratingAvg: design.rating,
        ratingCount: design.ratingCount,
        isBulky: design.isBulky ?? false,
      });
      expect(product.variants.map((v) => v.optionValue)).toEqual(design.options ?? [null]);
    });
  });

  it('lists the design novelties as the newest arrivals, in design order', () => {
    const newest = [...catalog.products]
      .sort((a, b) => b.arrivedAt.getTime() - a.arrivedAt.getTime())
      .slice(0, 6)
      .map((p) => p.slug);
    expect(newest).toEqual(['lampiao', 'chapeu', 'cafe', 'radio', 'cuia', 'barril']);
  });

  it('only uses leaf sections that exist', () => {
    const leaves = new Set(SECTIONS.flatMap((s) => s.children.map((c) => c.slug)));
    for (const product of catalog.products) expect(leaves.has(product.categorySlug)).toBe(true);
  });

  it('keeps money in positive integer cents, with "de" prices above the price', () => {
    for (const p of catalog.products) {
      expect(Number.isInteger(p.priceCents)).toBe(true);
      expect(p.priceCents).toBeGreaterThan(0);
      if (p.compareAtCents !== null) expect(p.compareAtCents).toBeGreaterThan(p.priceCents);
    }
  });

  it('keeps rating aggregates consistent with the histogram', () => {
    for (const p of catalog.products) {
      expect(p.ratingHistogram).toHaveLength(RATING_LEVELS);
      expect(p.ratingHistogram.reduce((a, b) => a + b, 0)).toBe(p.ratingCount);
      expect(averageRating(p.ratingHistogram)).toBe(p.ratingAvg);
    }
  });

  it('marks bulky products as charrete-only in their specs', () => {
    const bulky = catalog.products.filter((p) => p.isBulky);
    expect(bulky.length).toBeGreaterThan(0);
    for (const p of bulky) expect(p.specs).toContainEqual(['Frete', 'Somente charrete']);
  });

  it('rejects counts smaller than the hand-written set', () => {
    expect(() => generateCatalog({ ...options, productCount: 5 })).toThrow(/at least/);
  });
});

describe('ratingHistogram', () => {
  it.each([
    [4.6, 128],
    [4.2, 17],
    [4.0, 66],
    [3.1, 40],
    [1.0, 9],
    [5.0, 3],
  ])('reproduces an average of %d over %d reviews', (average, count) => {
    const histogram = ratingHistogram(average, count);
    expect(histogram.reduce((a, b) => a + b, 0)).toBe(count);
    expect(averageRating(histogram)).toBe(average);
  });

  it('is empty when there are no reviews', () => {
    expect(ratingHistogram(4.5, 0)).toEqual([0, 0, 0, 0, 0]);
  });
});

describe('slugify', () => {
  it('folds accents and punctuation into URL-safe slugs', () => {
    expect(slugify('Lampião de mesa de Três Corações Nº 7')).toBe(
      'lampiao-de-mesa-de-tres-coracoes-n-7',
    );
    expect(slugify('Fubá mimoso de moinho d’água')).toBe('fuba-mimoso-de-moinho-d-agua');
  });
});

describe('formatWeight', () => {
  it('formats grams and kilograms the Brazilian way', () => {
    expect(formatWeight(180)).toBe('180 g');
    expect(formatWeight(1200)).toBe('1,2 kg');
    expect(formatWeight(38_000)).toBe('38 kg');
  });
});
