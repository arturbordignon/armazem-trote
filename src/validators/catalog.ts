import * as z from 'zod/mini';
import {
  FIT_FILTERS,
  type FitFilter,
  LISTING_SORTS,
  type ListingSort,
  PRICE_FILTER_MAX_CENTS,
  SEARCH_MAX_LENGTH,
} from '@/models/constants';
import { cursorSchema, pageNumberSchema, repeatedParam, slugSchema } from './common';
import { DEFAULT_FIT, DEFAULT_SORT, LISTING_PARAMS } from './listing-params';

const CENTS_PER_REAL = 100;
const MAX_SECTIONS_IN_FILTER = 20;

export { DEFAULT_FIT, DEFAULT_SORT, LISTING_PARAMS };

const pagingShape = {
  [LISTING_PARAMS.after]: z.catch(z.optional(cursorSchema), undefined),
  [LISTING_PARAMS.before]: z.catch(z.optional(cursorSchema), undefined),
  [LISTING_PARAMS.page]: pageNumberSchema,
};

/**
 * Listing URLs are shareable and hand-editable, so bad values degrade to defaults instead of
 * failing the page. Prices travel in whole reais (`preco=1500`) like the slider shows them.
 */
const listingParamsSchema = z.object({
  [LISTING_PARAMS.sections]: z.catch(
    z.pipe(repeatedParam, z.array(slugSchema).check(z.maxLength(MAX_SECTIONS_IN_FILTER))),
    [],
  ),
  [LISTING_PARAMS.maxPrice]: z.catch(
    z.optional(z.coerce.number().check(z.int(), z.positive())),
    undefined,
  ),
  [LISTING_PARAMS.fit]: z.catch(z.enum(FIT_FILTERS), DEFAULT_FIT),
  [LISTING_PARAMS.sort]: z.catch(z.enum(LISTING_SORTS), DEFAULT_SORT),
  ...pagingShape,
});

export interface ParsedListingParams {
  filters: {
    sections: string[];
    maxPriceCents: number | null;
    fit: FitFilter;
    sort: ListingSort;
  };
  after?: string;
  before?: string;
  page: number;
}

export function parseListingParams(raw: Record<string, string | string[]>): ParsedListingParams {
  const params = listingParamsSchema.parse(raw);
  const maxReais = params[LISTING_PARAMS.maxPrice];
  const maxPriceCents =
    maxReais === undefined || maxReais * CENTS_PER_REAL >= PRICE_FILTER_MAX_CENTS
      ? null
      : maxReais * CENTS_PER_REAL;
  return {
    filters: {
      sections: [...new Set(params[LISTING_PARAMS.sections])].sort(),
      maxPriceCents,
      fit: params[LISTING_PARAMS.fit],
      sort: params[LISTING_PARAMS.sort],
    },
    after: params[LISTING_PARAMS.after],
    before: params[LISTING_PARAMS.before],
    page: params[LISTING_PARAMS.page],
  };
}

const searchParamsSchema = z.object({
  [LISTING_PARAMS.query]: z.catch(
    z.pipe(
      z.optional(z.string()),
      z.transform((q) => (q ?? '').trim().slice(0, SEARCH_MAX_LENGTH)),
    ),
    '',
  ),
  ...pagingShape,
});

export interface ParsedSearchParams {
  query: string;
  after?: string;
  before?: string;
  page: number;
}

export function parseSearchParams(raw: Record<string, string | string[]>): ParsedSearchParams {
  const params = searchParamsSchema.parse(raw);
  return {
    query: params[LISTING_PARAMS.query],
    after: params[LISTING_PARAMS.after],
    before: params[LISTING_PARAMS.before],
    page: params[LISTING_PARAMS.page],
  };
}

/** Autocomplete is an API call: a missing or overlong term is a client error. */
export const suggestQuerySchema = z.object({
  q: z.string().check(z.trim(), z.maxLength(SEARCH_MAX_LENGTH)),
});
