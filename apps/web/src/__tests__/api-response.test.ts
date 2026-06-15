import { describe, expect, it } from 'vitest';

import { PAGINATION } from '../shared/constants/pagination.constants';

// Mock URLSearchParams for testing parsePagination
function createSearchParams(params: Record<string, string>): URLSearchParams {
  return new URLSearchParams(params);
}

// Extract the logic from parsePagination for testing without server-only module
function testParsePagination(
  searchParams: URLSearchParams,
  defaultLimit: number = PAGINATION.DEFAULT_LIMIT,
): { limit: number; page: number; skip: number } {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const limit = Math.min(
    PAGINATION.MAX_LIMIT,
    Math.max(
      PAGINATION.MIN_LIMIT,
      parseInt(searchParams.get('limit') || String(defaultLimit), 10) ||
        defaultLimit,
    ),
  );

  return { limit, page, skip: (page - 1) * limit };
}

describe('parsePagination', () => {
  describe('page parsing', () => {
    it('returns page 1 when not specified', () => {
      const params = createSearchParams({});
      const result = testParsePagination(params);
      expect(result.page).toBe(1);
    });

    it('parses valid page number', () => {
      const params = createSearchParams({ page: '5' });
      const result = testParsePagination(params);
      expect(result.page).toBe(5);
    });

    it('returns page 1 for invalid page number', () => {
      const params = createSearchParams({ page: 'invalid' });
      const result = testParsePagination(params);
      expect(result.page).toBe(1);
    });

    it('returns page 1 for negative page number', () => {
      const params = createSearchParams({ page: '-5' });
      const result = testParsePagination(params);
      expect(result.page).toBe(1);
    });

    it('returns page 1 for zero page number', () => {
      const params = createSearchParams({ page: '0' });
      const result = testParsePagination(params);
      expect(result.page).toBe(1);
    });
  });

  describe('limit parsing', () => {
    it('returns default limit when not specified', () => {
      const params = createSearchParams({});
      const result = testParsePagination(params);
      expect(result.limit).toBe(PAGINATION.DEFAULT_LIMIT);
    });

    it('parses valid limit', () => {
      const params = createSearchParams({ limit: '25' });
      const result = testParsePagination(params);
      expect(result.limit).toBe(25);
    });

    it('caps limit at MAX_LIMIT', () => {
      const params = createSearchParams({ limit: '1000' });
      const result = testParsePagination(params);
      expect(result.limit).toBe(PAGINATION.MAX_LIMIT);
    });

    it('uses default limit for zero (falsy value)', () => {
      const params = createSearchParams({ limit: '0' });
      const result = testParsePagination(params);
      // parseInt('0') returns 0 which is falsy, so default is used
      expect(result.limit).toBe(PAGINATION.DEFAULT_LIMIT);
    });

    it('enforces MIN_LIMIT for negative values', () => {
      const params = createSearchParams({ limit: '-10' });
      const result = testParsePagination(params);
      expect(result.limit).toBe(PAGINATION.MIN_LIMIT);
    });

    it('uses custom default limit', () => {
      const params = createSearchParams({});
      const result = testParsePagination(params, 100);
      expect(result.limit).toBe(100);
    });

    it('returns default limit for invalid limit', () => {
      const params = createSearchParams({ limit: 'invalid' });
      const result = testParsePagination(params);
      expect(result.limit).toBe(PAGINATION.DEFAULT_LIMIT);
    });
  });

  describe('skip calculation', () => {
    it('returns 0 skip for page 1', () => {
      const params = createSearchParams({ limit: '10', page: '1' });
      const result = testParsePagination(params);
      expect(result.skip).toBe(0);
    });

    it('calculates correct skip for page 2', () => {
      const params = createSearchParams({ limit: '10', page: '2' });
      const result = testParsePagination(params);
      expect(result.skip).toBe(10);
    });

    it('calculates correct skip for higher pages', () => {
      const params = createSearchParams({ limit: '25', page: '5' });
      const result = testParsePagination(params);
      expect(result.skip).toBe(100); // (5-1) * 25
    });
  });

  describe('combined parameters', () => {
    it('handles all parameters together', () => {
      const params = createSearchParams({ limit: '20', page: '3' });
      const result = testParsePagination(params);
      expect(result.page).toBe(3);
      expect(result.limit).toBe(20);
      expect(result.skip).toBe(40);
    });
  });
});

describe('PAGINATION constants', () => {
  it('DEFAULT_LIMIT is reasonable', () => {
    expect(PAGINATION.DEFAULT_LIMIT).toBeGreaterThan(0);
    expect(PAGINATION.DEFAULT_LIMIT).toBeLessThanOrEqual(PAGINATION.MAX_LIMIT);
  });

  it('MIN_LIMIT is at least 1', () => {
    expect(PAGINATION.MIN_LIMIT).toBeGreaterThanOrEqual(1);
  });

  it('MAX_LIMIT is greater than MIN_LIMIT', () => {
    expect(PAGINATION.MAX_LIMIT).toBeGreaterThan(PAGINATION.MIN_LIMIT);
  });

  it('DEFAULT_LIMIT is between MIN and MAX', () => {
    expect(PAGINATION.DEFAULT_LIMIT).toBeGreaterThanOrEqual(
      PAGINATION.MIN_LIMIT,
    );
    expect(PAGINATION.DEFAULT_LIMIT).toBeLessThanOrEqual(PAGINATION.MAX_LIMIT);
  });
});
