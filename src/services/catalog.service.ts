import 'server-only';
import { createHash } from 'node:crypto';
import { bumpGeneration, cacheKey, cached, currentGeneration, invalidate } from '@/lib/cache';
import { NotFoundError } from '@/lib/errors';
import type {
  HomePage,
  ListingFilters,
  ListingPage,
  ProductCard,
  ProductPage,
  Section,
  SectionNode,
} from '@/models/catalog.types';
import { PAGE_SIZE } from '@/models/constants';
import * as catalogRepository from '@/repositories/catalog.repository';
import type { CardRow, ListingCriteria } from '@/repositories/catalog.repository';
import { getFreightMethodSummaries } from './freight.service';
import { type PageRequest, paginate, toKeysetWindow } from './pagination';
import {
  type SectionIndex,
  buildSectionTree,
  indexSections,
  leafIds,
  toSection,
} from './section-tree';

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const TTL_SECONDS = {
  tree: 6 * HOUR,
  home: 15 * MINUTE,
  listing: 10 * MINUTE,
  product: 30 * MINUTE,
} as const;

const NEW_ARRIVALS_COUNT = 8;
const REVIEWS_ON_PRODUCT_PAGE = 3;
const RELATED_PRODUCTS_COUNT = 4;

/** Generation shared by every catalog-derived cache key: home, listings, search, products. */
export const CATALOG_GENERATION = 'catalog';

async function catalogKey(...parts: readonly (string | number)[]): Promise<string> {
  return cacheKey('catalog', await currentGeneration(CATALOG_GENERATION), ...parts);
}

function digest(value: unknown): string {
  return createHash('sha1').update(JSON.stringify(value)).digest('base64url');
}

// ---------------------------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------------------------

export async function getSectionTree(): Promise<SectionNode[]> {
  return cached(await catalogKey('tree'), TTL_SECONDS.tree, async () => {
    const [rows, counts] = await Promise.all([
      catalogRepository.findSections(),
      catalogRepository.countProductsBySection(),
    ]);
    return buildSectionTree(rows, counts);
  });
}

async function getSectionIndex(): Promise<SectionIndex> {
  return indexSections(await getSectionTree());
}

/** Top-level sections, in shop order: the navigation bar. */
export async function getNavigation(): Promise<Section[]> {
  return (await getSectionTree()).map(toSection);
}

export function toProductCard(row: CardRow, sections: SectionIndex): ProductCard {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    sectionName: sections.rootById.get(row.categoryId)?.name ?? '',
    priceCents: row.priceCents,
    compareAtCents: row.compareAtCents,
    badge: row.badge,
    isBulky: row.isBulky,
    ratingAvg: row.ratingAvg,
    ratingCount: row.ratingCount,
    optionName: row.optionName,
    defaultVariant: { id: row.defaultVariantId, optionValue: row.defaultOptionValue },
  };
}

// ---------------------------------------------------------------------------------------------
// Page-level reads: one call per page, everything the page needs.
// ---------------------------------------------------------------------------------------------

export async function getHomePage(): Promise<HomePage> {
  return cached(await catalogKey('home'), TTL_SECONDS.home, async () => {
    const [tree, arrivals, freightMethods] = await Promise.all([
      getSectionTree(),
      catalogRepository.findNewArrivals(NEW_ARRIVALS_COUNT),
      getFreightMethodSummaries(),
    ]);
    const sections = indexSections(tree);
    return {
      sections: tree.map((node) => ({ ...toSection(node), productCount: node.productCount })),
      newArrivals: arrivals.map((row) => toProductCard(row, sections)),
      freightMethods,
    };
  });
}

export interface ListingRequest extends PageRequest {
  filters: ListingFilters;
}

const ALL_PRODUCTS_TITLE = 'Todas as mercadorias';
const SEVERAL_SECTIONS_TITLE = 'Seções escolhidas';

/** A product listing; throws NotFoundError when a requested section doesn't exist. */
export async function getListingPage(request: ListingRequest): Promise<ListingPage> {
  const tree = await getSectionTree();
  const sections = indexSections(tree);
  const chosen = request.filters.sections.map((slug) => {
    const entry = sections.bySlug.get(slug);
    if (!entry) throw new NotFoundError(`Secção "${slug}" não existe no armazém.`);
    return entry;
  });

  const criteria: ListingCriteria = {
    categoryIds: chosen.length > 0 ? chosen.flatMap(({ node }) => leafIds(node)) : null,
    maxPriceCents: request.filters.maxPriceCents,
    bulky: request.filters.fit === 'tanto-faz' ? null : request.filters.fit === 'charrete',
    sort: request.filters.sort,
  };
  const window = toKeysetWindow(request);

  const key = await catalogKey('listing', digest({ criteria, window, page: request.page }));
  const { rows, hasMore, total } = await cached(key, TTL_SECONDS.listing, async () => {
    const [page, count] = await Promise.all([
      catalogRepository.findListingPage(criteria, window, PAGE_SIZE),
      catalogRepository.countListing(criteria),
    ]);
    return { ...page, total: count };
  });

  const single = chosen.length === 1 ? chosen[0] : undefined;
  return {
    title: single
      ? single.node.name
      : chosen.length > 1
        ? SEVERAL_SECTIONS_TITLE
        : ALL_PRODUCTS_TITLE,
    section: single
      ? {
          current: toSection(single.node),
          parent: single.parent ? toSection(single.parent) : null,
          children: single.node.children.map(toSection),
        }
      : null,
    filters: request.filters,
    items: rows.map((row) => toProductCard(row, sections)),
    sectionFacets: tree.map((node) => ({ ...toSection(node), productCount: node.productCount })),
    ...paginate(rows, hasMore, window, request.page, total),
  };
}

export async function getProductPage(slug: string): Promise<ProductPage | null> {
  return cached(await catalogKey('product', slug), TTL_SECONDS.product, async () => {
    const [row, variants, reviews, related, sections] = await Promise.all([
      catalogRepository.findProductBySlug(slug),
      catalogRepository.findVariantsBySlug(slug),
      catalogRepository.findReviewsBySlug(slug, REVIEWS_ON_PRODUCT_PAGE),
      catalogRepository.findRelatedBySlug(slug, RELATED_PRODUCTS_COUNT),
      getSectionIndex(),
    ]);
    if (!row) return null;

    const root = sections.rootById.get(row.categoryId);
    const leaf = sections.byId.get(row.categoryId);
    if (!root || !leaf) throw new Error(`Product "${slug}" is filed under an unknown section`);

    return {
      product: {
        ...toProductCard(row, sections),
        description: row.description,
        section: toSection(root),
        leafSection: toSection(leaf),
        weightGrams: row.weightGrams,
        specs: row.specs,
        ratingHistogram: row.ratingHistogram,
        variants,
      },
      reviews,
      related: related.map((relatedRow) => toProductCard(relatedRow, sections)),
    };
  });
}

/** Slugs worth prerendering at build time. */
export async function getPopularProductSlugs(limit: number): Promise<string[]> {
  return (await catalogRepository.findPopularSlugs(limit)).map((row) => row.slug);
}

// ---------------------------------------------------------------------------------------------
// Catalog changes and cache invalidation
// ---------------------------------------------------------------------------------------------

/**
 * - `stock`: only the product page shows stock, so only its entry goes.
 * - `content` (price, name…): the product also appears in listings, search and the home page,
 *   so the whole catalog generation is bumped.
 */
export type CatalogChange = 'stock' | 'content';

export interface CatalogChangeResult {
  slugs: string[];
  change: CatalogChange;
}

export async function invalidateProducts(
  slugs: readonly string[],
  change: CatalogChange,
): Promise<void> {
  await invalidate(...(await Promise.all(slugs.map((slug) => catalogKey('product', slug)))));
  if (change === 'content') await bumpGeneration(CATALOG_GENERATION);
}
