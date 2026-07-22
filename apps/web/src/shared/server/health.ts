import 'server-only';

import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  isPersonEnvironmentConfigured,
  isPersonReady,
} from '$features/persons/server/person-readiness';
import { isPersonSchemaCatalogReady } from '$features/persons/server/person-schema-readiness';
import { getRequestId } from '$utils/request-context.utils';

import { logger } from './logger';
import { prisma } from './prisma';

const READINESS_TIMEOUT_MS = 1_500;
const FAILURE_LOG_THROTTLE_MS = 60_000;
const READINESS_SUCCESS_CACHE_MS = 2_000;
const NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
  Pragma: 'no-cache',
} as const;

type ReadinessResponse = {
  checks: {
    database: 'connected' | 'disconnected';
    persons: 'not_configured' | 'ready' | 'schema_not_ready' | 'unknown';
    schema: 'not_ready' | 'ready' | 'unknown';
  };
  status: 'healthy' | 'unhealthy';
  timestamp: string;
};

type CoreSchemaRow = { ready: boolean };

let cachedSuccessfulReadiness:
  { expiresAt: number; response: ReadinessResponse } | undefined;
let lastFailureLogAt = 0;

const getCurrentRequestId = async (): Promise<string | undefined> => {
  try {
    return getRequestId(await headers()) ?? undefined;
  } catch {
    return undefined;
  }
};

const logReadinessFailure = async (
  error: unknown,
  durationMs: number,
): Promise<void> => {
  const now = Date.now();
  if (now - lastFailureLogAt < FAILURE_LOG_THROTTLE_MS) return;
  lastFailureLogAt = now;
  logger.error('Readiness check failed', {
    action: 'HEALTH_READY',
    error,
    metadata: {
      component: 'database',
      durationMs,
      reasonCode: 'DATABASE_NOT_READY',
    },
    requestId: await getCurrentRequestId(),
    status: 503,
  });
};

const checkCoreSchema = async (): Promise<boolean> => {
  const rows = await prisma.$queryRaw<CoreSchemaRow[]>`
    SELECT bool_and(
      to_regclass(format('%I.%I', current_schema(), required_table.name))
      IS NOT NULL
    ) AS "ready"
    FROM (VALUES
      ('User'), ('Session'), ('AuditLog'), ('Notification'),
      ('NotificationRecipient'), ('SystemSetting'), ('RateLimit'),
      ('MfaLoginChallenge'), ('MfaRecoveryCode'), ('TotpCredential'),
      ('TotpEnrollment')
    ) AS required_table(name)
  `;

  return rows[0]?.ready === true;
};

const performReadinessCheck = async (): Promise<ReadinessResponse> => {
  const coreSchemaReady = await checkCoreSchema();
  if (!coreSchemaReady) {
    return {
      checks: {
        database: 'connected',
        persons: 'unknown',
        schema: 'not_ready',
      },
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
    };
  }

  const personSchemaReady = await isPersonSchemaCatalogReady(prisma);
  let personsStatus: ReadinessResponse['checks']['persons'] =
    'schema_not_ready';
  if (personSchemaReady) {
    const auditEncryptionKeyVersions =
      await prisma.auditEncryptionKeyVersion.findMany({
        orderBy: { version: 'asc' },
        select: { version: true },
      });
    const environmentReady = isPersonEnvironmentConfigured(
      auditEncryptionKeyVersions.map(({ version }) => version),
    );
    personsStatus = isPersonReady(environmentReady ? 'ready' : 'not_configured')
      ? 'ready'
      : 'not_configured';
  }

  return {
    checks: {
      database: 'connected',
      persons: personsStatus,
      schema: 'ready',
    },
    status: 'healthy',
    timestamp: new Date().toISOString(),
  };
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
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const response = await Promise.race([
      performReadinessCheck(),
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(
          () => reject(new Error('Readiness check timed out')),
          READINESS_TIMEOUT_MS,
        );
      }),
    ]);
    if (response.status === 'healthy' && process.env.NODE_ENV !== 'test') {
      cachedSuccessfulReadiness = {
        expiresAt: Date.now() + READINESS_SUCCESS_CACHE_MS,
        response,
      };
    }

    return NextResponse.json(response, {
      headers: NO_STORE_HEADERS,
      status: response.status === 'healthy' ? 200 : 503,
    });
  } catch (error) {
    await logReadinessFailure(error, Date.now() - startedAt);

    return NextResponse.json(
      {
        checks: {
          database: 'disconnected',
          persons: 'unknown',
          schema: 'unknown',
        },
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
      },
      { headers: NO_STORE_HEADERS, status: 503 },
    );
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
