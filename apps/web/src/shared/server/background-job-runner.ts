import 'server-only';

import type { Prisma } from '@prisma/client';

import {
  claimNextBackgroundJob,
  completeBackgroundJob,
  failBackgroundJob,
} from '$server/background-jobs';
import { logger } from '$server/logger';
import { prisma } from '$server/prisma';
import { getSystemSettingValue } from '$server/system-settings';

export type BackgroundJobHandler = (
  payload: Prisma.JsonValue,
  context: { jobId: string; signal: AbortSignal },
) => Promise<void>;

const cleanupPlatformData: BackgroundJobHandler = async () => {
  const now = new Date();
  const [auditRetentionDays, notificationRetentionDays, jobRetentionDays] =
    await Promise.all([
      getSystemSettingValue('audit.retentionDays'),
      getSystemSettingValue('notifications.retentionDays'),
      getSystemSettingValue('jobs.retentionDays'),
    ]);
  const auditCutoff = new Date(now.getTime() - auditRetentionDays * 86_400_000);
  const notificationCutoff = new Date(
    now.getTime() - notificationRetentionDays * 86_400_000,
  );
  const jobCutoff = new Date(now.getTime() - jobRetentionDays * 86_400_000);

  await prisma.$transaction([
    prisma.auditLog.deleteMany({
      where: { createdAt: { lt: auditCutoff } },
    }),
    prisma.notification.deleteMany({
      where: {
        OR: [
          { createdAt: { lt: notificationCutoff } },
          { expiresAt: { lt: now } },
        ],
      },
    }),
    prisma.backgroundJob.deleteMany({
      where: {
        completedAt: { lt: jobCutoff },
        status: { in: ['CANCELLED', 'FAILED', 'SUCCEEDED'] },
      },
    }),
    prisma.mfaLoginChallenge.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.totpEnrollment.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.session.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: now } }, { idleExpiresAt: { lt: now } }],
      },
    }),
    prisma.rateLimit.deleteMany({
      where: {
        OR: [
          { blockedUntil: { lt: now } },
          {
            blockedUntil: null,
            updatedAt: { lt: new Date(now.getTime() - 86_400_000) },
          },
        ],
      },
    }),
  ]);
};

export const BACKGROUND_JOB_HANDLERS = new Map<string, BackgroundJobHandler>([
  ['platform.cleanup', cleanupPlatformData],
]);

export const runNextBackgroundJob = async (
  workerId: string,
  signal: AbortSignal,
  handlers: ReadonlyMap<string, BackgroundJobHandler> = BACKGROUND_JOB_HANDLERS,
): Promise<boolean> => {
  const job = await claimNextBackgroundJob(workerId, {
    types: [...handlers.keys()],
  });
  if (!job) return false;

  const handler = handlers.get(job.type);
  if (!handler) {
    await failBackgroundJob(
      { ...job, attempts: job.maxAttempts },
      workerId,
      new Error(`No handler registered for ${job.type}`),
    );

    return true;
  }

  try {
    await handler(job.payload, { jobId: job.id, signal });
    const completed = await completeBackgroundJob(job.id, workerId);
    if (!completed) {
      logger.warn('Background job completion lost its lease', {
        action: 'BACKGROUND_JOB_COMPLETE',
        metadata: { jobId: job.id, type: job.type },
      });
    }
  } catch (error) {
    const retryDelayMs = Math.min(60 * 60_000, 2 ** job.attempts * 30_000);
    await failBackgroundJob(
      job,
      workerId,
      error,
      new Date(Date.now() + retryDelayMs),
    );
    logger.error('Background job failed', {
      action: 'BACKGROUND_JOB_RUN',
      error,
      metadata: { attempts: job.attempts, jobId: job.id, type: job.type },
    });
  }

  return true;
};
