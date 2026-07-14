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
  loginNameReservationColumns: number;
  mfaAuditActions: number;
  mfaAuthenticationMethods: number;
  mfaChallengePurposes: number;
  mfaLoginChallengeColumns: number;
  mfaRecoveryCodeColumns: number;
  protectedAccounts: number;
  rateLimitColumns: number;
  sessionColumns: number;
  totpCredentialColumns: number;
  totpEnrollmentColumns: number;
  userColumns: number;
  validProtectedRootAccounts: number;
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
                  'id', 'loginName', 'contactEmail',
                  'contactEmailVerifiedAt', 'passwordHash', 'role', 'permissions',
                  'isActive', 'isProtected', 'mustChangePassword',
                  'failedLoginAttempts', 'lockedUntil', 'securityVersion',
                  'deletedAt', 'mfaEnabledAt'
                )
            )::int AS "userColumns",
            COUNT(*) FILTER (
              WHERE table_name = 'Session'
                AND column_name IN (
                  'id', 'userId', 'token', 'expiresAt', 'idleExpiresAt',
                  'lastSeenAt', 'rememberMe', 'securityVersion',
                  'mfaVerifiedAt', 'mfaMethod'
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
              WHERE table_name = 'LoginNameReservation'
                AND column_name IN ('loginName', 'userId', 'createdAt')
            )::int AS "loginNameReservationColumns",
            COUNT(*) FILTER (
              WHERE table_name = 'RateLimit'
                AND column_name IN (
                  'key', 'count', 'firstAttempt', 'blockedUntil'
              )
            )::int AS "rateLimitColumns",
            COUNT(*) FILTER (
              WHERE table_name = 'TotpCredential'
                AND column_name IN (
                  'userId', 'secretCiphertext', 'secretIv', 'secretAuthTag',
                  'secretKeyVersion', 'lastUsedTimeStep', 'lastUsedAt',
                  'createdAt', 'updatedAt'
                )
            )::int AS "totpCredentialColumns",
            COUNT(*) FILTER (
              WHERE table_name = 'TotpEnrollment'
                AND column_name IN (
                  'userId', 'secretCiphertext', 'secretIv', 'secretAuthTag',
                  'secretKeyVersion', 'expiresAt', 'createdAt', 'updatedAt'
                )
            )::int AS "totpEnrollmentColumns",
            COUNT(*) FILTER (
              WHERE table_name = 'MfaRecoveryCode'
                AND column_name IN (
                  'id', 'userId', 'codeHash', 'salt', 'usedAt', 'createdAt'
                )
            )::int AS "mfaRecoveryCodeColumns",
            COUNT(*) FILTER (
              WHERE table_name = 'MfaLoginChallenge'
                AND column_name IN (
                  'id', 'userId', 'tokenHash', 'purpose', 'securityVersion',
                  'credentialUpdatedAt', 'rememberMe', 'attempts',
                  'expiresAt', 'createdAt', 'updatedAt'
                )
            )::int AS "mfaLoginChallengeColumns",
            (
              SELECT count(*)::int
              FROM pg_enum enum_value
              JOIN pg_type enum_type ON enum_type.oid = enum_value.enumtypid
              JOIN pg_namespace enum_namespace
                ON enum_namespace.oid = enum_type.typnamespace
              WHERE enum_namespace.nspname = current_schema()
                AND enum_type.typname = 'AuditAction'
                AND enum_value.enumlabel IN (
                  'MFA_ENABLED', 'MFA_DISABLED',
                  'MFA_RECOVERY_CODE_USED',
                  'MFA_RECOVERY_CODES_REGENERATED'
                )
            ) AS "mfaAuditActions",
            (
              SELECT count(*)::int
              FROM pg_enum enum_value
              JOIN pg_type enum_type ON enum_type.oid = enum_value.enumtypid
              JOIN pg_namespace enum_namespace
                ON enum_namespace.oid = enum_type.typnamespace
              WHERE enum_namespace.nspname = current_schema()
                AND enum_type.typname = 'MfaAuthenticationMethod'
                AND enum_value.enumlabel IN ('TOTP', 'RECOVERY_CODE')
            ) AS "mfaAuthenticationMethods",
            (
              SELECT count(*)::int
              FROM pg_enum enum_value
              JOIN pg_type enum_type ON enum_type.oid = enum_value.enumtypid
              JOIN pg_namespace enum_namespace
                ON enum_namespace.oid = enum_type.typnamespace
              WHERE enum_namespace.nspname = current_schema()
                AND enum_type.typname = 'MfaChallengePurpose'
                AND enum_value.enumlabel IN ('LOGIN', 'SETUP')
            ) AS "mfaChallengePurposes",
            (
              SELECT count(*)::int
              FROM "User"
              WHERE "isProtected" = true
            ) AS "protectedAccounts",
            (
              SELECT count(*)::int
              FROM "User"
              WHERE "isProtected" = true
                AND "role" = 'ADMIN'
                AND "isActive" = true
                AND "deletedAt" IS NULL
            ) AS "validProtectedRootAccounts"
          FROM information_schema.columns
          WHERE table_schema = current_schema()
        `;
        const schema = rows[0];

        if (
          schema?.userColumns !== 15 ||
          schema.sessionColumns !== 10 ||
          schema.auditLogColumns !== 6 ||
          schema.loginNameReservationColumns !== 3 ||
          schema.mfaAuditActions !== 4 ||
          schema.mfaAuthenticationMethods !== 2 ||
          schema.mfaChallengePurposes !== 2 ||
          schema.mfaLoginChallengeColumns !== 11 ||
          schema.mfaRecoveryCodeColumns !== 6 ||
          schema.protectedAccounts !== 1 ||
          schema.rateLimitColumns !== 4 ||
          schema.totpCredentialColumns !== 9 ||
          schema.totpEnrollmentColumns !== 8 ||
          schema.validProtectedRootAccounts !== 1
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
