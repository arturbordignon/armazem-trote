import 'server-only';
import { createHash } from 'node:crypto';
import { cacheKey, cached, currentGeneration } from '@/lib/cache';
import type { SearchPage, SearchSuggestion } from '@/models/catalog.types';
import { PAGE_SIZE, SEARCH_MAX_LENGTH, SEARCH_MIN_LENGTH } from '@/models/constants';
import * as searchRepository from '@/repositories/search.repository';
import { CATALOG_GENERATION, getSectionTree, toProductCard } from './catalog.service';
import { type PageRequest, paginate, toKeysetWindow } from './pagination';
import { indexSections } from './section-tree';

const MINUTE = 60;
const TTL_SECONDS = { suggestions: 30 * MINUTE, page: 10 * MINUTE } as const;
const SUGGESTION_LIMIT = 5;

/**
 * Case- and accent-insensitive form of a query. Postgres folds the same way, so "Café",
 * "cafe" and "  CAFÉ " return identical results and can share one cache entry.
 */
export function normalizeSearchTerm(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, SEARCH_MAX_LENGTH);
}

async function searchKey(...parts: readonly string[]): Promise<string> {
  return cacheKey('search', await currentGeneration(CATALOG_GENERATION), ...parts);
}

export async function suggest(raw: string): Promise<SearchSuggestion[]> {
  const term = normalizeSearchTerm(raw);
  if (term.length < SEARCH_MIN_LENGTH) return [];
  return cached(await searchKey('suggest', term), TTL_SECONDS.suggestions, async () => {
    const [rows, tree] = await Promise.all([
      searchRepository.findSuggestions(term, SUGGESTION_LIMIT),
      getSectionTree(),
    ]);
    const sections = indexSections(tree);
    return rows.map((row) => ({
      slug: row.slug,
      name: row.name,
      sectionName: sections.rootById.get(row.categoryId)?.name ?? '',
      priceCents: row.priceCents,
    }));
  });
}

export interface SearchRequest extends PageRequest {
  query: string;
}

export async function getSearchPage(request: SearchRequest): Promise<SearchPage> {
  const term = normalizeSearchTerm(request.query);
  const window = toKeysetWindow(request);
  const empty = { rows: [], hasMore: false, total: 0 };

  const digest = createHash('sha1').update(JSON.stringify({ term, window, page: request.page }));
  const { rows, hasMore, total } =
    term.length < SEARCH_MIN_LENGTH
      ? empty
      : await cached(
          await searchKey('page', digest.digest('base64url')),
          TTL_SECONDS.page,
          async () => {
            const [page, count] = await Promise.all([
              searchRepository.findSearchPage(term, window, PAGE_SIZE),
              searchRepository.countSearchMatches(term),
            ]);
            return { ...page, total: count };
          },
        );

  const sections = indexSections(await getSectionTree());
  return {
    query: request.query.trim(),
    items: rows.map((row) => toProductCard(row, sections)),
    ...paginate(rows, hasMore, window, request.page, total),
  };
}
