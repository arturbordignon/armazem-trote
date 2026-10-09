import { type SQL, type SQLWrapper, asc, desc, sql } from 'drizzle-orm';

/** A row's position in a keyset-ordered list: its sort value and its id (the tiebreaker). */
export interface KeysetPosition {
  value: number;
  id: number;
}

/** Page after or before a known row; neither means the first page. */
export type KeysetWindow =
  | { after: KeysetPosition; before?: never }
  | { before: KeysetPosition; after?: never }
  | { after?: never; before?: never };

export interface KeysetOrder {
  value: SQLWrapper;
  id: SQLWrapper;
  descending: boolean;
}

/**
 * WHERE and ORDER BY for one keyset page. Rows are compared as (value, id) tuples, which
 * Postgres serves straight from a composite (value, id) index — no OFFSET scan, so page 400
 * costs the same as page 1. Paging backwards flips both; callers reverse the rows afterwards.
 */
export function keysetClauses(
  order: KeysetOrder,
  window: KeysetWindow,
): { where: SQL | undefined; orderBy: SQL[]; reversed: boolean } {
  const reversed = window.before !== undefined;
  const position = window.after ?? window.before;
  const descending = order.descending !== reversed;
  const where = position
    ? descending
      ? sql`(${order.value}, ${order.id}) < (${position.value}, ${position.id})`
      : sql`(${order.value}, ${order.id}) > (${position.value}, ${position.id})`
    : undefined;
  const direction = descending ? desc : asc;
  return { where, orderBy: [direction(order.value), direction(order.id)], reversed };
}

/** Turns a `limit + 1` fetch into the page plus whether more rows exist beyond it. */
export function takePage<T>(
  rows: T[],
  limit: number,
  reversed: boolean,
): { rows: T[]; hasMore: boolean } {
  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);
  return { rows: reversed ? page.reverse() : page, hasMore };
}
