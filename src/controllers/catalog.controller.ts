import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import { notFound } from 'next/navigation';
import { NotFoundError } from '@/lib/errors';
import type {
  HomePage,
  ListingPage,
  ProductPage,
  SearchPage,
  Section,
} from '@/models/catalog.types';
import {
  getHomePage,
  getListingPage,
  getNavigation,
  getPopularProductSlugs,
  getProductPage,
  getSectionTree,
} from '@/services/catalog.service';
import { type SearchRequest, getSearchPage } from '@/services/search.service';
import {
  type ParsedListingParams,
  parseListingParams,
  parseSearchParams,
} from '@/validators/catalog';
import { CATALOG_TAG, productTag } from './cache-tags';

// Page loaders: each page calls exactly one, which calls exactly one page-level service.
// `use cache` puts the result in Next's render cache (and, at build time, in the prerendered
// static shell); tags let catalog changes expire exactly the pages that showed old data.
// Underneath, services keep their own Redis cache, shared by every server instance.

const PRERENDERED_PRODUCTS = 100;

type RawParams = Record<string, string | string[]>;

export async function loadNavigation(): Promise<Section[]> {
  'use cache';
  cacheLife('navigation');
  cacheTag(CATALOG_TAG);
  return getNavigation();
}

export async function loadHomePage(): Promise<HomePage> {
  'use cache';
  cacheLife('catalog');
  cacheTag(CATALOG_TAG);
  return getHomePage();
}

/** `/mercadorias?…` (any sections) or `/secao/{slug}?…` (that section). 404s unknown sections. */
export async function loadListingPage(raw: RawParams, sectionSlug?: string): Promise<ListingPage> {
  const params = parseListingParams(raw);
  if (sectionSlug) params.filters.sections = [sectionSlug];
  const page = await cachedListingPage(params);
  if (!page) notFound();
  return page;
}

async function cachedListingPage(params: ParsedListingParams): Promise<ListingPage | null> {
  'use cache';
  cacheLife('catalog');
  cacheTag(CATALOG_TAG);
  try {
    return await getListingPage(params);
  } catch (error) {
    if (error instanceof NotFoundError) return null;
    throw error;
  }
}

export async function loadSearchPage(raw: RawParams): Promise<SearchPage> {
  return cachedSearchPage(parseSearchParams(raw));
}

async function cachedSearchPage(request: SearchRequest): Promise<SearchPage> {
  'use cache';
  cacheLife('catalog');
  cacheTag(CATALOG_TAG);
  return getSearchPage(request);
}

export async function loadProductPage(slug: string): Promise<ProductPage> {
  const page = await cachedProductPage(slug);
  if (!page) notFound();
  return page;
}

async function cachedProductPage(slug: string): Promise<ProductPage | null> {
  'use cache';
  cacheLife('catalog');
  cacheTag(CATALOG_TAG, productTag(slug));
  return getProductPage(slug);
}

/** Best sellers to prerender at build time; the rest render on first visit, then stay cached. */
export async function loadPrerenderedProductSlugs(): Promise<{ slug: string }[]> {
  return (await getPopularProductSlugs(PRERENDERED_PRODUCTS)).map((slug) => ({ slug }));
}

/** Every section, top-level and nested, prerendered at build time (there are only a few dozen). */
export async function loadSectionSlugs(): Promise<{ slug: string }[]> {
  const tree = await getSectionTree();
  return tree.flatMap((root) => [root, ...root.children]).map(({ slug }) => ({ slug }));
}
