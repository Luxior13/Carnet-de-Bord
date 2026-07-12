import 'server-only';

import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

import { getRequestId } from '$utils/request-context.utils';

import { logger } from './logger';
import { prisma } from './prisma';

const READINESS_MAX_WAIT_MS = 500;
const READINESS_TIMEOUT_MS = 1_500;
const FAILURE_LOG_THROTTLE_MS = 60_000;
const NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
  Pragma: 'no-cache',
} as const;

type SchemaCheckRow = {
  auditLogColumns: number;
  rateLimitColumns: number;
  sessionColumns: number;
  userColumns: number;
};

type ReadinessResponse = {
  checks: {
    database: 'connected' | 'disconnected';
    schema: 'ready' | 'not_ready' | 'unknown';
  };
  status: 'healthy' | 'unhealthy';
  timestamp: string;
};

class SchemaNotReadyError extends Error {
  constructor() {
    super('Required database schema is missing');
    this.name = 'SchemaNotReadyError';
  }
}

const lastFailureLogAt = new Map<string, number>();

const getCurrentRequestId = async (): Promise<string | undefined> => {
  try {
    return getRequestId(await headers()) ?? undefined;
  } catch {
    return undefined;
  }
};

const logReadinessFailure = async (
  error: unknown,
  component: 'database' | 'schema',
  durationMs: number,
  reasonCode: 'DATABASE_NOT_READY' | 'SCHEMA_NOT_READY',
): Promise<void> => {
  const now = Date.now();
  const previousLogAt = lastFailureLogAt.get(reasonCode) ?? 0;

  if (now - previousLogAt < FAILURE_LOG_THROTTLE_MS) return;

  lastFailureLogAt.set(reasonCode, now);
  logger.error('Readiness check failed', {
    action: 'HEALTH_READY',
    error,
    metadata: { component, durationMs, reasonCode },
    requestId: await getCurrentRequestId(),
    status: 503,
  });
};

export async function createReadinessResponse(): Promise<
  NextResponse<ReadinessResponse>
> {
  const startedAt = Date.now();

  try {
    await prisma.$transaction(
      async (transaction) => {
        const rows = await transaction.$queryRaw<SchemaCheckRow[]>`
          SELECT
            COUNT(*) FILTER (
              WHERE table_name = 'User'
                AND column_name IN (
                  'id', 'email', 'passwordHash', 'role', 'permissions',
                  'isActive', 'isProtected', 'mustChangePassword',
                  'failedLoginAttempts', 'lockedUntil', 'deletedAt'
                )
            )::int AS "userColumns",
            COUNT(*) FILTER (
              WHERE table_name = 'Session'
                AND column_name IN (
                  'id', 'userId', 'token', 'expiresAt', 'rememberMe'
                )
            )::int AS "sessionColumns",
            COUNT(*) FILTER (
              WHERE table_name = 'AuditLog'
                AND column_name IN (
                  'id', 'action', 'category', 'userId', 'targetUserId',
                  'metadata'
                )
            )::int AS "auditLogColumns",
            COUNT(*) FILTER (
              WHERE table_name = 'RateLimit'
                AND column_name IN (
                  'key', 'count', 'firstAttempt', 'blockedUntil'
                )
            )::int AS "rateLimitColumns"
          FROM information_schema.columns
          WHERE table_schema = current_schema()
        `;
        const schema = rows[0];

        if (
          schema?.userColumns !== 11 ||
          schema.sessionColumns !== 5 ||
          schema.auditLogColumns !== 6 ||
          schema.rateLimitColumns !== 4
        ) {
          throw new SchemaNotReadyError();
        }
      },
      {
        maxWait: READINESS_MAX_WAIT_MS,
        timeout: READINESS_TIMEOUT_MS,
      },
    );

    return NextResponse.json(
      {
        checks: { database: 'connected', schema: 'ready' },
        status: 'healthy',
        timestamp: new Date().toISOString(),
      },
      { headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    const isSchemaFailure = error instanceof SchemaNotReadyError;
    await logReadinessFailure(
      error,
      isSchemaFailure ? 'schema' : 'database',
      Date.now() - startedAt,
      isSchemaFailure ? 'SCHEMA_NOT_READY' : 'DATABASE_NOT_READY',
    );

    return NextResponse.json(
      {
        checks: {
          database: isSchemaFailure ? 'connected' : 'disconnected',
          schema: isSchemaFailure ? 'not_ready' : 'unknown',
        },
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
      },
      { headers: NO_STORE_HEADERS, status: 503 },
    );
  }
}
