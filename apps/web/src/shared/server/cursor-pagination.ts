import 'server-only';

import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

import { env } from '$env';

const CURSOR_VERSION = 1;
const MAX_CURSOR_LENGTH = 2_048;
const MAX_RESOURCE_LENGTH = 80;
const MAX_VALUE_LENGTH = 512;
const CURSOR_SIGNATURE_KEY = createHash('sha256')
  .update('team-control:cursor-pagination:v1:', 'utf8')
  .update(env.MFA_ENCRYPTION_KEY_V1, 'utf8')
  .digest();

export type KeysetCursor = Readonly<{
  filterHash: string;
  id: string;
  resource: string;
  snapshotAt: string;
  sortValue: string;
  version: typeof CURSOR_VERSION;
}>;

type CursorInput = Omit<KeysetCursor, 'version'>;

const signPayload = (payload: string): string =>
  createHmac('sha256', CURSOR_SIGNATURE_KEY)
    .update(payload, 'utf8')
    .digest('base64url');

const isBoundedString = (value: unknown, maxLength: number): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= maxLength;

const isValidIsoDate = (value: string): boolean => {
  const timestamp = Date.parse(value);

  return (
    Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value
  );
};

const parseCursorPayload = (payload: string): KeysetCursor | null => {
  try {
    const value = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as Record<string, unknown>;

    if (
      value.version !== CURSOR_VERSION ||
      !isBoundedString(value.resource, MAX_RESOURCE_LENGTH) ||
      !isBoundedString(value.filterHash, 64) ||
      !isBoundedString(value.id, MAX_VALUE_LENGTH) ||
      !isBoundedString(value.sortValue, MAX_VALUE_LENGTH) ||
      !isBoundedString(value.snapshotAt, 40) ||
      !isValidIsoDate(value.snapshotAt)
    ) {
      return null;
    }

    return value as KeysetCursor;
  } catch {
    return null;
  }
};

export const hashCursorFilters = (filters: unknown): string =>
  createHash('sha256').update(JSON.stringify(filters), 'utf8').digest('hex');

export const encodeKeysetCursor = (input: CursorInput): string => {
  const cursor: KeysetCursor = { ...input, version: CURSOR_VERSION };
  const payload = Buffer.from(JSON.stringify(cursor), 'utf8').toString(
    'base64url',
  );

  return `${payload}.${signPayload(payload)}`;
};

export const decodeKeysetCursor = (
  rawCursor: string,
  expected: Readonly<{ filterHash: string; resource: string }>,
): KeysetCursor | null => {
  if (!rawCursor || rawCursor.length > MAX_CURSOR_LENGTH) return null;

  const [payload, signature, ...extraParts] = rawCursor.split('.');
  if (!payload || !signature || extraParts.length > 0) return null;

  const expectedSignature = signPayload(payload);
  const receivedBuffer = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    return null;
  }

  const cursor = parseCursorPayload(payload);
  if (!cursor) return null;
  if (
    cursor.resource !== expected.resource ||
    cursor.filterHash !== expected.filterHash
  ) {
    return null;
  }

  if (Date.parse(cursor.snapshotAt) > Date.now() + 60_000) return null;

  return cursor;
};

export const parseCursorPageSize = (
  searchParams: URLSearchParams,
  defaultLimit = 25,
  maxLimit = 100,
): number => {
  const requestedLimit = Number.parseInt(searchParams.get('limit') ?? '', 10);

  if (!Number.isFinite(requestedLimit)) return defaultLimit;

  return Math.min(maxLimit, Math.max(1, requestedLimit));
};

export const buildCursorPaginationMeta = <TItem>(
  items: readonly TItem[],
  limit: number,
  snapshotAt: Date,
  toCursor: (item: TItem) => CursorInput,
): {
  items: TItem[];
  pagination: import('$types/api.types').CursorPaginationMeta;
} => {
  const hasMore = items.length > limit;
  const visibleItems = items.slice(0, limit);
  const lastItem = visibleItems.at(-1);

  return {
    items: visibleItems,
    pagination: {
      hasMore,
      limit,
      nextCursor:
        hasMore && lastItem ? encodeKeysetCursor(toCursor(lastItem)) : null,
      snapshotAt: snapshotAt.toISOString(),
    },
  };
};
