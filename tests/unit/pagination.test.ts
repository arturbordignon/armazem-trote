import { describe, expect, it } from 'vitest';
import { PAGE_SIZE } from '@/models/constants';
import { decodeCursor, encodeCursor, paginate, toKeysetWindow } from '@/services/pagination';

const rows = (ids: number[]) => ids.map((id) => ({ id, sortValue: id * 10 }));

describe('cursors', () => {
  it('round-trip positions, including fractional sort values', () => {
    const position = { value: 0.6079271078109741, id: 42 };
    expect(decodeCursor(encodeCursor(position))).toEqual(position);
  });

  it.each([
    '',
    'not-base64!',
    Buffer.from('{"a":1}').toString('base64url'),
    Buffer.from('[1,"x"]').toString('base64url'),
  ])('treats %j as "first page"', (cursor) => {
    expect(decodeCursor(cursor)).toBeNull();
  });

  it('prefers "after" over "before" when both are given', () => {
    const after = encodeCursor({ value: 1, id: 1 });
    const before = encodeCursor({ value: 2, id: 2 });
    expect(toKeysetWindow({ after, before, page: 3 })).toEqual({ after: { value: 1, id: 1 } });
    expect(toKeysetWindow({ page: 1 })).toEqual({});
  });
});

describe('paginate', () => {
  const total = PAGE_SIZE * 3;

  it('first page: no previous, next when more rows exist', () => {
    const result = paginate(rows([1, 2]), true, {}, 7, total);
    expect(result).toMatchObject({ page: 1, pageCount: 3, total, prevCursor: null });
    expect(decodeCursor(result.nextCursor ?? '')).toEqual({ value: 20, id: 2 });
  });

  it('forward into the middle: both directions available', () => {
    const result = paginate(rows([3, 4]), true, { after: { value: 20, id: 2 } }, 2, total);
    expect(result.page).toBe(2);
    expect(decodeCursor(result.prevCursor ?? '')).toEqual({ value: 30, id: 3 });
    expect(decodeCursor(result.nextCursor ?? '')).toEqual({ value: 40, id: 4 });
  });

  it('last page: no next cursor', () => {
    expect(
      paginate(rows([5]), false, { after: { value: 40, id: 4 } }, 3, total).nextCursor,
    ).toBeNull();
  });

  it('backward to the start: lands on page 1 whatever the URL said', () => {
    const result = paginate(rows([1, 2]), false, { before: { value: 30, id: 3 } }, 5, total);
    expect(result).toMatchObject({ page: 1, prevCursor: null });
    expect(result.nextCursor).not.toBeNull();
  });

  it('clamps hand-edited page numbers into range', () => {
    expect(paginate(rows([3]), true, { after: { value: 1, id: 1 } }, 99, total).page).toBe(3);
  });

  it('reports one page for an empty result', () => {
    expect(paginate([], false, {}, 1, 0)).toMatchObject({
      page: 1,
      pageCount: 1,
      nextCursor: null,
    });
  });
});
