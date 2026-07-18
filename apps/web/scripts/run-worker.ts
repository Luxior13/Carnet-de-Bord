import { randomUUID } from 'node:crypto';
import { hostname } from 'node:os';

import { runNextBackgroundJob } from '../src/shared/server/background-job-runner';
import { enqueueBackgroundJob } from '../src/shared/server/background-jobs';
import { prisma } from '../src/shared/server/prisma';

const IDLE_DELAY_MS = 2_000;
const HEARTBEAT_INTERVAL_MS = 15_000;
const WORKER_HEARTBEAT_KEY = '_internal.workerHeartbeat';
const workerId = `${hostname()}:${process.pid}:${randomUUID()}`;
const shutdownController = new AbortController();
const runOnce = process.argv.includes('--once');

const requestShutdown = (): void => shutdownController.abort();
process.once('SIGINT', requestShutdown);
process.once('SIGTERM', requestShutdown);

const wait = (milliseconds: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve) => {
    if (signal.aborted) {
      resolve();

      return;
    }

    const finish = (): void => {
      clearTimeout(timeout);
      signal.removeEventListener('abort', finish);
      resolve();
    };
    const timeout = setTimeout(finish, milliseconds);
    signal.addEventListener('abort', finish, { once: true });
  });

let scheduledCleanupDateKey: string | null = null;
let nextHeartbeatAt = 0;

const ensureDailyCleanupIsScheduled = async (now: Date): Promise<void> => {
  const dateKey = now.toISOString().slice(0, 10);
  if (scheduledCleanupDateKey === dateKey) return;

  await enqueueBackgroundJob({
    dedupeKey: `platform.cleanup:${dateKey}`,
    payload: {},
    type: 'platform.cleanup',
  });
  scheduledCleanupDateKey = dateKey;
};

const recordWorkerHeartbeatIfDue = async (now: Date): Promise<void> => {
  if (now.getTime() < nextHeartbeatAt) return;

  await prisma.systemSetting.upsert({
    create: {
      description: 'Internal background worker heartbeat',
      key: WORKER_HEARTBEAT_KEY,
      value: { seenAt: now.toISOString() },
    },
    update: { value: { seenAt: now.toISOString() } },
    where: { key: WORKER_HEARTBEAT_KEY },
  });
  nextHeartbeatAt = now.getTime() + HEARTBEAT_INTERVAL_MS;
};

try {
  const startedAt = new Date();
  await ensureDailyCleanupIsScheduled(startedAt);
  await recordWorkerHeartbeatIfDue(startedAt);

  if (runOnce) {
    await runNextBackgroundJob(workerId, shutdownController.signal);
  }

  while (!runOnce && !shutdownController.signal.aborted) {
    const now = new Date();
    await ensureDailyCleanupIsScheduled(now);
    await recordWorkerHeartbeatIfDue(now);
    const processed = await runNextBackgroundJob(
      workerId,
      shutdownController.signal,
    );
    if (!processed) await wait(IDLE_DELAY_MS, shutdownController.signal);
  }
} finally {
  await prisma.$disconnect();
}
