import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  executeRaw: vi.fn(),
  queryRaw: vi.fn(),
  rateLimitDeleteMany: vi.fn(),
  rateLimitFindUnique: vi.fn(),
  rateLimitUpdateMany: vi.fn(),
  transaction: vi.fn(),
  transactionRollback: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('$server/prisma', () => ({
  prisma: {
    $executeRaw: mocks.executeRaw,
    $transaction: mocks.transaction,
    rateLimit: {
      deleteMany: mocks.rateLimitDeleteMany,
      findUnique: mocks.rateLimitFindUnique,
      updateMany: mocks.rateLimitUpdateMany,
    },
  },
}));

import {
  createLoginRateLimitKeys,
  recordLoginAttempt,
  recordSuccessfulLogin,
  reserveLoginRateLimits,
} from '$server/rate-limiter';

describe('login rate limiter', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-14T12:00:00.000Z'));
    mocks.executeRaw.mockResolvedValue(1);
    mocks.queryRaw.mockResolvedValue([{ blockedUntil: null, count: 1 }]);
    mocks.rateLimitDeleteMany.mockResolvedValue({ count: 0 });
    mocks.rateLimitFindUnique.mockResolvedValue(null);
    mocks.rateLimitUpdateMany.mockResolvedValue({ count: 0 });
    mocks.transaction.mockImplementation(
      async (
        callback: (client: {
          $queryRaw: typeof mocks.queryRaw;
          rateLimit: {
            deleteMany: typeof mocks.rateLimitDeleteMany;
            updateMany: typeof mocks.rateLimitUpdateMany;
          };
        }) => Promise<unknown>,
      ) => {
        try {
          return await callback({
            $queryRaw: mocks.queryRaw,
            rateLimit: {
              deleteMany: mocks.rateLimitDeleteMany,
              updateMany: mocks.rateLimitUpdateMany,
            },
          });
        } catch (error) {
          mocks.transactionRollback();
          throw error;
        }
      },
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps one IP bucket when an attacker rotates login names', () => {
    const first = createLoginRateLimitKeys('203.0.113.7', 'first.user');
    const second = createLoginRateLimitKeys('203.0.113.7', 'second.user');
    const otherIp = createLoginRateLimitKeys('198.51.100.4', 'first.user');

    expect(first.ip).toBe(second.ip);
    expect(first.account).not.toBe(second.account);
    expect(first.pair).not.toBe(second.pair);
    expect(first.account).toBe(otherIp.account);
    expect(first.ip).not.toBe(otherIp.ip);
    expect(first.pair).not.toBe(otherIp.pair);
  });

  it('normalizes account names and never stores credentials in rate-limit keys', () => {
    const canonical = createLoginRateLimitKeys('203.0.113.7', 'member.one');
    const normalized = createLoginRateLimitKeys(
      ' 203.0.113.7 ',
      ' MEMBER.ONE ',
    );

    expect(normalized).toEqual(canonical);
    for (const key of Object.values(canonical)) {
      expect(key).not.toContain('203.0.113.7');
      expect(key).not.toContain('member.one');
      expect(key.length).toBeLessThan(100);
    }
  });

  it('reserves all login buckets in one transaction before bcrypt', async () => {
    const keys = createLoginRateLimitKeys('203.0.113.7', 'member.one');

    const result = await reserveLoginRateLimits(keys);

    expect(result).toEqual({
      allowed: true,
      remainingAttempts: 4,
    });
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.queryRaw).toHaveBeenCalledTimes(3);
    const statements = mocks.queryRaw.mock.calls.map((call) =>
      (call[0] as readonly string[]).join(''),
    );
    for (const statement of statements) {
      expect(statement).toContain('ON CONFLICT ("key") DO UPDATE');
      expect(statement).toContain('"RateLimit"."count" < ');
      expect(statement).toContain('RETURNING "count", "blockedUntil"');
    }
  });

  it('admits the reservation reaching each threshold and arms the block', async () => {
    const keys = createLoginRateLimitKeys('203.0.113.7', 'member.one');
    mocks.queryRaw
      .mockResolvedValueOnce([
        {
          blockedUntil: new Date('2026-07-14T12:30:00.000Z'),
          count: 30,
        },
      ])
      .mockResolvedValueOnce([
        {
          blockedUntil: new Date('2026-07-14T12:30:00.000Z'),
          count: 5,
        },
      ])
      .mockResolvedValueOnce([
        {
          blockedUntil: new Date('2026-07-14T12:30:00.000Z'),
          count: 5,
        },
      ]);

    const result = await reserveLoginRateLimits(keys);

    expect(result).toEqual({ allowed: true, remainingAttempts: 0 });
  });

  it('rolls every reservation back when one bucket is already blocked', async () => {
    const keys = createLoginRateLimitKeys('203.0.113.7', 'member.one');
    mocks.queryRaw
      .mockResolvedValueOnce([{ blockedUntil: null, count: 1 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          blockedUntil: new Date('2026-07-14T12:10:00.000Z'),
          firstAttempt: new Date('2026-07-14T11:59:00.000Z'),
        },
      ]);

    const result = await reserveLoginRateLimits(keys);

    expect(result).toEqual({
      allowed: false,
      remainingAttempts: 0,
      retryAfter: 600,
    });
    expect(mocks.transactionRollback).toHaveBeenCalledTimes(1);
    expect(mocks.queryRaw).toHaveBeenCalledTimes(4);
  });

  it('returns the longest retry delay when several buckets are blocked', async () => {
    const keys = createLoginRateLimitKeys('203.0.113.7', 'member.one');
    mocks.queryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          blockedUntil: new Date('2026-07-14T12:01:00.000Z'),
          firstAttempt: new Date('2026-07-14T11:59:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          blockedUntil: new Date('2026-07-14T12:25:00.000Z'),
          firstAttempt: new Date('2026-07-14T11:59:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([{ blockedUntil: null, count: 1 }]);

    const result = await reserveLoginRateLimits(keys);

    expect(result).toEqual({
      allowed: false,
      remainingAttempts: 0,
      retryAfter: 1500,
    });
    expect(mocks.transactionRollback).toHaveBeenCalledTimes(1);
    expect(mocks.queryRaw).toHaveBeenCalledTimes(5);
  });

  it('does not lose parallel increments to a read-then-write sequence', async () => {
    await Promise.all(
      Array.from({ length: 20 }, () =>
        recordLoginAttempt('password-change:user-1', false),
      ),
    );

    expect(mocks.executeRaw).toHaveBeenCalledTimes(20);
    expect(mocks.rateLimitFindUnique).not.toHaveBeenCalled();
  });

  it('releases one focused reservation on success but preserves the IP bucket', async () => {
    const keys = createLoginRateLimitKeys('203.0.113.7', 'member.one');

    await recordSuccessfulLogin(keys);

    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.rateLimitDeleteMany).toHaveBeenCalledTimes(2);
    expect(mocks.rateLimitUpdateMany).toHaveBeenCalledTimes(2);
    for (const key of [keys.account, keys.pair]) {
      expect(mocks.rateLimitDeleteMany).toHaveBeenCalledWith({
        where: { count: { lte: 0 }, key },
      });
      expect(mocks.rateLimitUpdateMany).toHaveBeenCalledWith({
        data: { blockedUntil: null, count: { decrement: 1 } },
        where: { count: { gt: 0 }, key },
      });
    }
    const focusedMutationArguments = [
      ...mocks.rateLimitDeleteMany.mock.calls,
      ...mocks.rateLimitUpdateMany.mock.calls,
    ];
    expect(
      focusedMutationArguments.some(([argument]) =>
        JSON.stringify(argument).includes(keys.ip),
      ),
    ).toBe(false);
  });
});
