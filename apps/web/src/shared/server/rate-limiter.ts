import 'server-only';

import { createHash, randomUUID } from 'node:crypto';

import type { Prisma } from '@prisma/client';

import { prisma } from './prisma';

type RateLimitPolicy = {
  blockDurationMs: number;
  maxAttempts: number;
  windowMs: number;
};

export type LoginRateLimitKeys = {
  account: string;
  ip: string;
  pair: string;
};

export type MfaRateLimitKeys = {
  account: string;
  challenge: string;
  ip: string;
};

type RateLimitResult = {
  allowed: boolean;
  remainingAttempts: number;
  retryAfter?: number;
};

type RateLimitReservationClient = Pick<Prisma.TransactionClient, '$queryRaw'>;

class RateLimitDeniedError extends Error {
  constructor(readonly result: RateLimitResult) {
    super('Rate-limit reservation denied');
    this.name = 'RateLimitDeniedError';
  }
}

const DEFAULT_POLICY: RateLimitPolicy = {
  blockDurationMs: 30 * 60 * 1000,
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
};

/**
 * The pair bucket stops focused brute force and the wider IP allowance stops
 * identifier rotation without making a shared office/NAT too easy to lock.
 * The account bucket only caps a distributed attack: one source exhausts its
 * pair bucket after five failures, so blocking an account requires at least
 * four sources failing continuously, and the block lasts one window, not two.
 */
const LOGIN_POLICIES = {
  account: {
    blockDurationMs: 15 * 60 * 1000,
    maxAttempts: 20,
    windowMs: 15 * 60 * 1000,
  },
  ip: {
    blockDurationMs: 30 * 60 * 1000,
    maxAttempts: 30,
    windowMs: 15 * 60 * 1000,
  },
  pair: DEFAULT_POLICY,
} satisfies Record<keyof LoginRateLimitKeys, RateLimitPolicy>;

const MFA_POLICIES = {
  account: DEFAULT_POLICY,
  challenge: DEFAULT_POLICY,
  ip: {
    blockDurationMs: 30 * 60 * 1000,
    maxAttempts: 30,
    windowMs: 15 * 60 * 1000,
  },
} satisfies Record<keyof MfaRateLimitKeys, RateLimitPolicy>;

const AUTHENTICATED_API_POLICY: RateLimitPolicy = {
  blockDurationMs: 60 * 1000,
  maxAttempts: 300,
  windowMs: 60 * 1000,
};

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
let nextCleanupAt = 0;

const hashKeyPart = (scope: string, value: string): string =>
  createHash('sha256')
    .update(`team-control:${scope}\0${value}`, 'utf8')
    .digest('hex');

const normalizeIp = (ip: string | null): string => ip?.trim() || 'unknown';

const normalizeLoginName = (loginName: string): string =>
  loginName.toLowerCase().trim();

/**
 * Builds bounded, opaque keys. Neither the source IP nor the login name is
 * stored in clear text in the rate-limit table.
 */
export function createLoginRateLimitKeys(
  ip: string | null,
  loginName: string,
): LoginRateLimitKeys {
  const canonicalIp = normalizeIp(ip);
  const canonicalLoginName = normalizeLoginName(loginName);

  return {
    account: `auth-login:account:${hashKeyPart('account', canonicalLoginName)}`,
    ip: `auth-login:ip:${hashKeyPart('ip', canonicalIp)}`,
    pair: `auth-login:pair:${hashKeyPart(
      'pair',
      `${canonicalIp}\0${canonicalLoginName}`,
    )}`,
  };
}

export function createMfaRateLimitKeys(
  ip: string | null,
  userId: string,
  challengeTokenHash: string,
): MfaRateLimitKeys {
  const canonicalIp = normalizeIp(ip);

  return {
    account: `auth-mfa:account:${hashKeyPart('mfa-account', userId)}`,
    challenge: `auth-mfa:challenge:${hashKeyPart(
      'mfa-challenge',
      challengeTokenHash,
    )}`,
    ip: `auth-mfa:ip:${hashKeyPart('mfa-ip', canonicalIp)}`,
  };
}

/**
 * Stale rows do not affect correctness: the next reservation of an expired
 * window resets its row atomically. Cleanup is therefore an
 * infrequent, non-blocking maintenance task instead of work awaited by every
 * login request.
 */
const scheduleExpiredEntriesCleanup = (now: Date): void => {
  if (now.getTime() < nextCleanupAt) return;

  nextCleanupAt = now.getTime() + CLEANUP_INTERVAL_MS;
  void prisma.rateLimit
    .deleteMany({
      where: {
        OR: [
          { blockedUntil: { lt: now, not: null } },
          {
            blockedUntil: null,
            firstAttempt: {
              lt: new Date(now.getTime() - DEFAULT_POLICY.windowMs),
            },
          },
        ],
      },
    })
    .catch(() => {
      // Cleanup is best-effort and must not turn authentication into a 500.
      nextCleanupAt = 0;
    });
};

/**
 * Atomically reserves one expensive password verification. PostgreSQL locks
 * the conflicting key while executing the UPSERT, so parallel requests cannot
 * all observe the same remaining slot. The request that reaches the threshold
 * is admitted; the next one is rejected without mutating the row.
 */
const reserveRateLimitAttempt = async (
  client: RateLimitReservationClient,
  identifier: string,
  policy: RateLimitPolicy,
): Promise<RateLimitResult> => {
  const now = new Date();
  const windowStartedAfter = new Date(now.getTime() - policy.windowMs);
  const blockedUntil = new Date(now.getTime() + policy.blockDurationMs);
  const initialBlockedUntil = policy.maxAttempts === 1 ? blockedUntil : null;
  const entries = await client.$queryRaw<
    { blockedUntil: Date | null; count: number }[]
  >`
    INSERT INTO "RateLimit" (
      "id", "key", "count", "firstAttempt", "blockedUntil", "createdAt", "updatedAt"
    )
    VALUES (
      ${randomUUID()}, ${identifier}, 1, ${now}, ${initialBlockedUntil}, ${now}, ${now}
    )
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN (
          "RateLimit"."blockedUntil" IS NOT NULL
          OR "RateLimit"."firstAttempt" <= ${windowStartedAfter}
        ) THEN 1
        ELSE "RateLimit"."count" + 1
      END,
      "firstAttempt" = CASE
        WHEN (
          "RateLimit"."blockedUntil" IS NOT NULL
          OR "RateLimit"."firstAttempt" <= ${windowStartedAfter}
        ) THEN ${now}
        ELSE "RateLimit"."firstAttempt"
      END,
      "blockedUntil" = CASE
        WHEN (
          "RateLimit"."blockedUntil" IS NOT NULL
          OR "RateLimit"."firstAttempt" <= ${windowStartedAfter}
        ) THEN ${initialBlockedUntil}
        WHEN "RateLimit"."count" + 1 >= ${policy.maxAttempts}
          THEN ${blockedUntil}
        ELSE NULL
      END,
      "updatedAt" = ${now}
    WHERE
      (
        "RateLimit"."blockedUntil" IS NULL
        OR "RateLimit"."blockedUntil" <= ${now}
      )
      AND (
        "RateLimit"."blockedUntil" IS NOT NULL
        OR "RateLimit"."firstAttempt" <= ${windowStartedAfter}
        OR "RateLimit"."count" < ${policy.maxAttempts}
      )
    RETURNING "count", "blockedUntil"
  `;
  const entry = entries[0];

  if (entry) {
    return {
      allowed: true,
      remainingAttempts: Math.max(0, policy.maxAttempts - entry.count),
    };
  }

  const blockedEntries = await client.$queryRaw<
    { blockedUntil: Date | null; firstAttempt: Date }[]
  >`
    SELECT "blockedUntil", "firstAttempt"
    FROM "RateLimit"
    WHERE "key" = ${identifier}
    LIMIT 1
  `;
  const blockedEntry = blockedEntries[0];
  const retryAt =
    blockedEntry?.blockedUntil ??
    (blockedEntry
      ? new Date(blockedEntry.firstAttempt.getTime() + policy.windowMs)
      : blockedUntil);

  return {
    allowed: false,
    remainingAttempts: 0,
    retryAfter: Math.max(
      1,
      Math.ceil((retryAt.getTime() - now.getTime()) / 1000),
    ),
  };
};

/**
 * Reserves every bucket in one transaction before the expensive or sensitive
 * check. A refusal or database error rolls every earlier reservation back,
 * preventing partial quota consumption and closing the read-then-write gap.
 */
const reserveRateLimitBuckets = async (
  buckets: readonly (readonly [key: string, policy: RateLimitPolicy])[],
): Promise<RateLimitResult> => {
  scheduleExpiredEntriesCleanup(new Date());

  try {
    return await prisma.$transaction(async (transaction) => {
      const reservations: RateLimitResult[] = [];
      const denials: RateLimitResult[] = [];

      for (const [key, policy] of buckets) {
        const reservation = await reserveRateLimitAttempt(
          transaction,
          key,
          policy,
        );
        (reservation.allowed ? reservations : denials).push(reservation);
      }

      if (denials.length > 0) {
        throw new RateLimitDeniedError({
          allowed: false,
          remainingAttempts: 0,
          retryAfter: Math.max(
            ...denials.map((denial) => denial.retryAfter ?? 1),
          ),
        });
      }

      return {
        allowed: true,
        remainingAttempts: Math.min(
          ...reservations.map((reservation) => reservation.remainingAttempts),
        ),
      };
    });
  } catch (error) {
    if (error instanceof RateLimitDeniedError) return error.result;
    throw error;
  }
};

/**
 * Durable per-account API budget shared by every application instance. The
 * edge limiter remains a cheap first line of defence; this reservation closes
 * the multi-instance bypass after the session has been authenticated.
 */
export const reserveAuthenticatedApiRateLimit = (
  userId: string,
): Promise<RateLimitResult> =>
  reserveRateLimitBuckets([
    [
      `api:account:${hashKeyPart('api-account', userId)}`,
      AUTHENTICATED_API_POLICY,
    ],
  ]);

/** Reserves the IP, account and pair buckets before the password hash is verified. */
export const reserveLoginRateLimits = (
  keys: LoginRateLimitKeys,
): Promise<RateLimitResult> =>
  reserveRateLimitBuckets([
    [keys.ip, LOGIN_POLICIES.ip],
    [keys.account, LOGIN_POLICIES.account],
    [keys.pair, LOGIN_POLICIES.pair],
  ]);

/**
 * Reserves account, source-IP and challenge quotas before an OTP or recovery
 * proof is evaluated. The account bucket prevents bypassing the six-digit
 * limit by repeatedly obtaining fresh challenges with a known password.
 */
export const reserveMfaRateLimits = (
  keys: MfaRateLimitKeys,
): Promise<RateLimitResult> =>
  reserveRateLimitBuckets([
    [keys.ip, MFA_POLICIES.ip],
    [keys.account, MFA_POLICIES.account],
    [keys.challenge, MFA_POLICIES.challenge],
  ]);

/**
 * Atomically consumes one password or code verification for an authenticated
 * sensitive action. Keeping the policy private gives every caller the same
 * protection and prevents accidentally weakening an endpoint.
 */
export const reserveSensitiveActionRateLimit = (
  identifier: string,
): Promise<RateLimitResult> =>
  reserveRateLimitBuckets([[identifier, DEFAULT_POLICY]]);

/** A verified proof clears its sensitive-action bucket. */
export const clearRateLimit = async (identifier: string): Promise<void> => {
  await prisma.rateLimit.deleteMany({ where: { key: identifier } });
};

/**
 * A valid password releases exactly this request's reservation from every
 * login bucket. Atomic decrements preserve earlier and concurrent failures,
 * while successful logins cannot gradually exhaust the shared IP allowance.
 */
export async function recordSuccessfulLogin(
  keys: LoginRateLimitKeys,
): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    for (const key of [keys.ip, keys.account, keys.pair]) {
      await transaction.rateLimit.updateMany({
        data: {
          blockedUntil: null,
          count: { decrement: 1 },
        },
        where: { count: { gt: 0 }, key },
      });
      await transaction.rateLimit.deleteMany({
        where: { count: { lte: 0 }, key },
      });
    }
  });
}
