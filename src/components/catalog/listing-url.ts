import type { Route } from 'next';
import type { ListingFilters } from '@/models/catalog.types';
import { PRICE_FILTER_MAX_CENTS } from '@/models/constants';
import { DEFAULT_FIT, DEFAULT_SORT, LISTING_PARAMS } from '@/validators/listing-params';

const CENTS_PER_REAL = 100;

/**
 * Canonical URL for a listing: one section lives at /secao/{slug}, none or several at
 * /mercadorias. Defaults are left out so equivalent listings share one URL (and one cache entry).
 */
export function listingHref(
  filters: ListingFilters,
  paging: { after?: string; before?: string; page?: number } = {},
): Route {
  const params = new URLSearchParams();
  const [onlySection] = filters.sections;
  const path =
    filters.sections.length === 1 && onlySection ? `/secao/${onlySection}` : '/mercadorias';
  if (filters.sections.length > 1)
    filters.sections.forEach((slug) => params.append(LISTING_PARAMS.sections, slug));
  if (filters.maxPriceCents !== null && filters.maxPriceCents < PRICE_FILTER_MAX_CENTS) {
    params.set(LISTING_PARAMS.maxPrice, String(filters.maxPriceCents / CENTS_PER_REAL));
  }
  if (filters.fit !== DEFAULT_FIT) params.set(LISTING_PARAMS.fit, filters.fit);
  if (filters.sort !== DEFAULT_SORT) params.set(LISTING_PARAMS.sort, filters.sort);
  if (paging.after) params.set(LISTING_PARAMS.after, paging.after);
  if (paging.before) params.set(LISTING_PARAMS.before, paging.before);
  if (paging.page && paging.page > 1) params.set(LISTING_PARAMS.page, String(paging.page));
  const query = params.toString();
  return (query ? `${path}?${query}` : path) as Route;
}

export function searchHref(
  query: string,
  paging: { after?: string; before?: string; page?: number } = {},
): Route {
  const params = new URLSearchParams({ [LISTING_PARAMS.query]: query });
  if (paging.after) params.set(LISTING_PARAMS.after, paging.after);
  if (paging.before) params.set(LISTING_PARAMS.before, paging.before);
  if (paging.page && paging.page > 1) params.set(LISTING_PARAMS.page, String(paging.page));
  return `/busca?${params.toString()}` as Route;
}
