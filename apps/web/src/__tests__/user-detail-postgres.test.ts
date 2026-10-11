import { randomUUID } from 'node:crypto';

import { type Prisma, PrismaClient, type User } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { POST as resetPassword } from '$app/api/users/[id]/reset-password/route';
import { DELETE, PATCH } from '$app/api/users/[id]/route';
import {
  DELETE as revokeSessions,
  GET as getSessions,
} from '$app/api/users/[id]/sessions/route';
import { PERMISSIONS } from '$constants/permissions.constants';

const connection = vi.hoisted(() => ({
  client: null as PrismaClient | null,
  session: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('$env', () => ({ env: { NODE_ENV: 'test' } }));
vi.mock('$server/logger', () => ({ logger: { error: vi.fn() } }));
vi.mock('$server/prisma', () => ({
  prisma: new Proxy(
    {},
    {
      get: (_target, key): unknown => {
        if (!connection.client)
          throw new Error('Isolated database not initialized');
        const value: unknown = Reflect.get(connection.client, key);

        return typeof value === 'function'
          ? value.bind(connection.client)
          : value;
      },
    },
  ),
}));
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
  headers: vi.fn(async () => new Headers()),
}));
vi.mock('$server/rate-limiter', () => ({
  reserveAuthenticatedApiRateLimit: vi.fn(async () => ({ allowed: true })),
}));
vi.mock('$server/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('$server/auth')>()),
  getAuthSession: connection.session,
}));

const target = process.env.USER_DETAIL_TEST_DATABASE_URL;
describe.skipIf(!target)(
  'user detail mutations on fully migrated PostgreSQL',
  () => {
    let db: PrismaClient;
    let actor: User;
    const login = (): string =>
      'test.' + randomUUID().replaceAll('-', '').slice(0, 20);
    const account = async (
      overrides: Partial<Prisma.UserCreateInput> = {},
    ): Promise<User> => {
      const user = await db.user.create({
        data: {
          firstName: 'Fictif',
          lastName: 'Initial',
          loginName: login(),
          passwordHash: '!fictive-original-hash',
          securityVersion: 2,
          ...overrides,
        },
      });
      await db.loginNameReservation.create({
        data: { loginName: user.loginName, userId: user.id },
      });

      return user;
    };
    const params = (id: string): { params: Promise<{ id: string }> } => ({
      params: Promise.resolve({ id }),
    });
    const patch = (
      user: User,
      data: Record<string, unknown>,
    ): ReturnType<typeof PATCH> =>
      PATCH(
        new NextRequest(`http://localhost/api/users/${user.id}`, {
          body: JSON.stringify({
            expectedUpdatedAt: user.updatedAt.toISOString(),
            ...data,
          }),
          method: 'PATCH',
        }),
        params(user.id),
      );
    const session = (
      user: User,
      overrides = {},
    ): ReturnType<PrismaClient['session']['create']> =>
      db.session.create({
        data: {
          expiresAt: new Date(Date.now() + 3600_000),
          idleExpiresAt: new Date(Date.now() + 1800_000),
          mfaMethod: 'TOTP',
          mfaVerifiedAt: new Date(),
          securityVersion: user.securityVersion,
          token: randomUUID(),
          userId: user.id,
          ...overrides,
        },
      });
    const auditCount = (
      userId: string,
    ): ReturnType<PrismaClient['auditLog']['count']> =>
      db.auditLog.count({ where: { targetUserId: userId } });
    const auditFailure = async (
      user: User,
      run: () => Promise<void>,
    ): Promise<void> => {
      const name = 'detail_audit_failure_' + randomUUID().replaceAll('-', '');
      // Only generated internal identifiers and a database-generated cuid enter this DDL.
      if (!/^[a-z0-9]+$/.test(user.id))
        throw new Error('Unexpected fixture identifier');
      await db.$executeRawUnsafe(
        `CREATE FUNCTION "${name}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Audit failure injected by detail test'; END; $$`,
      );
      try {
        await db.$executeRawUnsafe(
          `CREATE TRIGGER "${name}" BEFORE INSERT ON "AuditLog" FOR EACH ROW WHEN (NEW."targetUserId" = '${user.id}') EXECUTE FUNCTION "${name}"()`,
        );
        await run();
      } finally {
        await db.$executeRawUnsafe(
          `DROP TRIGGER IF EXISTS "${name}" ON "AuditLog"`,
        );
        await db.$executeRawUnsafe(`DROP FUNCTION "${name}"()`);
      }
    };

    beforeAll(async () => {
      if (!target) throw new Error('Missing isolated detail database');
      const url = new URL(target);
      if (
        !['localhost', '127.0.0.1'].includes(url.hostname) ||
        url.pathname !== '/user_detail_service_test'
      )
        throw new Error(
          'A local user_detail_service_test database is required',
        );
      db = new PrismaClient({ datasourceUrl: target });
      connection.client = db;
      const migrationCount = await db.$queryRaw<
        Array<{ count: number }>
      >`SELECT COUNT(*)::integer AS count FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;
      expect(migrationCount[0]?.count).toBeGreaterThanOrEqual(52);
      actor = await account({ role: 'ADMIN' });
      // Session source is simulated; authorization/proof logic and all database writes are real.
      connection.session.mockResolvedValue({
        session: {
          criticalMfaVerifiedAt: new Date(),
          passwordReauthenticatedAt: new Date(),
        },
        user: { ...actor, isProtected: true },
      });
    });
    afterAll(async () => {
      await db?.$disconnect();
      connection.client = null;
    });

    it('clears an optional last name, preserves the first name and audits the empty value', async () => {
      const user = await account();
      await session(user);
      const response = await patch(user, { lastName: '   ' });
      expect(response.status).toBe(200);
      expect((await response.json()).data.user).toMatchObject({
        firstName: 'Fictif',
        lastName: '',
      });
      expect(
        await db.user.findUnique({ where: { id: user.id } }),
      ).toMatchObject({
        firstName: 'Fictif',
        lastName: '',
        securityVersion: 2,
      });
      expect(await db.session.count({ where: { userId: user.id } })).toBe(1);
      const logs = await db.auditLog.findMany({
        where: { targetUserId: user.id },
      });
      expect(logs).toHaveLength(1);
      expect(logs[0]?.metadata).toMatchObject({
        after: { lastName: '' },
        before: { lastName: 'Initial' },
      });
    });

    it.each([{ firstName: 'Modified' }, { lastName: '' }, { isActive: false }])(
      'requires a client revision for %j',
      async (data) => {
        const user = await account();
        const response = await patch(user, {
          ...data,
          expectedUpdatedAt: undefined,
        });
        expect(response.status).toBe(400);
        expect(
          (await response.json()).error.details.expectedUpdatedAt,
        ).toHaveLength(1);
        expect(await auditCount(user.id)).toBe(0);
      },
    );

    it('commits only one of two edits based on the same revision', async () => {
      const user = await account();
      const results = await Promise.all([
        patch(user, { firstName: 'First' }),
        patch(user, { firstName: 'Second' }),
      ]);
      expect(results.map((response) => response.status).sort()).toEqual([
        200, 409,
      ]);
      expect(await auditCount(user.id)).toBe(1);
      expect((await patch(user, { lastName: 'Stale' })).status).toBe(409);
      expect(
        (await db.user.findUnique({ where: { id: user.id } }))?.lastName,
      ).toBe('Initial');
    });

    it('rolls back a rename, reservation and session revocation when auditing fails, then permits retry', async () => {
      const user = await account();
      const nextLogin = login();
      await session(user);
      await auditFailure(user, async () => {
        expect((await patch(user, { loginName: nextLogin })).status).toBe(500);
        expect(
          await db.user.findUnique({ where: { id: user.id } }),
        ).toMatchObject({ loginName: user.loginName, securityVersion: 2 });
        expect(
          await db.loginNameReservation.findUnique({
            where: { loginName: nextLogin },
          }),
        ).toBeNull();
        expect(await db.session.count({ where: { userId: user.id } })).toBe(1);
        expect(await auditCount(user.id)).toBe(0);
      });
      expect((await patch(user, { loginName: nextLogin })).status).toBe(200);
      expect(await db.session.count({ where: { userId: user.id } })).toBe(0);
      expect(
        await db.loginNameReservation.count({ where: { userId: user.id } }),
      ).toBe(2);
      expect(await auditCount(user.id)).toBe(1);
    });

    it('refuses a login still reserved by a renamed identity without altering either account', async () => {
      const owner = await account();
      const user = await account();
      const newLogin = login();
      expect((await patch(owner, { loginName: newLogin })).status).toBe(200);
      expect((await patch(user, { loginName: owner.loginName })).status).toBe(
        409,
      );
      expect(
        await db.user.findUnique({ where: { id: user.id } }),
      ).toMatchObject({ loginName: user.loginName });
      expect(await auditCount(user.id)).toBe(0);
    });

    it('clears contact verification while retaining sessions', async () => {
      const user = await account({
        contactEmail: 'old@example.test',
        contactEmailVerifiedAt: new Date(),
      });
      await session(user);
      expect((await patch(user, { contactEmail: '' })).status).toBe(200);
      expect(
        await db.user.findUnique({ where: { id: user.id } }),
      ).toMatchObject({
        contactEmail: null,
        contactEmailVerifiedAt: null,
        securityVersion: 2,
      });
      expect(await db.session.count({ where: { userId: user.id } })).toBe(1);
    });

    it('preserves sessions for personal policy changes and revokes them for access changes', async () => {
      const user = await account();
      await session(user);
      expect(
        (
          await patch(user, {
            permissions: { [PERMISSIONS.ACCOUNT.UPDATE_PROFILE]: false },
            permissionScope: 'account',
          })
        ).status,
      ).toBe(200);
      expect(await db.session.count({ where: { userId: user.id } })).toBe(1);
      const current = await db.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      expect(
        (
          await patch(current, {
            permissions: { [PERMISSIONS.USERS.VIEW]: true },
            permissionScope: 'access',
          })
        ).status,
      ).toBe(200);
      expect(await db.session.count({ where: { userId: user.id } })).toBe(0);
      expect(await auditCount(user.id)).toBe(2);
    });

    it('returns a verifiable reset secret after atomic hash, lock, session and audit updates', async () => {
      const user = await account({
        failedLoginAttempts: 5,
        lockedUntil: new Date(Date.now() + 3600_000),
      });
      await session(user);
      const response = await resetPassword(
        new NextRequest(
          `http://localhost/api/users/${user.id}/reset-password`,
          { method: 'POST' },
        ),
        params(user.id),
      );
      expect(response.status).toBe(200);
      const password: string = (await response.json()).data.temporaryPassword;
      const current = await db.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      expect(current).toMatchObject({
        failedLoginAttempts: 0,
        lockedUntil: null,
        mustChangePassword: true,
        passwordChangedAt: null,
        securityVersion: 3,
      });
      expect(await bcrypt.compare(password, current.passwordHash)).toBe(true);
      expect(await db.session.count({ where: { userId: user.id } })).toBe(0);
      const logs = await db.auditLog.findMany({
        where: { targetUserId: user.id },
      });
      expect(logs).toHaveLength(1);
      expect(JSON.stringify(logs)).not.toContain(password);
      expect(JSON.stringify(logs)).not.toContain(current.passwordHash);
    });

    it('rolls back a password reset when its audit cannot be persisted', async () => {
      const user = await account();
      await session(user);
      await auditFailure(user, async () => {
        const response = await resetPassword(
          new NextRequest(
            `http://localhost/api/users/${user.id}/reset-password`,
            { method: 'POST' },
          ),
          params(user.id),
        );
        expect(response.status).toBe(500);
        expect(await response.json()).not.toHaveProperty('data');
        expect(
          await db.user.findUnique({ where: { id: user.id } }),
        ).toMatchObject({
          mustChangePassword: false,
          passwordHash: user.passwordHash,
          securityVersion: 2,
        });
        expect(await db.session.count({ where: { userId: user.id } })).toBe(1);
        expect(await auditCount(user.id)).toBe(0);
      });
    });

    it('lists only unexpired sessions matching the current security version', async () => {
      const user = await account();
      const current = await session(user);
      await session(user, { securityVersion: 1 });
      await session(user, { idleExpiresAt: new Date(Date.now() - 60_000) });
      const response = await getSessions(
        new NextRequest(`http://localhost/api/users/${user.id}/sessions`),
        params(user.id),
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.sessions.map((item: { id: string }) => item.id)).toEqual(
        [current.id],
      );
      expect(JSON.stringify(body)).not.toContain(current.token);
      expect(await db.session.count({ where: { userId: user.id } })).toBe(1);
    });

    it('revokes a single owned session then all others, never a session belonging to another account', async () => {
      const user = await account();
      const other = await account();
      const one = await session(user);
      await session(user);
      const foreign = await session(other);
      const request = (sessionId?: string): NextRequest =>
        new NextRequest(
          `http://localhost/api/users/${user.id}/sessions${sessionId ? '?id=' + sessionId : ''}`,
          { method: 'DELETE' },
        );
      expect(
        (await revokeSessions(request(foreign.id), params(user.id))).status,
      ).toBe(404);
      expect(
        (await revokeSessions(request(one.id), params(user.id))).status,
      ).toBe(200);
      expect(await db.session.count({ where: { userId: user.id } })).toBe(1);
      expect((await revokeSessions(request(), params(user.id))).status).toBe(
        200,
      );
      expect(await db.session.count({ where: { userId: user.id } })).toBe(0);
      expect(await db.session.count({ where: { userId: other.id } })).toBe(1);
      expect(
        (await db.user.findUnique({ where: { id: user.id } }))?.securityVersion,
      ).toBe(3);
      expect(await auditCount(user.id)).toBe(2);
    });

    it('rolls back global session revocation and security version on audit failure', async () => {
      const user = await account();
      await session(user);
      await auditFailure(user, async () => {
        expect(
          (
            await revokeSessions(
              new NextRequest(
                `http://localhost/api/users/${user.id}/sessions`,
                { method: 'DELETE' },
              ),
              params(user.id),
            )
          ).status,
        ).toBe(500);
        expect(await db.session.count({ where: { userId: user.id } })).toBe(1);
        expect(
          (await db.user.findUnique({ where: { id: user.id } }))
            ?.securityVersion,
        ).toBe(2);
        expect(await auditCount(user.id)).toBe(0);
      });
    });

    it('requires deactivation before permanent anonymization and keeps the reserved login', async () => {
      const user = await account();
      await session(user);
      const request = (): NextRequest =>
        new NextRequest(`http://localhost/api/users/${user.id}`, {
          method: 'DELETE',
        });
      expect((await DELETE(request(), params(user.id))).status).toBe(409);
      expect((await patch(user, { isActive: false })).status).toBe(200);
      expect((await DELETE(request(), params(user.id))).status).toBe(200);
      const current = await db.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      expect(current).toMatchObject({
        firstName: 'Compte',
        isActive: false,
        lastName: 'supprimé',
      });
      expect(current.deletedAt).not.toBeNull();
      expect(
        await db.loginNameReservation.findUnique({
          where: { loginName: user.loginName },
        }),
      ).toMatchObject({ userId: user.id });
      expect(await db.session.count({ where: { userId: user.id } })).toBe(0);
      expect(await auditCount(user.id)).toBe(2);
    });
  },
);
