import 'server-only';

import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

import { getRequestId } from '$utils/request-context.utils';

import { logger } from './logger';
import { prisma } from './prisma';

const READINESS_MAX_WAIT_MS = 500;
const READINESS_TIMEOUT_MS = 1_500;
const FAILURE_LOG_THROTTLE_MS = 60_000;
const READINESS_SUCCESS_CACHE_MS = 2_000;
const WORKER_HEARTBEAT_STALE_AFTER_SECONDS = 60;
const QUEUE_DELAY_WARNING_AFTER_SECONDS = 5 * 60;
const NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
  Pragma: 'no-cache',
} as const;

type SchemaCheckRow = {
  auditEventKinds: number;
  auditLogColumns: number;
  auditOutcomes: number;
  auditScaleIndexes: number;
  auditSeverities: number;
  auditSnapshotTriggers: number;
  auditStreams: number;
  backgroundJobColumns: number;
  backgroundJobStatuses: number;
  durableAuditActions: number;
  loginNameReservationColumns: number;
  mfaAuditActions: number;
  mfaAuthenticationMethods: number;
  mfaChallengePurposes: number;
  mfaLoginChallengeColumns: number;
  mfaRecoveryCodeColumns: number;
  notificationColumns: number;
  notificationRecipientColumns: number;
  notificationSeverities: number;
  oldestPendingJobAgeSeconds: number | null;
  platformAuditActions: number;
  platformScaleIndexes: number;
  protectedAccounts: number;
  rateLimitColumns: number;
  sessionColumns: number;
  sessionMfaRequiredColumns: number;
  systemSettingColumns: number;
  totpCredentialColumns: number;
  totpEnrollmentColumns: number;
  userColumns: number;
  userLifecycleConstraints: number;
  userLifecycleTriggers: number;
  validProtectedRootAccounts: number;
  workerHeartbeatAgeSeconds: number | null;
};

type ReadinessResponse = {
  checks: {
    database: 'connected' | 'disconnected';
    queue: 'delayed' | 'ready' | 'unknown';
    schema: 'ready' | 'not_ready' | 'unknown';
    worker: 'not_configured' | 'ready' | 'stale' | 'unknown';
  };
  status: 'healthy' | 'unhealthy';
  timestamp: string;
};

let cachedSuccessfulReadiness:
  { expiresAt: number; response: ReadinessResponse } | undefined;

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
  if (
    process.env.NODE_ENV !== 'test' &&
    cachedSuccessfulReadiness &&
    cachedSuccessfulReadiness.expiresAt > Date.now()
  ) {
    return NextResponse.json(cachedSuccessfulReadiness.response, {
      headers: NO_STORE_HEADERS,
    });
  }

  const startedAt = Date.now();
  let queueStatus: ReadinessResponse['checks']['queue'] = 'ready';
  let workerStatus: ReadinessResponse['checks']['worker'] = 'not_configured';

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
                  'mfaVerifiedAt', 'mfaMethod',
                  'passwordReauthenticatedAt', 'criticalMfaVerifiedAt'
                )
            )::int AS "sessionColumns",
            COUNT(*) FILTER (
              WHERE table_name = 'Session'
                AND column_name IN ('mfaVerifiedAt', 'mfaMethod')
                AND is_nullable = 'NO'
            )::int AS "sessionMfaRequiredColumns",
            COUNT(*) FILTER (
              WHERE table_name = 'AuditLog'
                AND column_name IN (
                  'id', 'action', 'category', 'userId', 'targetUserId',
                  'metadata', 'actorDisplayNameSnapshot',
                  'actorLoginNameSnapshot', 'actorRoleSnapshot',
                  'targetDisplayNameSnapshot', 'targetLoginNameSnapshot',
                  'targetRoleSnapshot', 'eventVersion', 'requestId',
                  'eventKind', 'stream', 'outcome', 'severity'
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
            COUNT(*) FILTER (
              WHERE table_name = 'Notification'
                AND column_name IN (
                  'id', 'type', 'title', 'body', 'href', 'severity',
                  'dedupeKey', 'createdById', 'expiresAt', 'createdAt'
                )
            )::int AS "notificationColumns",
            COUNT(*) FILTER (
              WHERE table_name = 'NotificationRecipient'
                AND column_name IN (
                  'id', 'notificationId', 'userId', 'readAt',
                  'archivedAt', 'createdAt'
                )
            )::int AS "notificationRecipientColumns",
            COUNT(*) FILTER (
              WHERE table_name = 'SystemSetting'
                AND column_name IN (
                  'key', 'value', 'description', 'version',
                  'updatedById', 'createdAt', 'updatedAt'
                )
            )::int AS "systemSettingColumns",
            COUNT(*) FILTER (
              WHERE table_name = 'BackgroundJob'
                AND column_name IN (
                  'id', 'type', 'payload', 'status', 'priority', 'runAt',
                  'attempts', 'maxAttempts', 'lockedAt', 'lockedBy',
                  'lastError', 'completedAt', 'dedupeKey', 'createdAt',
                  'updatedAt'
                )
            )::int AS "backgroundJobColumns",
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
                  'MFA_RECOVERY_CODES_REGENERATED', 'MFA_RESET'
                )
            ) AS "mfaAuditActions",
            (
              SELECT count(*)::int
              FROM pg_enum enum_value
              JOIN pg_type enum_type ON enum_type.oid = enum_value.enumtypid
              JOIN pg_namespace enum_namespace
                ON enum_namespace.oid = enum_type.typnamespace
              WHERE enum_namespace.nspname = current_schema()
                AND enum_type.typname = 'AuditAction'
                AND enum_value.enumlabel IN (
                  'MFA_RESET', 'AUDIT_EXPORT',
                  'STEP_UP_SUCCESS', 'STEP_UP_FAILED'
                )
            ) AS "durableAuditActions",
            (
              SELECT count(*)::int
              FROM pg_enum enum_value
              JOIN pg_type enum_type ON enum_type.oid = enum_value.enumtypid
              JOIN pg_namespace enum_namespace
                ON enum_namespace.oid = enum_type.typnamespace
              WHERE enum_namespace.nspname = current_schema()
                AND enum_type.typname = 'AuditAction'
                AND enum_value.enumlabel IN (
                  'NOTIFICATION_SEND', 'SYSTEM_SETTING_UPDATE',
                  'BACKGROUND_JOB_UPDATE'
                )
            ) AS "platformAuditActions",
            (
              SELECT count(*)::int
              FROM pg_enum enum_value
              JOIN pg_type enum_type ON enum_type.oid = enum_value.enumtypid
              JOIN pg_namespace enum_namespace
                ON enum_namespace.oid = enum_type.typnamespace
              WHERE enum_namespace.nspname = current_schema()
                AND enum_type.typname = 'AuditEventKind'
                AND enum_value.enumlabel IN ('ACTIVITY', 'CONNECTION')
            ) AS "auditEventKinds",
            (
              SELECT count(*)::int
              FROM pg_enum enum_value
              JOIN pg_type enum_type ON enum_type.oid = enum_value.enumtypid
              JOIN pg_namespace enum_namespace
                ON enum_namespace.oid = enum_type.typnamespace
              WHERE enum_namespace.nspname = current_schema()
                AND enum_type.typname = 'AuditStream'
                AND enum_value.enumlabel IN (
                  'AUTHENTICATION', 'SECURITY', 'IDENTITY',
                  'AUTHORIZATION', 'SYSTEM'
                )
            ) AS "auditStreams",
            (
              SELECT count(*)::int
              FROM pg_enum enum_value
              JOIN pg_type enum_type ON enum_type.oid = enum_value.enumtypid
              JOIN pg_namespace enum_namespace
                ON enum_namespace.oid = enum_type.typnamespace
              WHERE enum_namespace.nspname = current_schema()
                AND enum_type.typname = 'AuditOutcome'
                AND enum_value.enumlabel IN ('SUCCESS', 'FAILURE', 'NEUTRAL')
            ) AS "auditOutcomes",
            (
              SELECT count(*)::int
              FROM pg_enum enum_value
              JOIN pg_type enum_type ON enum_type.oid = enum_value.enumtypid
              JOIN pg_namespace enum_namespace
                ON enum_namespace.oid = enum_type.typnamespace
              WHERE enum_namespace.nspname = current_schema()
                AND enum_type.typname = 'AuditSeverity'
                AND enum_value.enumlabel IN ('INFO', 'WARNING', 'CRITICAL')
            ) AS "auditSeverities",
            (
              SELECT count(*)::int
              FROM pg_index audit_index_state
              JOIN pg_class audit_index
                ON audit_index.oid = audit_index_state.indexrelid
              JOIN pg_class audit_table
                ON audit_table.oid = audit_index_state.indrelid
              JOIN pg_namespace audit_namespace
                ON audit_namespace.oid = audit_table.relnamespace
              WHERE audit_namespace.nspname = current_schema()
                AND audit_table.relname = 'AuditLog'
                AND audit_index.relname IN (
                  'AuditLog_actorDisplayNameSnapshot_trgm_idx',
                  'AuditLog_actorLoginNameSnapshot_trgm_idx',
                  'AuditLog_targetDisplayNameSnapshot_trgm_idx',
                  'AuditLog_targetLoginNameSnapshot_trgm_idx',
                  'AuditLog_targetUserId_action_idx'
                )
                AND audit_index_state.indisvalid
                AND audit_index_state.indisready
            ) AS "auditScaleIndexes",
            (
              SELECT count(*)::int
              FROM pg_index platform_index_state
              JOIN pg_class platform_index
                ON platform_index.oid = platform_index_state.indexrelid
              JOIN pg_class platform_table
                ON platform_table.oid = platform_index_state.indrelid
              JOIN pg_namespace platform_namespace
                ON platform_namespace.oid = platform_table.relnamespace
              WHERE platform_namespace.nspname = current_schema()
                AND platform_index.relname IN (
                  'Notification_createdAt_id_idx',
                  'Notification_expiresAt_idx',
                  'Notification_type_createdAt_id_idx',
                  'NotificationRecipient_userId_archivedAt_createdAt_notificationId_idx',
                  'NotificationRecipient_userId_readAt_archivedAt_idx',
                  'SystemSetting_updatedAt_idx',
                  'SystemSetting_updatedById_idx',
                  'BackgroundJob_status_runAt_priority_id_idx',
                  'BackgroundJob_lockedAt_idx',
                  'BackgroundJob_type_status_createdAt_idx'
                )
                AND platform_index_state.indisvalid
                AND platform_index_state.indisready
            ) AS "platformScaleIndexes",
            (
              SELECT count(*)::int
              FROM pg_trigger audit_trigger
              JOIN pg_class audit_table
                ON audit_table.oid = audit_trigger.tgrelid
              JOIN pg_namespace audit_namespace
                ON audit_namespace.oid = audit_table.relnamespace
              WHERE audit_namespace.nspname = current_schema()
                AND audit_table.relname = 'AuditLog'
                AND audit_trigger.tgname = 'AuditLog_immutable_identity_snapshots'
                AND NOT audit_trigger.tgisinternal
                AND audit_trigger.tgenabled IN ('O', 'A')
            ) AS "auditSnapshotTriggers",
            (
              SELECT count(*)::int
              FROM pg_constraint user_constraint
              JOIN pg_class user_table
                ON user_table.oid = user_constraint.conrelid
              JOIN pg_namespace user_namespace
                ON user_namespace.oid = user_table.relnamespace
              WHERE user_namespace.nspname = current_schema()
                AND user_table.relname = 'User'
                AND user_constraint.contype = 'c'
                AND user_constraint.conname IN (
                  'User_loginName_format_check',
                  'User_deleted_tombstone_check',
                  'User_protected_root_state_check'
                )
                AND user_constraint.convalidated
            ) AS "userLifecycleConstraints",
            (
              SELECT count(*)::int
              FROM pg_trigger user_trigger
              JOIN pg_class user_table
                ON user_table.oid = user_trigger.tgrelid
              JOIN pg_namespace user_namespace
                ON user_namespace.oid = user_table.relnamespace
              WHERE user_namespace.nspname = current_schema()
                AND user_table.relname = 'User'
                AND user_trigger.tgname IN (
                  'User_prevent_deleted_tombstone_mutation',
                  'User_protect_root_lifecycle'
                )
                AND NOT user_trigger.tgisinternal
                AND user_trigger.tgenabled IN ('O', 'A')
            ) AS "userLifecycleTriggers",
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
              FROM pg_enum enum_value
              JOIN pg_type enum_type ON enum_type.oid = enum_value.enumtypid
              JOIN pg_namespace enum_namespace
                ON enum_namespace.oid = enum_type.typnamespace
              WHERE enum_namespace.nspname = current_schema()
                AND enum_type.typname = 'NotificationSeverity'
                AND enum_value.enumlabel IN (
                  'INFO', 'SUCCESS', 'WARNING', 'CRITICAL'
                )
            ) AS "notificationSeverities",
            (
              SELECT count(*)::int
              FROM pg_enum enum_value
              JOIN pg_type enum_type ON enum_type.oid = enum_value.enumtypid
              JOIN pg_namespace enum_namespace
                ON enum_namespace.oid = enum_type.typnamespace
              WHERE enum_namespace.nspname = current_schema()
                AND enum_type.typname = 'BackgroundJobStatus'
                AND enum_value.enumlabel IN (
                  'PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED'
                )
            ) AS "backgroundJobStatuses",
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
            ,(
              SELECT EXTRACT(
                EPOCH FROM (CURRENT_TIMESTAMP - worker_setting."updatedAt")
              )::int
              FROM "SystemSetting" worker_setting
              WHERE worker_setting."key" = '_internal.workerHeartbeat'
            ) AS "workerHeartbeatAgeSeconds"
            ,(
              SELECT EXTRACT(
                EPOCH FROM (CURRENT_TIMESTAMP - MIN(job."runAt"))
              )::int
              FROM "BackgroundJob" job
              WHERE job."status" = 'PENDING'::"BackgroundJobStatus"
                AND job."runAt" <= CURRENT_TIMESTAMP
            ) AS "oldestPendingJobAgeSeconds"
          FROM information_schema.columns
          WHERE table_schema = current_schema()
        `;
        const schema = rows[0];

        if (
          schema?.backgroundJobColumns !== 15 ||
          schema.backgroundJobStatuses !== 5 ||
          schema.userColumns !== 15 ||
          schema.sessionColumns !== 12 ||
          schema.sessionMfaRequiredColumns !== 2 ||
          schema.auditEventKinds !== 2 ||
          schema.auditLogColumns !== 18 ||
          schema.auditOutcomes !== 3 ||
          schema.auditSeverities !== 3 ||
          schema.auditScaleIndexes !== 5 ||
          schema.auditSnapshotTriggers !== 1 ||
          schema.auditStreams !== 5 ||
          schema.durableAuditActions !== 4 ||
          schema.loginNameReservationColumns !== 3 ||
          schema.mfaAuditActions !== 5 ||
          schema.mfaAuthenticationMethods !== 2 ||
          schema.mfaChallengePurposes !== 2 ||
          schema.mfaLoginChallengeColumns !== 11 ||
          schema.mfaRecoveryCodeColumns !== 6 ||
          schema.notificationColumns !== 10 ||
          schema.notificationRecipientColumns !== 6 ||
          schema.notificationSeverities !== 4 ||
          schema.platformAuditActions !== 3 ||
          schema.platformScaleIndexes !== 10 ||
          schema.protectedAccounts !== 1 ||
          schema.rateLimitColumns !== 4 ||
          schema.systemSettingColumns !== 7 ||
          schema.totpCredentialColumns !== 9 ||
          schema.totpEnrollmentColumns !== 8 ||
          schema.userLifecycleConstraints !== 3 ||
          schema.userLifecycleTriggers !== 2 ||
          schema.validProtectedRootAccounts !== 1
        ) {
          throw new SchemaNotReadyError();
        }

        if (typeof schema.workerHeartbeatAgeSeconds === 'number') {
          workerStatus =
            schema.workerHeartbeatAgeSeconds <=
            WORKER_HEARTBEAT_STALE_AFTER_SECONDS
              ? 'ready'
              : 'stale';
        }
        if (
          typeof schema.oldestPendingJobAgeSeconds === 'number' &&
          schema.oldestPendingJobAgeSeconds > QUEUE_DELAY_WARNING_AFTER_SECONDS
        ) {
          queueStatus = 'delayed';
        }
      },
      {
        maxWait: READINESS_MAX_WAIT_MS,
        timeout: READINESS_TIMEOUT_MS,
      },
    );

    const response: ReadinessResponse = {
      checks: {
        database: 'connected',
        queue: queueStatus,
        schema: 'ready',
        worker: workerStatus,
      },
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
    if (process.env.NODE_ENV !== 'test') {
      cachedSuccessfulReadiness = {
        expiresAt: Date.now() + READINESS_SUCCESS_CACHE_MS,
        response,
      };
    }

    return NextResponse.json(response, { headers: NO_STORE_HEADERS });
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
          queue: 'unknown',
          schema: isSchemaFailure ? 'not_ready' : 'unknown',
          worker: 'unknown',
        },
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
      },
      { headers: NO_STORE_HEADERS, status: 503 },
    );
  }
}
