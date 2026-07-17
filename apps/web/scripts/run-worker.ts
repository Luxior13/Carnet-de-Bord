import { randomUUID } from 'node:crypto';
import { hostname } from 'node:os';

import { enqueueBackgroundJob } from '../src/shared/server/background-jobs';
import { runNextBackgroundJob } from '../src/shared/server/background-job-runner';
import { prisma } from '../src/shared/server/prisma';

const IDLE_DELAY_MS = 2_000;
const workerId = `${hostname()}:${process.pid}:${randomUUID()}`;
const shutdownController = new AbortController();
const runOnce = process.argv.includes('--once');

const requestShutdown = (): void => shutdownController.abort();
process.once('SIGINT', requestShutdown);
process.once('SIGTERM', requestShutdown);

const wait = (milliseconds: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve) => {
    const timeout = setTimeout(resolve, milliseconds);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timeout);
        resolve();
      },
      { once: true },
    );
  });

const dateKey = new Date().toISOString().slice(0, 10);
await enqueueBackgroundJob({
  dedupeKey: `platform.cleanup:${dateKey}`,
  payload: {},
  type: 'platform.cleanup',
});

try {
  if (runOnce) {
    await runNextBackgroundJob(workerId, shutdownController.signal);
  }

  while (!runOnce && !shutdownController.signal.aborted) {
    const processed = await runNextBackgroundJob(
      workerId,
      shutdownController.signal,
    );
    if (!processed) await wait(IDLE_DELAY_MS, shutdownController.signal);
  }
} finally {
  await prisma.$disconnect();
}
