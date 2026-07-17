import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('$env', () => ({
  env: {
    MFA_ENCRYPTION_KEY_V1: 'AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE=',
  },
}));

describe('generic cursor pagination', () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-17T12:00:00.000Z'));
  });

  it('signs, validates and scopes cursors to one resource and filter set', async () => {
    const { decodeKeysetCursor, encodeKeysetCursor, hashCursorFilters } =
      await import('$server/cursor-pagination');
    const filterHash = hashCursorFilters({ search: 'alpha', status: 'active' });
    const cursor = encodeKeysetCursor({
      filterHash,
      id: 'item-1',
      resource: 'items',
      snapshotAt: '2026-07-17T12:00:00.000Z',
      sortValue: '2026-07-17T11:00:00.000Z',
    });

    expect(
      decodeKeysetCursor(cursor, { filterHash, resource: 'items' }),
    ).toMatchObject({ id: 'item-1', resource: 'items', version: 1 });
    expect(
      decodeKeysetCursor(cursor, { filterHash, resource: 'other-items' }),
    ).toBeNull();
    expect(
      decodeKeysetCursor(cursor, {
        filterHash: hashCursorFilters({ search: 'other' }),
        resource: 'items',
      }),
    ).toBeNull();
    expect(
      decodeKeysetCursor(`${cursor.slice(0, -1)}x`, {
        filterHash,
        resource: 'items',
      }),
    ).toBeNull();
  });

  it('creates bounded metadata from a limit-plus-one query', async () => {
    const { buildCursorPaginationMeta, hashCursorFilters } =
      await import('$server/cursor-pagination');
    const snapshotAt = new Date('2026-07-17T12:00:00.000Z');
    const filterHash = hashCursorFilters({});
    const result = buildCursorPaginationMeta(
      [
        { id: '3', rank: '3' },
        { id: '2', rank: '2' },
        { id: '1', rank: '1' },
      ],
      2,
      snapshotAt,
      (item) => ({
        filterHash,
        id: item.id,
        resource: 'items',
        snapshotAt: snapshotAt.toISOString(),
        sortValue: item.rank,
      }),
    );

    expect(result.items.map(({ id }) => id)).toEqual(['3', '2']);
    expect(result.pagination).toMatchObject({
      hasMore: true,
      limit: 2,
      snapshotAt: snapshotAt.toISOString(),
    });
    expect(result.pagination.nextCursor).toEqual(expect.any(String));
  });

  it('bounds requested page sizes', async () => {
    const { parseCursorPageSize } = await import('$server/cursor-pagination');

    expect(parseCursorPageSize(new URLSearchParams('limit=0'))).toBe(1);
    expect(parseCursorPageSize(new URLSearchParams('limit=500'))).toBe(100);
    expect(parseCursorPageSize(new URLSearchParams('limit=invalid'))).toBe(25);
  });
});
