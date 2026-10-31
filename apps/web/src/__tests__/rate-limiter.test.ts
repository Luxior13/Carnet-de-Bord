import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auditLog: vi.fn(),
  loggerError: vi.fn(),
  queryRaw: vi.fn(),
  rateLimitDeleteMany: vi.fn(),
  rateLimitFindUnique: vi.fn(),
  rateLimitUpdateMany: vi.fn(),
  reportQueryRaw: vi.fn(),
  transaction: vi.fn(),
  transactionRollback: vi.fn(),
  userFindFirst: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('$server/prisma', () => ({
  prisma: {
    // Outside a transaction: only the block report claims use it.
    $queryRaw: mocks.reportQueryRaw,
    $transaction: mocks.transaction,
    rateLimit: {
      deleteMany: mocks.rateLimitDeleteMany,
      findUnique: mocks.rateLimitFindUnique,
      updateMany: mocks.rateLimitUpdateMany,
    },
    user: { findFirst: mocks.userFindFirst },
  },
}));

vi.mock('$server/audit-log', () => ({
  createAuditLogWithHeaders: mocks.auditLog,
}));

vi.mock('$server/logger', () => ({
  logger: { error: mocks.loggerError },
}));

import {
  clearRateLimit,
  createLoginRateLimitKeys,
  createMfaRateLimitKeys,
  recordSuccessfulLogin,
  reserveLoginRateLimits,
  reserveMfaRateLimits,
  reserveSensitiveActionRateLimit,
} from '$server/rate-limiter';

const LOGIN_REPORT = {
  actorUserId: null,
  loginName: 'Member.One',
  proof: 'password',
  step: 'login',
} as const;
const REAUTH_REPORT = {
  actorUserId: 'user-1',
  proof: 'password',
  step: 'contact_email',
  targetUserId: 'user-1',
} as const;
const MFA_REPORT = {
  actorUserId: null,
  proof: 'code',
  step: 'login',
  targetUserId: 'user-1',
} as const;

describe('login rate limiter', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-14T12:00:00.000Z'));
    mocks.queryRaw.mockResolvedValue([{ blockedUntil: null, count: 1 }]);
    mocks.rateLimitDeleteMany.mockResolvedValue({ count: 0 });
    mocks.rateLimitFindUnique.mockResolvedValue(null);
    mocks.rateLimitUpdateMany.mockResolvedValue({ count: 0 });
    // The first refusal of a block claims its one-slot report bucket.
    mocks.reportQueryRaw.mockResolvedValue([
      { blockedUntil: new Date('2026-07-14T12:10:00.000Z'), count: 1 },
    ]);
    mocks.userFindFirst.mockResolvedValue({ id: 'user-1' });
    mocks.auditLog.mockResolvedValue(undefined);
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

  it('binds opaque MFA buckets independently to account, IP and challenge', () => {
    const first = createMfaRateLimitKeys(
      '203.0.113.7',
      'user-1',
      'challenge-1',
    );
    const nextChallenge = createMfaRateLimitKeys(
      '203.0.113.7',
      'user-1',
      'challenge-2',
    );
    const nextIp = createMfaRateLimitKeys(
      '198.51.100.4',
      'user-1',
      'challenge-1',
    );

    expect(first.account).toBe(nextChallenge.account);
    expect(first.ip).toBe(nextChallenge.ip);
    expect(first.challenge).not.toBe(nextChallenge.challenge);
    expect(first.account).toBe(nextIp.account);
    expect(first.challenge).toBe(nextIp.challenge);
    expect(first.ip).not.toBe(nextIp.ip);
    for (const key of Object.values(first)) {
      expect(key).not.toContain('203.0.113.7');
      expect(key).not.toContain('user-1');
      expect(key).not.toContain('challenge-1');
    }
  });

  it('reserves all three MFA buckets in one transaction', async () => {
    const keys = createMfaRateLimitKeys('203.0.113.7', 'user-1', 'challenge-1');

    const result = await reserveMfaRateLimits(keys, MFA_REPORT);

    expect(result).toEqual({ allowed: true, remainingAttempts: 4 });
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.queryRaw).toHaveBeenCalledTimes(3);
  });

  it('reserves all login buckets in one transaction before bcrypt', async () => {
    const keys = createLoginRateLimitKeys('203.0.113.7', 'member.one');

    const result = await reserveLoginRateLimits(keys, LOGIN_REPORT);

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
          blockedUntil: new Date('2026-07-14T12:15:00.000Z'),
          count: 20,
        },
      ])
      .mockResolvedValueOnce([
        {
          blockedUntil: new Date('2026-07-14T12:30:00.000Z'),
          count: 5,
        },
      ]);

    const result = await reserveLoginRateLimits(keys, LOGIN_REPORT);

    expect(result).toEqual({ allowed: true, remainingAttempts: 0 });
  });

  it('lets the account bucket absorb more failures than one source can send', async () => {
    const keys = createLoginRateLimitKeys('203.0.113.7', 'member.one');
    // IP, account and pair buckets after a fifth failure from one source.
    mocks.queryRaw
      .mockResolvedValueOnce([{ blockedUntil: null, count: 5 }])
      .mockResolvedValueOnce([{ blockedUntil: null, count: 5 }])
      .mockResolvedValueOnce([
        { blockedUntil: new Date('2026-07-14T12:30:00.000Z'), count: 5 },
      ]);

    await reserveLoginRateLimits(keys, LOGIN_REPORT);

    // The pair blocks at five (30 minutes); the account only at twenty, for
    // one 15-minute window, so a single source can never block the account.
    const [, accountCall, pairCall] = mocks.queryRaw.mock.calls;
    expect(accountCall).toContain(20);
    expect(accountCall).not.toContain(5);
    expect(pairCall).toContain(5);
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

    const result = await reserveLoginRateLimits(keys, LOGIN_REPORT);

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

    const result = await reserveLoginRateLimits(keys, LOGIN_REPORT);

    expect(result).toEqual({
      allowed: false,
      remainingAttempts: 0,
      retryAfter: 1500,
    });
    expect(mocks.transactionRollback).toHaveBeenCalledTimes(1);
    expect(mocks.queryRaw).toHaveBeenCalledTimes(5);
  });

  it('clears a sensitive-action bucket once its proof is verified', async () => {
    await clearRateLimit('account-reauth:user-1');

    expect(mocks.rateLimitDeleteMany).toHaveBeenCalledWith({
      where: { key: 'account-reauth:user-1' },
    });
  });

  it('atomically reserves one sensitive password check', async () => {
    const result = await reserveSensitiveActionRateLimit(
      'account-reauth:user-1',
      REAUTH_REPORT,
    );

    expect(result).toEqual({ allowed: true, remainingAttempts: 4 });
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.queryRaw).toHaveBeenCalledTimes(1);
    const statement = (
      mocks.queryRaw.mock.calls[0]?.[0] as readonly string[]
    ).join('');
    expect(statement).toContain('ON CONFLICT ("key") DO UPDATE');
    expect(statement).toContain('"RateLimit"."count" < ');
    expect(statement).toContain('RETURNING "count", "blockedUntil"');
  });

  it('rejects a sensitive password check atomically when its key is blocked', async () => {
    mocks.queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        blockedUntil: new Date('2026-07-14T12:10:00.000Z'),
        firstAttempt: new Date('2026-07-14T11:59:00.000Z'),
      },
    ]);

    const result = await reserveSensitiveActionRateLimit(
      'account-reauth:user-1',
      REAUTH_REPORT,
    );

    expect(result).toEqual({
      allowed: false,
      remainingAttempts: 0,
      retryAfter: 600,
    });
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.queryRaw).toHaveBeenCalledTimes(2);
  });

  it('reports the first refusal of a block in the activity journal', async () => {
    const keys = createLoginRateLimitKeys('203.0.113.7', 'member.one');
    mocks.queryRaw
      .mockResolvedValueOnce([{ blockedUntil: null, count: 1 }])
      .mockResolvedValueOnce([{ blockedUntil: null, count: 1 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          blockedUntil: new Date('2026-07-14T12:10:00.000Z'),
          firstAttempt: new Date('2026-07-14T11:59:00.000Z'),
        },
      ]);

    await reserveLoginRateLimits(keys, LOGIN_REPORT);

    // One claim for the refused pair bucket, lasting until it unblocks.
    expect(mocks.reportQueryRaw).toHaveBeenCalledTimes(1);
    const [claimSql, ...claimValues] = mocks.reportQueryRaw.mock.calls[0] ?? [];
    expect((claimSql as readonly string[]).join('')).toContain(
      'ON CONFLICT ("key") DO UPDATE',
    );
    const claimKey = claimValues.find(
      (value) =>
        typeof value === 'string' && value.startsWith('blocked-report:'),
    );
    expect(claimKey).toBeDefined();
    expect(claimKey).not.toContain(keys.pair);
    expect(mocks.userFindFirst).toHaveBeenCalledWith({
      select: { id: true },
      where: { deletedAt: null, loginName: 'member.one' },
    });
    expect(mocks.auditLog).toHaveBeenCalledTimes(1);
    expect(mocks.auditLog).toHaveBeenCalledWith({
      action: 'ATTEMPTS_BLOCKED',
      category: 'AUTH',
      description: 'Tentatives bloquées: Member.One',
      metadata: expect.objectContaining({
        blockedForSeconds: 600,
        loginName: 'Member.One',
        proof: 'password',
        step: 'login',
      }),
      targetUserId: 'user-1',
      userId: null,
    });
  });

  it('writes nothing more while the same block is already reported', async () => {
    mocks.queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        blockedUntil: new Date('2026-07-14T12:10:00.000Z'),
        firstAttempt: new Date('2026-07-14T11:59:00.000Z'),
      },
    ]);
    // The report bucket is already taken: its UPSERT returns no row.
    mocks.reportQueryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        blockedUntil: new Date('2026-07-14T12:10:00.000Z'),
        firstAttempt: new Date('2026-07-14T11:58:00.000Z'),
      },
    ]);

    const result = await reserveSensitiveActionRateLimit(
      'account-reauth:user-1',
      REAUTH_REPORT,
    );

    expect(result.allowed).toBe(false);
    expect(mocks.auditLog).not.toHaveBeenCalled();
    expect(mocks.userFindFirst).not.toHaveBeenCalled();
  });

  it('still refuses when the block report cannot be written', async () => {
    mocks.queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        blockedUntil: new Date('2026-07-14T12:10:00.000Z'),
        firstAttempt: new Date('2026-07-14T11:59:00.000Z'),
      },
    ]);
    mocks.auditLog.mockRejectedValueOnce(new Error('database unavailable'));

    const result = await reserveSensitiveActionRateLimit(
      'account-reauth:user-1',
      REAUTH_REPORT,
    );

    expect(result).toEqual({
      allowed: false,
      remainingAttempts: 0,
      retryAfter: 600,
    });
    expect(mocks.loggerError).toHaveBeenCalledTimes(1);
  });

  it('releases exactly one reservation from every bucket on success', async () => {
    const keys = createLoginRateLimitKeys('203.0.113.7', 'member.one');

    await recordSuccessfulLogin(keys);

    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.rateLimitDeleteMany).toHaveBeenCalledTimes(3);
    expect(mocks.rateLimitUpdateMany).toHaveBeenCalledTimes(3);
    for (const key of [keys.ip, keys.account, keys.pair]) {
      expect(mocks.rateLimitDeleteMany).toHaveBeenCalledWith({
        where: { count: { lte: 0 }, key },
      });
      expect(mocks.rateLimitUpdateMany).toHaveBeenCalledWith({
        data: { blockedUntil: null, count: { decrement: 1 } },
        where: { count: { gt: 0 }, key },
      });
    }
  });
});
