import { randomUUID } from 'node:crypto';

import { Prisma, PrismaClient, type User } from '@prisma/client';
import { NextRequest } from 'next/server';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { PUT } from '$app/api/systeme/parametres/[key]/route';
import { GET } from '$app/api/systeme/parametres/route';
import { PERMISSIONS } from '$constants/permissions.constants';
import { getSystemSettingDefinition } from '$constants/system-setting-catalog.constants';
import { getSystemSettingValue } from '$server/system-settings';
import { mapUserToUserType } from '$server/user-projection';

const connection = vi.hoisted(() => ({
  client: null as PrismaClient | null,
  session: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('$env', () => ({ env: { NODE_ENV: 'test' } }));
vi.mock('$server/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn() },
}));
vi.mock('$server/prisma', () => ({
  prisma: new Proxy(
    {},
    {
      get: (_target, key): unknown => {
        if (!connection.client)
          throw new Error('Isolated settings database not initialized');
        const value: unknown = Reflect.get(connection.client, key);

        return typeof value === 'function'
          ? value.bind(connection.client)
          : value;
      },
    },
  ),
}));
vi.mock('next/headers', () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock('$server/rate-limiter', () => ({
  reserveAuthenticatedApiRateLimit: vi.fn(async () => ({ allowed: true })),
}));
vi.mock('$server/session', async (importOriginal) => ({
  ...(await importOriginal<typeof import('$server/session')>()),
  getAuthSession: connection.session,
}));

const target = process.env.SETTINGS_TEST_DATABASE_URL;
const settingKey = 'audit.retentionDays';
// One year since 30 October 2026, also the minimum: leaving it never reduces.
const defaultDays = getSystemSettingDefinition(settingKey).defaultValue;
const DAY_MS = 86_400_000;

const gate = (): { open: () => void; promise: Promise<void> } => {
  let open: () => void = () => undefined;
  const promise = new Promise<void>((resolve) => {
    open = resolve;
  });

  return { open, promise };
};

describe.skipIf(!target)(
  'system settings and retention on fully migrated PostgreSQL',
  () => {
    let db: PrismaClient;
    let actor: User;
    const authenticate = async (
      user = actor,
      passwordReauthenticatedAt: Date | null = new Date(),
    ): Promise<void> => {
      const source = await db.session.create({
        data: {
          expiresAt: new Date(Date.now() + 3600_000),
          idleExpiresAt: new Date(Date.now() + 1800_000),
          mfaMethod: 'TOTP',
          mfaVerifiedAt: new Date(),
          passwordReauthenticatedAt,
          securityVersion: user.securityVersion,
          token: randomUUID(),
          userId: user.id,
        },
      });
      connection.session.mockResolvedValue({
        session: source,
        user: mapUserToUserType(user),
      });
    };
    const list = (): ReturnType<typeof GET> =>
      GET(new NextRequest('http://localhost/api/systeme/parametres'));
    const put = (
      value: unknown,
      expectedVersion: number,
      key = settingKey,
      extra = {},
    ): ReturnType<typeof PUT> =>
      PUT(
        new NextRequest('http://localhost/api/systeme/parametres/' + key, {
          body: JSON.stringify({ expectedVersion, value, ...extra }),
          method: 'PUT',
        }),
        { params: Promise.resolve({ key }) },
      );
    const stored = (): ReturnType<
      PrismaClient['systemSetting']['findUnique']
    > => db.systemSetting.findUnique({ where: { key: settingKey } });
    const fixture = (
      value: Prisma.InputJsonValue,
      version = 1,
    ): ReturnType<PrismaClient['systemSetting']['create']> =>
      db.systemSetting.create({ data: { key: settingKey, value, version } });
    const auditCount = (): Promise<number> =>
      db.auditLog.count({
        where: { action: 'SYSTEM_SETTING_UPDATE', userId: actor.id },
      });
    const event = (
      ageDays: number,
    ): ReturnType<PrismaClient['auditLog']['create']> =>
      db.auditLog.create({
        data: {
          action: 'PERSON_UPDATE',
          category: 'PERSON',
          createdAt: new Date(Date.now() - ageDays * DAY_MS),
          description: 'Fictive retention fixture',
          entityId: randomUUID(),
          entityType: 'PERSON',
          stream: 'IDENTITY',
        },
      });
    const purge = async (
      client: Prisma.TransactionClient | PrismaClient,
      expectedDays: number,
    ): Promise<bigint> => {
      const rows = await client.$queryRaw<
        Array<{ count: bigint }>
      >`SELECT public.purge_expired_audit_logs(${expectedDays}::integer) AS count`;

      return rows[0]?.count ?? 0n;
    };
    const auditFailure = async (run: () => Promise<void>): Promise<void> => {
      const name = 'settings_audit_failure_' + randomUUID().replaceAll('-', '');
      if (!/^[a-z0-9]+$/.test(actor.id))
        throw new Error('Unexpected fixture id');
      await db.$executeRawUnsafe(
        `CREATE FUNCTION "${name}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Injected settings audit failure'; END; $$`,
      );
      try {
        await db.$executeRawUnsafe(
          `CREATE TRIGGER "${name}" BEFORE INSERT ON "AuditLog" FOR EACH ROW WHEN (NEW."userId" = '${actor.id}') EXECUTE FUNCTION "${name}"()`,
        );
        await run();
      } finally {
        await db.$executeRawUnsafe(
          `DROP TRIGGER IF EXISTS "${name}" ON "AuditLog"`,
        );
        await db.$executeRawUnsafe(`DROP FUNCTION "${name}"()`);
      }
    };
    const lockSetting = (
      transaction: Prisma.TransactionClient,
    ): Promise<unknown> =>
      transaction.$queryRaw`SELECT pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('system-setting:audit.retentionDays', 0))::text`;
    const waitForAdvisoryWaiter = async (): Promise<void> => {
      const deadline = Date.now() + 2000;
      while (Date.now() < deadline) {
        const locks = await db.$queryRaw<Array<{ count: number }>>`
          SELECT COUNT(*)::integer AS count FROM pg_catalog.pg_locks
          WHERE locktype = 'advisory' AND NOT granted
            AND database = (SELECT oid FROM pg_catalog.pg_database WHERE datname = current_database())
        `;
        if ((locks[0]?.count ?? 0) > 0) return;
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      throw new Error('Expected a PostgreSQL advisory-lock waiter');
    };

    beforeAll(async () => {
      if (!target) throw new Error('Missing isolated settings database');
      const url = new URL(target);
      if (
        !['127.0.0.1', 'localhost'].includes(url.hostname) ||
        url.pathname !== '/settings_service_test'
      )
        throw new Error('A local settings_service_test database is required');
      db = new PrismaClient({ datasourceUrl: target });
      connection.client = db;
      const migrations = await db.$queryRaw<
        Array<{ count: number }>
      >`SELECT COUNT(*)::integer AS count FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;
      expect(migrations[0]?.count).toBeGreaterThanOrEqual(53);
      actor = await db.user.create({
        data: {
          firstName: 'Settings fixture',
          loginName: 'test.' + randomUUID().replaceAll('-', '').slice(0, 20),
          passwordHash: '!fictive',
          role: 'ADMIN',
        },
      });
    });
    beforeEach(async () => {
      // This dedicated database belongs exclusively to this test; no audit rows are reset.
      await db.systemSetting.deleteMany();
      await authenticate();
    });
    afterAll(async () => {
      await db?.$disconnect();
      connection.client = null;
    });

    it.each([0, -1])(
      'rejects stored version %i on insertion and update without changing the valid setting',
      async (version) => {
        const constraintFailure = {
          code: 'P2010',
          meta: {
            code: '23514',
            message: expect.stringContaining('SystemSetting_version_check'),
          },
        };
        await expect(
          db.$executeRaw`
            INSERT INTO "SystemSetting" ("key", "value", "version", "updatedAt")
            VALUES (${settingKey}, '1095'::jsonb, ${version}, CURRENT_TIMESTAMP)
          `,
        ).rejects.toMatchObject(constraintFailure);
        expect(await stored()).toBeNull();

        const valid = await fixture(1095);
        await expect(
          db.$executeRaw`
            UPDATE "SystemSetting" SET "version" = ${version}
            WHERE "key" = ${settingKey}
          `,
        ).rejects.toMatchObject(constraintFailure);
        expect(await stored()).toEqual(valid);
      },
    );

    it('refuses a setting mutation after its source is revoked following authentication', async () => {
      const snapshot = await connection.session();
      await db.session.delete({ where: { id: snapshot.session.id } });
      const beforeAudits = await auditCount();
      expect((await put(1460, 0)).status).toBe(401);
      expect(await stored()).toBeNull();
      expect(await auditCount()).toBe(beforeAudits);
    });

    it('refuses a reduction when its password proof expires while waiting for the retention lock', async () => {
      await fixture(1095);
      const proof = new Date(Date.now() - 30 * 60_000 + 1000);
      await authenticate(actor, proof);
      const beforeAudits = await auditCount();
      const acquired = gate();
      const release = gate();
      const holder = db.$transaction(async (transaction) => {
        await lockSetting(transaction);
        acquired.open();
        await release.promise;
      });
      await acquired.promise;
      const pending = put(365, 1);
      try {
        await waitForAdvisoryWaiter();
        await new Promise((resolve) =>
          setTimeout(
            resolve,
            Math.max(0, proof.getTime() + 30 * 60_000 - Date.now() + 20),
          ),
        );
      } finally {
        release.open();
        await holder;
      }
      const response = await pending;
      expect(response.status).toBe(403);
      expect((await response.json()).error.code).toBe(
        'PASSWORD_REAUTHENTICATION_REQUIRED',
      );
      expect(await stored()).toMatchObject({ value: 1095, version: 1 });
      expect(await auditCount()).toBe(beforeAudits);
    });

    it('rejects anonymous requests and USER grants for role-bound settings', async () => {
      connection.session.mockResolvedValue({ session: null, user: null });
      expect((await list()).status).toBe(401);
      expect((await put(1460, 0)).status).toBe(401);
      await authenticate({
        ...actor,
        permissions: {
          [PERMISSIONS.SETTINGS.VIEW]: true,
          [PERMISSIONS.SETTINGS.UPDATE]: true,
        },
        role: 'USER',
      });
      expect((await list()).status).toBe(403);
      expect((await put(1460, 0)).status).toBe(403);
      expect(await stored()).toBeNull();
    });

    it('returns the reviewed default and ignores retired or unknown stored keys', async () => {
      await db.systemSetting.createMany({
        data: [
          { key: 'notifications.retentionDays', value: 365 },
          { key: 'ui.defaultPageSize', value: 100 },
          { key: 'unknown.key', value: { privateFixture: true } },
        ],
      });
      const response = await list();
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0]).toMatchObject({
        key: settingKey,
        value: defaultDays,
        version: 0,
      });
      for (const key of [
        'notifications.retentionDays',
        'ui.defaultPageSize',
        'unknown.key',
        '__proto__',
      ])
        expect((await put(730, 0, key)).status).toBe(404);
    });

    it('rejects missing versions, malformed bodies and noninteger or out-of-range values', async () => {
      for (const value of [364, 3651, 730.5, '730', null, [], {}])
        expect((await put(value, 0)).status).toBe(400);
      expect(
        (await put(1460, 0, settingKey, { expectedVersion: undefined })).status,
      ).toBe(400);
      expect(
        (await put(1460, 0, settingKey, { unexpected: true })).status,
      ).toBe(400);
      expect(
        (
          await PUT(
            new NextRequest(
              'http://localhost/api/systeme/parametres/' + settingKey,
              { body: '{broken', method: 'PUT' },
            ),
            { params: Promise.resolve({ key: settingKey }) },
          )
        ).status,
      ).toBe(400);
      expect(await stored()).toBeNull();
    });

    it('keeps valid no-ops unchanged and audits actual updates with their versions and actor', async () => {
      const before = await auditCount();
      expect((await put(defaultDays, 0)).status).toBe(200);
      expect(await stored()).toBeNull();
      const created = await put(1460, 0);
      expect(created.status).toBe(200);
      expect((await created.json()).data).toMatchObject({
        key: settingKey,
        value: 1460,
        version: 1,
      });
      const initial = await stored();
      expect((await put(1460, 1)).status).toBe(200);
      expect(await stored()).toEqual(initial);
      expect((await put(1825, 1)).status).toBe(200);
      expect(await stored()).toMatchObject({
        updatedById: actor.id,
        value: 1825,
        version: 2,
      });
      expect((await put(1825, 1)).status).toBe(409);
      expect(await auditCount()).toBe(before + 2);
      const audit = await db.auditLog.findFirst({
        orderBy: { createdAt: 'desc' },
        where: { action: 'SYSTEM_SETTING_UPDATE', userId: actor.id },
      });
      expect(audit?.metadata).toMatchObject({
        after: { value: 1825, version: 2 },
        before: { value: 1460, version: 1 },
        settingKey,
      });
    });

    it('requires only a recent password for reductions, never to leave the one-year default', async () => {
      await authenticate(actor, null);
      expect(defaultDays).toBe(365);
      expect((await put(1460, 0)).status).toBe(200);
      for (const proof of [
        null,
        new Date(Date.now() - 31 * 60_000),
        new Date(Date.now() + 60_000),
      ]) {
        await authenticate(actor, proof);
        expect((await put(730, 1)).status).toBe(403);
      }
      await authenticate();
      expect((await put(730, 1)).status).toBe(200);
      expect(await stored()).toMatchObject({ value: 730, version: 2 });
    });

    it('serializes two initial writes and two later writes without losing a version or duplicating an audit', async () => {
      const before = await auditCount();
      const initial = await Promise.all([put(1460, 0), put(1825, 0)]);
      expect(initial.map((response) => response.status).sort()).toEqual([
        200, 409,
      ]);
      const updates = await Promise.all([put(2190, 1), put(2555, 1)]);
      expect(updates.map((response) => response.status).sort()).toEqual([
        200, 409,
      ]);
      expect(await stored()).toMatchObject({ version: 2 });
      expect(await auditCount()).toBe(before + 2);
    });

    it('rolls back both initial creation and update when the required audit fails', async () => {
      const before = await auditCount();
      await auditFailure(async () => {
        expect((await put(1460, 0)).status).toBe(500);
        expect(await stored()).toBeNull();
        await fixture(1095);
        const initial = await stored();
        expect((await put(1460, 1)).status).toBe(500);
        expect(await stored()).toEqual(initial);
        expect(await auditCount()).toBe(before);
      });
    });

    it('reports invalid storage without presenting the fallback as effective retention', async () => {
      await fixture({ unexpected: 'fictive-invalid-storage' });
      const old = await event(1500);
      const response = await list();
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(await getSystemSettingValue(settingKey)).toBe(defaultDays);
      await expect(purge(db, defaultDays)).rejects.toThrow(
        'Stored audit retention is invalid',
      );
      expect(
        await db.auditLog.findUnique({ where: { id: old.id } }),
      ).not.toBeNull();
      expect(body.data[0]).toMatchObject({
        isStoredValueInvalid: true,
        value: defaultDays,
        version: 1,
      });
      expect(JSON.stringify(body)).not.toContain('fictive-invalid-storage');
    });

    it('requires a recent password to repair invalid storage even when restoring the proposed default', async () => {
      await fixture('invalid');
      await authenticate(actor, null);
      expect((await put(defaultDays, 1)).status).toBe(403);
      await authenticate();
      const before = await auditCount();
      const response = await put(defaultDays, 1);
      expect(response.status).toBe(200);
      expect((await response.json()).data).toMatchObject({
        isStoredValueInvalid: false,
        value: defaultDays,
        version: 2,
      });
      expect(await stored()).toMatchObject({ value: defaultDays, version: 2 });
      expect(await auditCount()).toBe(before + 1);
    });

    it('refuses stale expected retention and malformed stored durations without deleting audits', async () => {
      const old = await event(4000);
      await fixture(1460);
      await expect(purge(db, 1095)).rejects.toThrow('Audit retention changed');
      expect(
        await db.auditLog.findUnique({ where: { id: old.id } }),
      ).not.toBeNull();
      for (const value of ['365', 364, 3651, 365.5, {}]) {
        await db.systemSetting.update({
          data: { value },
          where: { key: settingKey },
        });
        await expect(purge(db, 1095)).rejects.toThrow();
        expect(
          await db.auditLog.findUnique({ where: { id: old.id } }),
        ).not.toBeNull();
      }
    });

    it('purges only older events, cascades plain/encrypted field changes and restores its SQL guard context', async () => {
      await fixture(365);
      const keyVersion = await db.auditEncryptionKeyVersion.findUnique({
        where: { version: 1 },
      });
      if (!keyVersion)
        await db.auditEncryptionKeyVersion.create({ data: { version: 1 } });
      await db.$transaction(async (transaction) => {
        const times = await transaction.$queryRaw<
          Array<{ now: Date }>
        >`SELECT CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AS now`;
        const now = times[0]?.now;
        if (!now) throw new Error('Missing database clock');
        // timestamp(3) rows bracket the cutoff by one second; no claim of
        // equality with PostgreSQL's finer transaction-clock precision.
        const cutoff = now.getTime() - 365 * DAY_MS;
        const old = await transaction.auditLog.create({
          data: {
            action: 'PERSON_UPDATE',
            category: 'PERSON',
            createdAt: new Date(cutoff - 1000),
            description: 'Old fictive audit',
            entityId: randomUUID(),
            entityType: 'PERSON',
            stream: 'IDENTITY',
          },
        });
        const fresh = await transaction.auditLog.create({
          data: {
            action: 'LOGIN_SUCCESS',
            category: 'AUTH',
            createdAt: new Date(cutoff + 1000),
            description: 'Retained fictive audit',
          },
        });
        const common = {
          auditLogId: old.id,
          changeType: 'UPDATE' as const,
          createdAt: old.createdAt,
          entityId: old.entityId ?? '',
          entityType: 'PERSON',
          sectionKey: 'identity',
        };
        await transaction.auditFieldChange.createMany({
          data: [
            {
              ...common,
              afterValue: 'New fictive name',
              beforeValue: 'Old fictive name',
              fieldKey: 'firstName',
              valueMode: 'PLAIN',
            },
            {
              ...common,
              fieldKey: 'contact',
              valueKeyVersion: 1,
              valueMode: 'ENCRYPTED',
              valuesAuthTag: Buffer.alloc(16, 1),
              valuesCiphertext: Buffer.alloc(20, 2),
              valuesIv: Buffer.alloc(12, 3),
            },
          ],
        });
        await transaction.$queryRaw`SELECT set_config('app.audit_delete_context', 'fictive-previous-context', true)`;
        expect(await purge(transaction, 365)).toBeGreaterThanOrEqual(1n);
        expect(
          await transaction.auditLog.findUnique({ where: { id: old.id } }),
        ).toBeNull();
        expect(
          await transaction.auditLog.findUnique({ where: { id: fresh.id } }),
        ).not.toBeNull();
        expect(
          await transaction.auditFieldChange.count({
            where: { auditLogId: old.id },
          }),
        ).toBe(0);
        const context = await transaction.$queryRaw<
          Array<{ value: string }>
        >`SELECT current_setting('app.audit_delete_context', true) AS value`;
        expect(context[0]?.value).toBe('fictive-previous-context');
      });
      const current = await event(0);
      await expect(
        db.auditLog.delete({ where: { id: current.id } }),
      ).rejects.toThrow('retention procedure');
      expect(
        await db.auditLog.findUnique({ where: { id: current.id } }),
      ).not.toBeNull();
    });

    it('rolls back a completed purge and its cascades if a later operation in the same transaction fails', async () => {
      await fixture(365);
      const old = await event(400);
      const child = await db.auditFieldChange.create({
        data: {
          afterValue: 'Fictive value',
          auditLogId: old.id,
          changeType: 'UPDATE',
          createdAt: old.createdAt,
          entityId: old.entityId ?? '',
          entityType: 'PERSON',
          fieldKey: 'firstName',
          sectionKey: 'identity',
          valueMode: 'PLAIN',
        },
      });
      await expect(
        db.$transaction(async (transaction) => {
          await purge(transaction, 365);
          expect(
            await transaction.auditLog.findUnique({ where: { id: old.id } }),
          ).toBeNull();
          throw new Error('Injected later maintenance failure');
        }),
      ).rejects.toThrow('Injected later maintenance failure');
      expect(
        await db.auditLog.findUnique({ where: { id: old.id } }),
      ).not.toBeNull();
      expect(
        await db.auditFieldChange.findUnique({ where: { id: child.id } }),
      ).not.toBeNull();
    });

    it.each([false, true])(
      'waits for a retention increase and refuses its old cutoff, with an existing row: %s',
      async (existing) => {
        // Without a row, the cleanup falls back to the one-year default.
        const expected = 365;
        const next = existing ? 1095 : 1460;
        if (existing) await fixture(expected);
        const old = await event(existing ? 730 : 1200);
        const ready = gate();
        const release = gate();
        const writer = db.$transaction(
          async (transaction) => {
            await lockSetting(transaction);
            if (existing)
              await transaction.systemSetting.update({
                data: { value: next, version: { increment: 1 } },
                where: { key: settingKey },
              });
            else
              await transaction.systemSetting.create({
                data: { key: settingKey, value: next },
              });
            ready.open();
            await release.promise;
          },
          { timeout: 10_000 },
        );
        await ready.promise;
        const cleanupResult = purge(db, expected).then(
          () => ({ error: null }),
          (error: unknown) => ({ error }),
        );
        try {
          await waitForAdvisoryWaiter();
        } finally {
          release.open();
          await writer;
        }
        const result = await cleanupResult;
        expect(String(result.error)).toContain('Audit retention changed');
        expect(
          await db.auditLog.findUnique({ where: { id: old.id } }),
        ).not.toBeNull();
        expect(await stored()).toMatchObject({ value: next });
      },
    );

    it('makes a setting change wait for an in-flight purge before saving its new version', async () => {
      await fixture(365);
      const old = await event(400);
      const ready = gate();
      const release = gate();
      const cleanup = db.$transaction(
        async (transaction) => {
          await purge(transaction, 365);
          ready.open();
          await release.promise;
        },
        { timeout: 10_000 },
      );
      await ready.promise;
      const mutation = put(1095, 1);
      try {
        await waitForAdvisoryWaiter();
        expect((await stored())?.value).toBe(365);
      } finally {
        release.open();
        await cleanup;
      }
      expect((await mutation).status).toBe(200);
      expect(await stored()).toMatchObject({ value: 1095, version: 2 });
      expect(
        await db.auditLog.findUnique({ where: { id: old.id } }),
      ).toBeNull();
    });

    it('executes the actual maintenance script with its bound SQL parameter and preserves current fixtures', async () => {
      await fixture(365);
      const old = await event(400);
      const fresh = await event(0);
      const expiredAt = new Date(Date.now() - DAY_MS);
      const futureAt = new Date(Date.now() + DAY_MS);
      const expiredSession = await db.session.create({
        data: {
          expiresAt: expiredAt,
          idleExpiresAt: expiredAt,
          mfaMethod: 'TOTP',
          mfaVerifiedAt: expiredAt,
          securityVersion: actor.securityVersion,
          token: randomUUID(),
          userId: actor.id,
        },
      });
      const currentSession = await db.session.create({
        data: {
          expiresAt: futureAt,
          idleExpiresAt: futureAt,
          mfaMethod: 'TOTP',
          mfaVerifiedAt: new Date(),
          securityVersion: actor.securityVersion,
          token: randomUUID(),
          userId: actor.id,
        },
      });
      const expiredLimit = await db.rateLimit.create({
        data: { blockedUntil: expiredAt, key: 'expired.' + randomUUID() },
      });
      const currentLimit = await db.rateLimit.create({
        data: { blockedUntil: futureAt, key: 'current.' + randomUUID() },
      });
      await db.mfaLoginChallenge.create({
        data: {
          expiresAt: expiredAt,
          purpose: 'SETUP',
          securityVersion: actor.securityVersion,
          tokenHash: randomUUID().replaceAll('-', '').repeat(2),
          userId: actor.id,
        },
      });
      await db.totpEnrollment.create({
        data: {
          expiresAt: expiredAt,
          secretAuthTag: 'fictive-tag',
          secretCiphertext: 'fictive-ciphertext',
          secretIv: 'fictive-iv',
          userId: actor.id,
        },
      });
      const output = vi
        .spyOn(console, 'info')
        .mockImplementation(() => undefined);
      try {
        // Execute the shipped script, not a copied query: the bound number must
        // resolve the PostgreSQL function taking INTEGER, not Prisma's INT8.
        await import('../../scripts/run-maintenance');
        expect(output).toHaveBeenCalledWith('Maintenance completed', {
          auditLogs: expect.any(Number),
          loginChallenges: expect.any(Number),
          rateLimits: expect.any(Number),
          sessions: expect.any(Number),
          totpEnrollments: expect.any(Number),
        });
      } finally {
        output.mockRestore();
      }
      expect(
        await db.auditLog.findUnique({ where: { id: old.id } }),
      ).toBeNull();
      expect(
        await db.auditLog.findUnique({ where: { id: fresh.id } }),
      ).not.toBeNull();
      expect(
        await db.session.findUnique({ where: { id: expiredSession.id } }),
      ).toBeNull();
      expect(
        await db.session.findUnique({ where: { id: currentSession.id } }),
      ).not.toBeNull();
      expect(
        await db.rateLimit.findUnique({ where: { id: expiredLimit.id } }),
      ).toBeNull();
      expect(
        await db.rateLimit.findUnique({ where: { id: currentLimit.id } }),
      ).not.toBeNull();
      expect(
        await db.mfaLoginChallenge.findUnique({ where: { userId: actor.id } }),
      ).toBeNull();
      expect(
        await db.totpEnrollment.findUnique({ where: { userId: actor.id } }),
      ).toBeNull();
    });
  },
);
