import { randomUUID } from 'node:crypto';

import { Prisma, PrismaClient } from '@prisma/client';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('$server/prisma', () => ({ prisma: {} }));
vi.mock('$server/logger', () => ({ logger: { warn: vi.fn() } }));

import {
  lockNotificationRetention,
  purgeExpiredNotifications,
} from '$server/notification-retention';

// Opt-in PostgreSQL test. Only a newly created, random schema is written or dropped.
// Opt-in direct Vitest command, intentionally outside cached Turbo tasks.
// eslint-disable-next-line turbo/no-undeclared-env-vars
const databaseUrl = process.env.RETENTION_TEST_DATABASE_URL;
describe.skipIf(!databaseUrl)(
  'notification retention PostgreSQL concurrency',
  () => {
    const schema = `retention_test_${randomUUID().replaceAll('-', '')}`;
    let admin: PrismaClient;
    let client: PrismaClient;
    let created = false;
    const now = new Date('2026-09-27T12:00:00Z');
    const transactionOptions = {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      timeout: 15_000,
    };
    const gate = (): { promise: Promise<void>; release: () => void } => {
      let release!: () => void;
      const promise = new Promise<void>((resolve) => {
        release = resolve;
      });

      return { promise, release };
    };
    const waitForLock = async (pid: number): Promise<void> => {
      await expect
        .poll(
          async () => {
            const rows = await admin.$queryRaw<Array<{ waiting: boolean }>>`
        SELECT EXISTS (SELECT 1 FROM pg_locks WHERE pid = ${pid} AND locktype = 'advisory' AND NOT granted) AS waiting
      `;

            return rows[0]?.waiting;
          },
          { timeout: 5_000 },
        )
        .toBe(true);
    };
    beforeAll(async () => {
      if (!databaseUrl) throw new Error('A test database URL is required');
      admin = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
      // Identifier contains only this test's fixed prefix and a generated hex UUID.
      await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
      created = true;
      const url = new URL(databaseUrl);
      url.searchParams.set('schema', schema);
      client = new PrismaClient({
        datasources: { db: { url: url.toString() } },
      });
      const currentSchema = await client.$queryRaw<
        Array<{ name: string }>
      >`SELECT current_schema() AS name`;
      expect(currentSchema[0]?.name).toBe(schema);
      await client.$executeRaw`CREATE TABLE "SystemSetting" ("key" TEXT PRIMARY KEY, "value" JSONB NOT NULL)`;
      await client.$executeRaw`CREATE TABLE "Notification" ("id" TEXT PRIMARY KEY, "createdAt" TIMESTAMP(3) NOT NULL, "expiresAt" TIMESTAMP(3))`;
    });
    beforeEach(async () => {
      await client.$executeRaw`DELETE FROM "SystemSetting"`;
      await client.$executeRaw`DELETE FROM "Notification"`;
      await client.$executeRaw`
      INSERT INTO "Notification" ("id", "createdAt", "expiresAt") VALUES
        ('retained', ${new Date(now.getTime() - 200 * 86_400_000)}, NULL),
        ('old', ${new Date(now.getTime() - 800 * 86_400_000)}, NULL),
        ('expired', ${new Date(now.getTime() - 86_400_000)}, ${new Date(now.getTime() - 1)})
    `;
    });
    afterAll(async () => {
      await client?.$disconnect();
      if (created && /^retention_test_[a-f0-9]{32}$/.test(schema)) {
        await admin.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
      }
      await admin?.$disconnect();
    });

    it.each([true, false])(
      'reads the committed increase after waiting, existing row: %s',
      async (existing) => {
        if (existing)
          await client.$executeRaw`INSERT INTO "SystemSetting" VALUES ('notifications.retentionDays', '180'::jsonb)`;
        const locked = gate(),
          releaseWriter = gate();
        const writer = client.$transaction(async (tx) => {
          await lockNotificationRetention(tx);
          await tx.$executeRaw`INSERT INTO "SystemSetting" VALUES ('notifications.retentionDays', '365'::jsonb) ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value"`;
          locked.release();
          await releaseWriter.promise;
        }, transactionOptions);
        void writer.catch(() => locked.release());
        await locked.promise;
        let cleanupPid = 0;
        const cleanup = client.$transaction(async (tx) => {
          const pid = await tx.$queryRaw<
            Array<{ pid: number }>
          >`SELECT pg_backend_pid() AS pid`;
          if (!pid[0]) throw new Error('Missing cleanup connection');
          cleanupPid = pid[0].pid;

          return purgeExpiredNotifications(tx, now);
        }, transactionOptions);
        try {
          await expect.poll(() => cleanupPid).not.toBe(0);
          await waitForLock(cleanupPid);
        } finally {
          releaseWriter.release();
          await writer;
          await cleanup;
        }
        await expect(cleanup).resolves.toEqual({ count: 2 });
        expect(await client.$queryRaw`SELECT "id" FROM "Notification"`).toEqual(
          [{ id: 'retained' }],
        );
      },
    );

    it('holds the policy lock until cleanup commits', async () => {
      await client.$executeRaw`INSERT INTO "SystemSetting" VALUES ('notifications.retentionDays', '365'::jsonb)`;
      const cleaned = gate(),
        releaseCleanup = gate();
      const cleanup = client.$transaction(async (tx) => {
        await purgeExpiredNotifications(tx, now);
        cleaned.release();
        await releaseCleanup.promise;
      }, transactionOptions);
      void cleanup.catch(() => cleaned.release());
      await cleaned.promise;
      let writerPid = 0;
      const writer = client.$transaction(async (tx) => {
        const pid = await tx.$queryRaw<
          Array<{ pid: number }>
        >`SELECT pg_backend_pid() AS pid`;
        if (!pid[0]) throw new Error('Missing writer connection');
        writerPid = pid[0].pid;
        await lockNotificationRetention(tx);
        await tx.$executeRaw`UPDATE "SystemSetting" SET "value" = '730'::jsonb WHERE "key" = 'notifications.retentionDays'`;
      }, transactionOptions);
      try {
        await expect.poll(() => writerPid).not.toBe(0);
        await waitForLock(writerPid);
      } finally {
        releaseCleanup.release();
        await cleanup;
        await writer;
      }
      expect(
        await client.$queryRaw`SELECT "value" FROM "SystemSetting"`,
      ).toEqual([{ value: 730 }]);
    });
  },
);
