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

class LoginRateLimitDeniedError extends Error {
  constructor(readonly result: RateLimitResult) {
    super('Login rate-limit reservation denied');
    this.name = 'LoginRateLimitDeniedError';
  }
}

const DEFAULT_POLICY: RateLimitPolicy = {
  blockDurationMs: 30 * 60 * 1000,
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
};

/**
 * The pair bucket stops focused brute force, the account bucket stops a
 * distributed attack, and the wider IP allowance stops identifier rotation
 * without making a shared office/NAT too easy to lock accidentally.
 */
const LOGIN_POLICIES = {
  account: DEFAULT_POLICY,
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
 * Stale rows do not affect correctness: checks ignore expired windows and the
 * next failed attempt resets its row atomically. Cleanup is therefore an
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

export async function checkRateLimit(
  identifier: string,
  policy: RateLimitPolicy = DEFAULT_POLICY,
): Promise<RateLimitResult> {
  const now = new Date();
  scheduleExpiredEntriesCleanup(now);

  const entry = await prisma.rateLimit.findUnique({
    where: { key: identifier },
  });

  if (!entry) {
    return {
      allowed: true,
      remainingAttempts: policy.maxAttempts,
    };
  }

  if (entry.blockedUntil && now < entry.blockedUntil) {
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfter: Math.max(
        1,
        Math.ceil((entry.blockedUntil.getTime() - now.getTime()) / 1000),
      ),
    };
  }

  const windowExpired =
    now.getTime() - entry.firstAttempt.getTime() >= policy.windowMs;

  if (windowExpired || entry.blockedUntil) {
    return {
      allowed: true,
      remainingAttempts: policy.maxAttempts,
    };
  }

  // This also safely handles rows produced by an older implementation where
  // the threshold was reached before blockedUntil was persisted.
  if (entry.count >= policy.maxAttempts) {
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfter: Math.ceil(policy.blockDurationMs / 1000),
    };
  }

  return {
    allowed: true,
    remainingAttempts: Math.max(0, policy.maxAttempts - entry.count),
  };
}

/**
 * Records a failure in one SQL statement. PostgreSQL serializes the
 * ON CONFLICT update for a given key, so parallel failures cannot overwrite
 * each other's increments. Expired rows are reset in that same statement.
 */
const recordFailedAttempt = async (
  identifier: string,
  policy: RateLimitPolicy,
): Promise<void> => {
  const now = new Date();
  const windowStartedAfter = new Date(now.getTime() - policy.windowMs);
  const blockedUntil = new Date(now.getTime() + policy.blockDurationMs);

  await prisma.$executeRaw`
    INSERT INTO "RateLimit" (
      "id", "key", "count", "firstAttempt", "blockedUntil", "createdAt", "updatedAt"
    )
    VALUES (${randomUUID()}, ${identifier}, 1, ${now}, NULL, ${now}, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN (
          ("RateLimit"."blockedUntil" IS NOT NULL AND "RateLimit"."blockedUntil" <= ${now})
          OR (
            "RateLimit"."blockedUntil" IS NULL
            AND "RateLimit"."firstAttempt" <= ${windowStartedAfter}
          )
        ) THEN 1
        ELSE "RateLimit"."count" + 1
      END,
      "firstAttempt" = CASE
        WHEN (
          ("RateLimit"."blockedUntil" IS NOT NULL AND "RateLimit"."blockedUntil" <= ${now})
          OR (
            "RateLimit"."blockedUntil" IS NULL
            AND "RateLimit"."firstAttempt" <= ${windowStartedAfter}
          )
        ) THEN ${now}
        ELSE "RateLimit"."firstAttempt"
      END,
      "blockedUntil" = CASE
        WHEN "RateLimit"."blockedUntil" > ${now}
          THEN "RateLimit"."blockedUntil"
        WHEN (
          ("RateLimit"."blockedUntil" IS NOT NULL AND "RateLimit"."blockedUntil" <= ${now})
          OR (
            "RateLimit"."blockedUntil" IS NULL
            AND "RateLimit"."firstAttempt" <= ${windowStartedAfter}
          )
        ) THEN NULL
        WHEN "RateLimit"."count" + 1 >= ${policy.maxAttempts}
          THEN ${blockedUntil}
        ELSE NULL
      END,
      "updatedAt" = ${now}
  `;
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
 * Reserves the IP, account and pair buckets in one transaction before bcrypt.
 * A refusal or database error rolls every earlier reservation back, preventing
 * partial quota consumption and closing the read-then-write concurrency gap.
 */
export async function reserveLoginRateLimits(
  keys: LoginRateLimitKeys,
): Promise<RateLimitResult> {
  scheduleExpiredEntriesCleanup(new Date());

  try {
    return await prisma.$transaction(async (transaction) => {
      const reservations: RateLimitResult[] = [];
      const deniedReservations: RateLimitResult[] = [];
      const orderedBuckets = [
        [keys.ip, LOGIN_POLICIES.ip],
        [keys.account, LOGIN_POLICIES.account],
        [keys.pair, LOGIN_POLICIES.pair],
      ] as const;

      for (const [key, policy] of orderedBuckets) {
        const reservation = await reserveRateLimitAttempt(
          transaction,
          key,
          policy,
        );

        if (!reservation.allowed) {
          deniedReservations.push(reservation);
          continue;
        }

        reservations.push(reservation);
      }

      if (deniedReservations.length > 0) {
        throw new LoginRateLimitDeniedError({
          allowed: false,
          remainingAttempts: 0,
          retryAfter: Math.max(
            ...deniedReservations.map(
              (reservation) => reservation.retryAfter ?? 1,
            ),
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
    if (error instanceof LoginRateLimitDeniedError) return error.result;

    throw error;
  }
}

/**
 * Reserves account, source-IP and challenge quotas before an OTP or recovery
 * proof is evaluated. The account bucket prevents bypassing the six-digit
 * limit by repeatedly obtaining fresh challenges with a known password.
 */
export async function reserveMfaRateLimits(
  keys: MfaRateLimitKeys,
): Promise<RateLimitResult> {
  scheduleExpiredEntriesCleanup(new Date());

  try {
    return await prisma.$transaction(async (transaction) => {
      const reservations: RateLimitResult[] = [];
      const deniedReservations: RateLimitResult[] = [];
      const orderedBuckets = [
        [keys.ip, MFA_POLICIES.ip],
        [keys.account, MFA_POLICIES.account],
        [keys.challenge, MFA_POLICIES.challenge],
      ] as const;

      for (const [key, policy] of orderedBuckets) {
        const reservation = await reserveRateLimitAttempt(
          transaction,
          key,
          policy,
        );

        if (!reservation.allowed) {
          deniedReservations.push(reservation);
        } else {
          reservations.push(reservation);
        }
      }

      if (deniedReservations.length > 0) {
        throw new LoginRateLimitDeniedError({
          allowed: false,
          remainingAttempts: 0,
          retryAfter: Math.max(
            ...deniedReservations.map(
              (reservation) => reservation.retryAfter ?? 1,
            ),
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
    if (error instanceof LoginRateLimitDeniedError) return error.result;

    throw error;
  }
}

/**
 * Atomically consumes one password-verification attempt for an authenticated
 * sensitive action. Keeping the policy private gives every caller the same
 * protection and prevents accidentally weakening an endpoint.
 */
export async function reserveSensitiveActionRateLimit(
  identifier: string,
): Promise<RateLimitResult> {
  scheduleExpiredEntriesCleanup(new Date());

  return prisma.$transaction((transaction) =>
    reserveRateLimitAttempt(transaction, identifier, DEFAULT_POLICY),
  );
}

export async function recordLoginAttempt(
  identifier: string,
  success: boolean,
): Promise<void> {
  if (success) {
    await prisma.rateLimit.deleteMany({ where: { key: identifier } });

    return;
  }

  await recordFailedAttempt(identifier, DEFAULT_POLICY);
}

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
