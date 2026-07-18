import 'server-only';

import type { BackgroundJob, Prisma } from '@prisma/client';

import { auditTerminalBackgroundJobFailure } from '$server/background-job-audit';
import { prisma } from '$server/prisma';

const MAX_JOB_ERROR_LENGTH = 2_000;
const DEFAULT_LEASE_TIMEOUT_MS = 5 * 60 * 1_000;

type JobClient = Pick<Prisma.TransactionClient, '$queryRaw' | 'backgroundJob'>;

type RecoveredBackgroundJob = Pick<
  BackgroundJob,
  'attempts' | 'id' | 'maxAttempts' | 'status' | 'type'
>;

export const enqueueBackgroundJob = async (
  input: {
    dedupeKey?: string | null;
    maxAttempts?: number;
    payload: Prisma.InputJsonValue;
    priority?: number;
    runAt?: Date;
    type: string;
  },
  client: Pick<Prisma.TransactionClient, 'backgroundJob'> = prisma,
): Promise<BackgroundJob> => {
  const data = {
    dedupeKey: input.dedupeKey ?? null,
    maxAttempts: input.maxAttempts ?? 5,
    payload: input.payload,
    priority: input.priority ?? 0,
    runAt: input.runAt ?? new Date(),
    type: input.type,
  } satisfies Prisma.BackgroundJobUncheckedCreateInput;

  return input.dedupeKey
    ? client.backgroundJob.upsert({
        create: data,
        update: {},
        where: { dedupeKey: input.dedupeKey },
      })
    : client.backgroundJob.create({ data });
};

export const claimNextBackgroundJob = async (
  workerId: string,
  options: { leaseTimeoutMs?: number; types?: readonly string[] } = {},
): Promise<BackgroundJob | null> => {
  const now = new Date();
  const leaseExpiredBefore = new Date(
    now.getTime() - (options.leaseTimeoutMs ?? DEFAULT_LEASE_TIMEOUT_MS),
  );
  const types = options.types ? [...options.types] : [];

  return prisma.$transaction(async (transaction) => {
    const client: JobClient = transaction;

    const recoveredJobs = await client.$queryRaw<RecoveredBackgroundJob[]>`
      UPDATE "BackgroundJob" AS job
      SET
        "status" = CASE
          WHEN "attempts" >= "maxAttempts" THEN 'FAILED'::"BackgroundJobStatus"
          ELSE 'PENDING'::"BackgroundJobStatus"
        END,
        "lockedAt" = NULL,
        "lockedBy" = NULL,
        "completedAt" = CASE
          WHEN "attempts" >= "maxAttempts" THEN ${now}
          ELSE NULL
        END,
        "lastError" = CASE
          WHEN "attempts" >= "maxAttempts" THEN COALESCE("lastError", 'Worker lease expired')
          ELSE "lastError"
        END,
        "updatedAt" = ${now}
      WHERE "status" = 'RUNNING'::"BackgroundJobStatus"
        AND "lockedAt" < ${leaseExpiredBefore}
      RETURNING
        job."attempts",
        job."id",
        job."maxAttempts",
        job."status",
        job."type"
    `;

    for (const recoveredJob of recoveredJobs) {
      if (recoveredJob.status !== 'FAILED') continue;
      await auditTerminalBackgroundJobFailure(
        recoveredJob,
        'lease_expired',
        transaction,
      );
    }

    const jobs = await client.$queryRaw<BackgroundJob[]>`
      WITH next_job AS (
        SELECT "id"
        FROM "BackgroundJob"
        WHERE "status" = 'PENDING'::"BackgroundJobStatus"
          AND "runAt" <= ${now}
          AND "attempts" < "maxAttempts"
          AND (${types.length} = 0 OR "type" = ANY(${types}::text[]))
        ORDER BY "priority" DESC, "runAt" ASC, "id" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      UPDATE "BackgroundJob" AS job
      SET
        "status" = 'RUNNING'::"BackgroundJobStatus",
        "attempts" = job."attempts" + 1,
        "lockedAt" = ${now},
        "lockedBy" = ${workerId},
        "updatedAt" = ${now}
      FROM next_job
      WHERE job."id" = next_job."id"
      RETURNING job.*
    `;

    return jobs[0] ?? null;
  });
};

export const completeBackgroundJob = async (
  jobId: string,
  workerId: string,
): Promise<boolean> => {
  const result = await prisma.backgroundJob.updateMany({
    data: {
      completedAt: new Date(),
      lastError: null,
      lockedAt: null,
      lockedBy: null,
      status: 'SUCCEEDED',
    },
    where: { id: jobId, lockedBy: workerId, status: 'RUNNING' },
  });

  return result.count === 1;
};

export const failBackgroundJob = async (
  job: Pick<BackgroundJob, 'attempts' | 'id' | 'maxAttempts' | 'type'>,
  workerId: string,
  error: unknown,
  retryAt = new Date(),
): Promise<boolean> => {
  const message = (
    error instanceof Error ? error.message : String(error)
  ).slice(0, MAX_JOB_ERROR_LENGTH);
  const exhausted = job.attempts >= job.maxAttempts;

  return prisma.$transaction(async (transaction) => {
    const result = await transaction.backgroundJob.updateMany({
      data: {
        ...(exhausted ? { completedAt: new Date() } : { runAt: retryAt }),
        lastError: message,
        lockedAt: null,
        lockedBy: null,
        status: exhausted ? 'FAILED' : 'PENDING',
      },
      where: { id: job.id, lockedBy: workerId, status: 'RUNNING' },
    });

    if (result.count === 1 && exhausted) {
      await auditTerminalBackgroundJobFailure(
        job,
        'handler_error',
        transaction,
      );
    }

    return result.count === 1;
  });
};
