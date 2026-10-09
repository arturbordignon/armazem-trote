// Opaque keyset cursors and the page metadata built around them. Pure.
import { PAGE_SIZE } from '@/models/constants';
import type { Pagination } from '@/models/catalog.types';
import type { KeysetPosition, KeysetWindow } from '@/repositories/keyset';

/** Which page to show: an opaque cursor in one direction, plus the page number for display. */
export interface PageRequest {
  after?: string;
  before?: string;
  page: number;
}

export function encodeCursor(position: KeysetPosition): string {
  return Buffer.from(JSON.stringify([position.value, position.id])).toString('base64url');
}

/** Malformed or tampered cursors decode to null, which simply means "first page". */
export function decodeCursor(cursor: string | undefined): KeysetPosition | null {
  if (!cursor) return null;
  try {
    const decoded: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (
      Array.isArray(decoded) &&
      decoded.length === 2 &&
      decoded.every((n) => typeof n === 'number' && Number.isFinite(n))
    ) {
      return { value: decoded[0] as number, id: decoded[1] as number };
    }
  } catch {
    // fall through
  }
  return null;
}

export function toKeysetWindow(request: PageRequest): KeysetWindow {
  const after = decodeCursor(request.after);
  if (after) return { after };
  const before = decodeCursor(request.before);
  if (before) return { before };
  return {};
}

interface PagedRow {
  id: number;
  sortValue: number;
}

/**
 * Next/previous cursors and page numbers for a fetched page. Going forward, more rows mean a
 * next page; going backward, more rows mean a previous one, and the page we came from is next.
 */
export function paginate(
  rows: readonly PagedRow[],
  hasMore: boolean,
  window: KeysetWindow,
  requestedPage: number,
  total: number,
): Pagination {
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const first = rows[0];
  const last = rows.at(-1);
  const cursorOf = (row: PagedRow | undefined) =>
    row ? encodeCursor({ value: row.sortValue, id: row.id }) : null;

  if (window.before) {
    return {
      page: hasMore ? clamp(requestedPage, 2, pageCount) : 1,
      pageCount,
      total,
      prevCursor: hasMore ? cursorOf(first) : null,
      nextCursor: cursorOf(last),
    };
  }
  return {
    page: window.after ? clamp(requestedPage, 2, pageCount) : 1,
    pageCount,
    total,
    prevCursor: window.after ? cursorOf(first) : null,
    nextCursor: hasMore ? cursorOf(last) : null,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}
