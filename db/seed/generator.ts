// Pure, deterministic catalog generator: same options in, same catalog out. No I/O.
import type { ProductSpec } from '@/models/catalog.schema';
import { RATING_LEVELS } from '@/models/constants';
import {
  COUPONS,
  DESIGN_REVIEWS,
  FREIGHT_METHODS,
  HANDCRAFTED_PRODUCTS,
  type HandcraftedProduct,
  SECTIONS,
} from './fixtures';
import { createRng, type Rng } from './random';
import type { SeedCatalog, SeedProduct, SeedReview, SeedVariant } from './types';
import {
  BADGES,
  EDITIONS,
  type ItemTemplate,
  ITEMS_BY_SECTION,
  type Maker,
  MAKERS,
  QUIPS,
  REVIEW_AUTHORS,
  REVIEW_PLACES,
  REVIEW_TEMPLATES,
} from './vocabulary';

export interface GenerateOptions {
  productCount: number;
  seed: number;
  /** Arrival and review dates are placed relative to this instant. */
  referenceDate: Date;
}

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
const CENTS_PER_REAL = 100;
const GRAMS_PER_KG = 1000;
const WEIGHT_STEP_GRAMS = 50;
const SKU_DIGITS = 5;

const WRITTEN_REVIEWS_PER_PRODUCT = 3;
/** Hand-written products lead the default ordering, in design order. */
const FEATURED_POPULARITY = 1_000_000;
/** Matches the design's "7 + (n % 20) unidades no paiol". */
const HANDCRAFTED_BASE_STOCK = 7;
const HANDCRAFTED_STOCK_SPREAD = 20;
/** Hand-written products not in "Novidades" arrived a couple of months ago. */
const HANDCRAFTED_ARRIVAL_DAYS_AGO = 60;
const HANDCRAFTED_REVIEW_SPACING_DAYS = 9;

const MIN_RATING_COUNT = 3;
const MAX_RATING_COUNT = 400;
const MIN_TARGET_RATING = 3.6;
const MAX_TARGET_RATING = 5;
const POPULARITY_JITTER = 500;
const COMPARE_AT_PROBABILITY = 0.15;
const MIN_MARKUP = 1.12;
const MAX_MARKUP = 1.35;
const BADGE_PROBABILITY = 0.08;
const OUT_OF_STOCK_PROBABILITY = 0.04;
const STOCK_RANGE = [3, 60] as const;
const BULKY_STOCK_RANGE = [1, 6] as const;
/** Generated products arrived between one week and two years ago, so "Novidades" stays curated. */
const ARRIVAL_DAYS_AGO_RANGE = [8, 730] as const;
const REVIEW_DAYS_AGO_RANGE = [1, 365] as const;
/** Cents endings that read like shop prices: R$ 89,90 / R$ 89,50 / R$ 89,00. */
const PRICE_ENDINGS = [-10, -10, 50, 0] as const;
/**
 * Horseshoes lost each time a 5-horseshoe review is demoted while shaping a histogram. Mostly
 * small drops, so distributions come out J-shaped like real reviews.
 */
const DEMOTION_PATTERN = [1, 1, 2, 1, 3, 1, 4] as const;

export function generateCatalog({
  productCount,
  seed,
  referenceDate,
}: GenerateOptions): SeedCatalog {
  if (productCount < HANDCRAFTED_PRODUCTS.length) {
    throw new Error(`productCount must be at least ${HANDCRAFTED_PRODUCTS.length}`);
  }
  const rng = createRng(seed);
  const sectionNames = indexSectionNames();
  const usedSlugs = new Set<string>();

  const handcrafted = HANDCRAFTED_PRODUCTS.map((product, index) => {
    usedSlugs.add(product.slug);
    return fromHandcrafted(product, index, referenceDate, sectionNames);
  });

  const combos = rng.shuffle(allCombos()).slice(0, productCount - handcrafted.length);
  if (handcrafted.length + combos.length < productCount) {
    throw new Error(
      `The vocabulary supports at most ${handcrafted.length + combos.length} products`,
    );
  }

  const generated = combos.map((combo, offset) =>
    fromCombo(combo, handcrafted.length + offset, { rng, referenceDate, sectionNames, usedSlugs }),
  );

  return {
    sections: SECTIONS,
    products: [...handcrafted, ...generated],
    freightMethods: FREIGHT_METHODS,
    coupons: COUPONS,
  };
}

/**
 * Builds a review histogram (index 0 = 1 horseshoe) whose total is `count` and whose mean is
 * `average` rounded to the nearest representable value.
 */
export function ratingHistogram(average: number, count: number): number[] {
  const histogram = new Array<number>(RATING_LEVELS).fill(0);
  if (count === 0) return histogram;

  const maxTotal = RATING_LEVELS * count;
  const targetTotal = Math.min(maxTotal, Math.max(count, Math.round(average * count)));
  histogram[RATING_LEVELS - 1] = count;

  let deficit = maxTotal - targetTotal;
  for (let step = 0; deficit > 0; step++) {
    const from = highestDemotableLevel(histogram);
    const pattern = DEMOTION_PATTERN[step % DEMOTION_PATTERN.length] ?? 1;
    const drop = Math.min(pattern, deficit, from);
    histogram[from] = (histogram[from] ?? 0) - 1;
    histogram[from - drop] = (histogram[from - drop] ?? 0) + 1;
    deficit -= drop;
  }
  return histogram;
}

/** Mean horseshoes of a histogram, rounded to one decimal like the storefront shows it. */
export function averageRating(histogram: readonly number[]): number {
  const count = histogram.reduce((sum, n) => sum + n, 0);
  if (count === 0) return 0;
  const total = histogram.reduce((sum, n, index) => sum + n * (index + 1), 0);
  return Math.round((total / count) * 10) / 10;
}

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function formatWeight(grams: number): string {
  if (grams < GRAMS_PER_KG) return `${grams} g`;
  const kg = (grams / GRAMS_PER_KG).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  return `${kg} kg`;
}

// ---------------------------------------------------------------------------------------------

interface SectionNames {
  parent: string;
  leaf: string;
}

interface Combo {
  sectionSlug: string;
  item: ItemTemplate;
  maker: Maker;
  edition: string;
}

interface BuildContext {
  rng: Rng;
  referenceDate: Date;
  sectionNames: ReadonlyMap<string, SectionNames>;
  usedSlugs: Set<string>;
}

function indexSectionNames(): Map<string, SectionNames> {
  return new Map(
    SECTIONS.flatMap((section) =>
      section.children.map((child) => [child.slug, { parent: section.name, leaf: child.name }]),
    ),
  );
}

function allCombos(): Combo[] {
  return Object.entries(ITEMS_BY_SECTION).flatMap(([sectionSlug, items]) =>
    items.flatMap((item) =>
      MAKERS.flatMap((maker) => EDITIONS.map((edition) => ({ sectionSlug, item, maker, edition }))),
    ),
  );
}

function fromHandcrafted(
  product: HandcraftedProduct,
  index: number,
  referenceDate: Date,
  sectionNames: ReadonlyMap<string, SectionNames>,
): SeedProduct {
  const histogram = ratingHistogram(product.rating, product.ratingCount);
  const stock = HANDCRAFTED_BASE_STOCK + (product.ratingCount % HANDCRAFTED_STOCK_SPREAD);
  const options = product.options ?? [];
  const newRank = HANDCRAFTED_PRODUCTS.filter((p) => p.isNew).indexOf(product);

  return {
    slug: product.slug,
    name: product.name,
    description: product.description,
    categorySlug: product.categorySlug,
    priceCents: product.priceCents,
    compareAtCents: product.compareAtCents ?? null,
    optionName: product.optionName ?? null,
    variants: buildVariants(index, options, () => stock),
    badge: product.badge ?? null,
    isBulky: product.isBulky ?? false,
    weightGrams: product.weightGrams,
    specs: product.specs,
    searchKeywords: keywords(product.categorySlug, options, sectionNames),
    ratingAvg: averageRating(histogram),
    ratingCount: product.ratingCount,
    ratingHistogram: histogram,
    popularity: FEATURED_POPULARITY - index,
    arrivedAt:
      newRank >= 0
        ? hoursBefore(referenceDate, newRank)
        : daysBefore(referenceDate, HANDCRAFTED_ARRIVAL_DAYS_AGO + index),
    reviews: Array.from({ length: WRITTEN_REVIEWS_PER_PRODUCT }, (_, offset) => {
      const review = DESIGN_REVIEWS[(index + offset) % DESIGN_REVIEWS.length]!;
      return {
        ...review,
        createdAt: daysBefore(referenceDate, (offset + 1) * HANDCRAFTED_REVIEW_SPACING_DAYS),
      };
    }),
  };
}

function fromCombo(combo: Combo, index: number, ctx: BuildContext): SeedProduct {
  const { rng, referenceDate } = ctx;
  const { item, maker, edition, sectionSlug } = combo;
  const isBulky = item.isBulky ?? false;

  const name = [item.name, maker.suffix, edition].filter(Boolean).join(' ');
  const priceCents = shopPrice(rng, item.price);
  const weightGrams = roundTo(rng.int(...item.weight), WEIGHT_STEP_GRAMS);
  const ratingCount = skewedCount(rng);
  const histogram = ratingHistogram(targetRating(rng), ratingCount);
  const ratingAvg = averageRating(histogram);
  const options = item.options?.values ?? [];
  const [minStock, maxStock] = isBulky ? BULKY_STOCK_RANGE : STOCK_RANGE;

  const specs: ProductSpec[] = [
    ['Material', item.material],
    ...(item.specs ?? []),
    ['Origem', maker.place],
    ['Peso', formatWeight(weightGrams)],
    ...(isBulky ? [['Frete', 'Somente charrete'] as const] : []),
  ];

  return {
    slug: uniqueSlug(slugify(name), ctx.usedSlugs),
    name,
    description: `${item.description} ${maker.blurb} ${rng.pick(QUIPS)}`,
    categorySlug: sectionSlug,
    priceCents,
    compareAtCents: rng.chance(COMPARE_AT_PROBABILITY) ? markedUp(rng, priceCents) : null,
    optionName: item.options?.name ?? null,
    variants: buildVariants(index, options, () =>
      !isBulky && rng.chance(OUT_OF_STOCK_PROBABILITY) ? 0 : rng.int(minStock, maxStock),
    ),
    badge: rng.chance(BADGE_PROBABILITY) ? rng.pick(BADGES) : null,
    isBulky,
    weightGrams,
    specs,
    searchKeywords: keywords(sectionSlug, options, ctx.sectionNames),
    ratingAvg,
    ratingCount,
    ratingHistogram: histogram,
    popularity: Math.round(ratingCount * ratingAvg) + rng.int(0, POPULARITY_JITTER),
    arrivedAt: hoursBefore(
      daysBefore(referenceDate, rng.int(...ARRIVAL_DAYS_AGO_RANGE)),
      rng.int(0, 23),
    ),
    reviews: writtenReviews(rng, histogram, referenceDate),
  };
}

function buildVariants(
  productIndex: number,
  options: readonly string[],
  stockFor: () => number,
): SeedVariant[] {
  const values = options.length > 0 ? options : [null];
  return values.map((optionValue, position) => ({
    sku: `TC-${String(productIndex + 1).padStart(SKU_DIGITS, '0')}-${position + 1}`,
    optionValue,
    stock: stockFor(),
  }));
}

function writtenReviews(rng: Rng, histogram: readonly number[], referenceDate: Date): SeedReview[] {
  const count = histogram.reduce((sum, n) => sum + n, 0);
  return Array.from({ length: Math.min(WRITTEN_REVIEWS_PER_PRODUCT, count) }, () => {
    const rating = sampleLevel(rng, histogram, count);
    const template = rng.pick(REVIEW_TEMPLATES[rating - 1] ?? []);
    return {
      authorName: rng.pick(REVIEW_AUTHORS),
      authorPlace: rng.pick(REVIEW_PLACES),
      rating,
      title: template.title,
      body: template.body,
      createdAt: daysBefore(referenceDate, rng.int(...REVIEW_DAYS_AGO_RANGE)),
    };
  });
}

/** Picks a horseshoe level (1–5) with probability proportional to the histogram. */
function sampleLevel(rng: Rng, histogram: readonly number[], count: number): number {
  let ticket = rng.int(1, count);
  for (let level = 0; level < histogram.length; level++) {
    ticket -= histogram[level] ?? 0;
    if (ticket <= 0) return level + 1;
  }
  return RATING_LEVELS;
}

function highestDemotableLevel(histogram: readonly number[]): number {
  for (let level = histogram.length - 1; level > 0; level--) {
    if ((histogram[level] ?? 0) > 0) return level;
  }
  throw new Error('Histogram has nothing left to demote');
}

function keywords(
  sectionSlug: string,
  options: readonly string[],
  sectionNames: ReadonlyMap<string, SectionNames>,
): string {
  const names = sectionNames.get(sectionSlug);
  if (!names) throw new Error(`Unknown section "${sectionSlug}"`);
  return [names.parent, names.leaf, ...options].join(' ');
}

function shopPrice(rng: Rng, [min, max]: ItemTemplate['price']): number {
  return rng.int(min, max) * CENTS_PER_REAL + rng.pick(PRICE_ENDINGS);
}

/** A struck-through "de" price 12–35% above the current one, ending in ,90. */
function markedUp(rng: Rng, priceCents: number): number {
  const markup = MIN_MARKUP + rng.next() * (MAX_MARKUP - MIN_MARKUP);
  return Math.ceil((priceCents * markup) / CENTS_PER_REAL) * CENTS_PER_REAL - 10;
}

/** Few products have many reviews: square a uniform draw to skew toward small counts. */
function skewedCount(rng: Rng): number {
  return Math.round(MIN_RATING_COUNT + (MAX_RATING_COUNT - MIN_RATING_COUNT) * rng.next() ** 2);
}

function targetRating(rng: Rng): number {
  return MIN_TARGET_RATING + rng.next() * (MAX_TARGET_RATING - MIN_TARGET_RATING);
}

function uniqueSlug(base: string, used: Set<string>): string {
  let slug = base;
  for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`;
  used.add(slug);
  return slug;
}

function roundTo(value: number, step: number): number {
  return Math.max(step, Math.round(value / step) * step);
}

function daysBefore(date: Date, days: number): Date {
  return new Date(date.getTime() - days * DAY_MS);
}

function hoursBefore(date: Date, hours: number): Date {
  return new Date(date.getTime() - hours * HOUR_MS);
}
