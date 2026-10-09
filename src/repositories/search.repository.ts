import 'server-only';
import { type SQL, and, count, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { products, variants } from '@/models/catalog.schema';
import { type KeysetWindow, keysetClauses, takePage } from './keyset';

/** The typed term, lowercased and accent-folded the same way `search_name` is. */
const folded = (term: string): SQL => sql`f_unaccent(lower(${term}))`;

/**
 * A product matches when full-text search finds it (Portuguese stemming over name, sections
 * and description) or its name is a close trigram match (typos, and plurals such as
 * "lampiões" that the stemmer doesn't fold onto "lampião"). Both sides are index-backed:
 * GIN on search_vector, GiST on search_name, combined with a BitmapOr.
 */
function matches(term: string): SQL {
  return sql`(${products.searchVector} @@ websearch_to_tsquery('trote_pt', ${term})
    OR ${folded(term)} <% ${products.searchName})`;
}

/**
 * Weight of sales in the ranking: each tenfold of popularity adds 10% to the text score. Among
 * equally good matches (hundreds of "Café …") the best sellers come first, while a clearly
 * better text match still wins.
 */
const POPULARITY_BOOST = 0.1;

/** Text relevance plus name closeness, nudged by popularity; float8 so cursors round-trip. */
function score(term: string): SQL<number> {
  return sql<number>`((ts_rank(${products.searchVector}, websearch_to_tsquery('trote_pt', ${term}))
    + word_similarity(${folded(term)}, ${products.searchName}))
    * (1 + ${POPULARITY_BOOST} * log(1 + ${products.popularity})))::float8`.mapWith(Number);
}

const isActive = eq(products.isActive, true);

const suggestionColumns = {
  slug: products.slug,
  name: products.name,
  categoryId: products.categoryId,
  priceCents: products.priceCents,
};

/** Escapes regex metacharacters so user input can only ever match literally. */
function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Autocomplete. Names with a word starting with what was typed come first, best sellers first
 * (Postgres walks the popularity index backwards and stops after `limit` hits). Only when that
 * finds too few does a typo-tolerant pass run: GiST walks `search_name` in trigram-distance
 * order (`<->>`), reading just the nearest candidates.
 */
export async function findSuggestions(term: string, limit: number) {
  const prefixMatches = await db
    .select(suggestionColumns)
    .from(products)
    .where(and(isActive, sql`${products.searchName} ~ ${`(^| )${escapeRegex(term)}`}`))
    .orderBy(desc(products.popularity), desc(products.id))
    .limit(limit);
  if (prefixMatches.length === limit) return prefixMatches;

  const seen = new Set(prefixMatches.map((row) => row.slug));
  const nearMatches = await db
    .select(suggestionColumns)
    .from(products)
    .where(and(isActive, sql`${folded(term)} <% ${products.searchName}`))
    .orderBy(sql`${products.searchName} <->> ${folded(term)}`, desc(products.popularity))
    .limit(limit * 2);
  return [...prefixMatches, ...nearMatches.filter((row) => !seen.has(row.slug))].slice(0, limit);
}

export async function findSearchPage(term: string, window: KeysetWindow, limit: number) {
  const ranked = db
    .select({ id: products.id, score: score(term).as('score') })
    .from(products)
    .where(and(isActive, matches(term)))
    .as('ranked');

  const { where, orderBy, reversed } = keysetClauses(
    { value: ranked.score, id: ranked.id, descending: true },
    window,
  );

  const rows = await db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      categoryId: products.categoryId,
      priceCents: products.priceCents,
      compareAtCents: products.compareAtCents,
      badge: products.badge,
      isBulky: products.isBulky,
      ratingAvg: products.ratingAvg,
      ratingCount: products.ratingCount,
      optionName: products.optionName,
      defaultVariantId: variants.id,
      defaultOptionValue: variants.optionValue,
      sortValue: sql<number>`${ranked.score}`.mapWith(Number),
    })
    .from(ranked)
    .innerJoin(products, eq(products.id, ranked.id))
    .innerJoin(variants, and(eq(variants.productId, products.id), eq(variants.position, 0)))
    .where(where)
    .orderBy(...orderBy)
    .limit(limit + 1);
  return takePage(rows, limit, reversed);
}

export async function countSearchMatches(term: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(products)
    .where(and(isActive, matches(term)));
  return row?.total ?? 0;
}
