import 'server-only';

import { prisma } from './prisma';

/**
 * Rate Limiter for Login Attempts (Database-backed)
 *
 * Configuration:
 * - 5 failed attempts allowed per 15-minute window
 * - 30-minute block after exceeding limit
 * - Persistent storage in PostgreSQL
 */

const CONFIG = {
  /** Duration of block after exceeding limit (30 minutes) */
  blockDurationMs: 30 * 60 * 1000,
  /** Maximum failed attempts before blocking */
  maxAttempts: 5,
  /** Time window for counting attempts (15 minutes) */
  windowMs: 15 * 60 * 1000,
} as const;

/**
 * Creates a unique identifier for rate limiting from IP and email
 */
export function createRateLimitKey(ip: string | null, email: string): string {
  const sanitizedEmail = email.toLowerCase().trim();
  const sanitizedIp = ip || 'unknown';

  return `${sanitizedIp}:${sanitizedEmail}`;
}

export async function checkRateLimit(identifier: string): Promise<{
  allowed: boolean;
  remainingAttempts: number;
  retryAfter?: number;
}> {
  const now = new Date();

  // Clean up old entries first
  await prisma.rateLimit.deleteMany({
    where: {
      OR: [
        // Entries where block has expired
        {
          blockedUntil: {
            lt: now,
            not: null,
          },
        },
        // Entries where window has expired and not blocked
        {
          blockedUntil: null,
          firstAttempt: {
            lt: new Date(now.getTime() - CONFIG.windowMs),
          },
        },
      ],
    },
  });

  const entry = await prisma.rateLimit.findUnique({
    where: { key: identifier },
  });

  // Check if blocked
  if (entry?.blockedUntil) {
    if (now < entry.blockedUntil) {
      return {
        allowed: false,
        remainingAttempts: 0,
        retryAfter: Math.ceil(
          (entry.blockedUntil.getTime() - now.getTime()) / 1000,
        ),
      };
    }
    // Block expired, delete entry
    await prisma.rateLimit.delete({ where: { key: identifier } });

    return {
      allowed: true,
      remainingAttempts: CONFIG.maxAttempts,
    };
  }

  // Check window
  if (entry) {
    const windowExpired =
      now.getTime() - entry.firstAttempt.getTime() >= CONFIG.windowMs;

    if (!windowExpired) {
      if (entry.count >= CONFIG.maxAttempts) {
        // Block the user
        const blockedUntil = new Date(now.getTime() + CONFIG.blockDurationMs);
        await prisma.rateLimit.update({
          data: { blockedUntil },
          where: { key: identifier },
        });

        return {
          allowed: false,
          remainingAttempts: 0,
          retryAfter: Math.ceil(CONFIG.blockDurationMs / 1000),
        };
      }

      return {
        allowed: true,
        remainingAttempts: CONFIG.maxAttempts - entry.count,
      };
    }

    // Window expired, delete entry
    await prisma.rateLimit.delete({ where: { key: identifier } });
  }

  return {
    allowed: true,
    remainingAttempts: CONFIG.maxAttempts,
  };
}

export async function recordLoginAttempt(
  identifier: string,
  success: boolean,
): Promise<void> {
  if (success) {
    // Reset on successful login
    await prisma.rateLimit
      .delete({ where: { key: identifier } })
      .catch(() => {});

    return;
  }

  const now = new Date();
  const entry = await prisma.rateLimit.findUnique({
    where: { key: identifier },
  });

  if (entry) {
    const windowExpired =
      now.getTime() - entry.firstAttempt.getTime() >= CONFIG.windowMs;

    if (!windowExpired) {
      await prisma.rateLimit.update({
        data: { count: { increment: 1 } },
        where: { key: identifier },
      });

      return;
    }

    // Window expired, reset
    await prisma.rateLimit.update({
      data: {
        blockedUntil: null,
        count: 1,
        firstAttempt: now,
      },
      where: { key: identifier },
    });

    return;
  }

  await prisma.rateLimit.upsert({
    create: {
      count: 1,
      firstAttempt: now,
      key: identifier,
    },
    update: { count: { increment: 1 } },
    where: { key: identifier },
  });
}
