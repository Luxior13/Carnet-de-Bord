import { randomUUID } from 'node:crypto';

import {
  type Prisma,
  PrismaClient,
  type Session,
  type User,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';
import { generate } from 'otplib';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { POST as changePassword } from '$app/api/auth/change-password/route';
import { PATCH as updateContact } from '$app/api/auth/contact-email/route';
import { GET as getMe, PATCH as updateProfile } from '$app/api/auth/me/route';
import { DELETE as cancelMfaSetup } from '$app/api/auth/mfa/challenge/route';
import { POST as regenerateCodes } from '$app/api/auth/mfa/recovery-codes/route';
import {
  POST as startMfaSetup,
  PUT as confirmMfaSetup,
} from '$app/api/auth/mfa/setup/route';
import {
  DELETE as revokeSessions,
  GET as getSessions,
} from '$app/api/auth/sessions/route';
import { PERMISSIONS } from '$constants/permissions.constants';
import { mapUserToUserType } from '$server/auth';
import {
  decryptTotpSecret,
  encryptTotpSecret,
  findMatchingRecoveryCode,
  type GeneratedRecoveryCode,
  generateRecoveryCodes,
  generateTotpSecret,
  MFA_CHALLENGE_COOKIE_NAME,
} from '$server/mfa';

const connection = vi.hoisted(() => ({
  client: null as PrismaClient | null,
  cookies: new Map<string, string>(),
  session: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('$env', () => ({
  env: {
    MFA_ENCRYPTION_KEY_V1: Buffer.alloc(32, 7).toString('base64'),
    NODE_ENV: 'test',
  },
}));
vi.mock('$server/logger', () => ({ logger: { error: vi.fn() } }));
vi.mock('$server/prisma', () => ({
  prisma: new Proxy(
    {},
    {
      get: (_target, key): unknown => {
        if (!connection.client)
          throw new Error('Isolated account database not initialized');
        const value: unknown = Reflect.get(connection.client, key);

        return typeof value === 'function'
          ? value.bind(connection.client)
          : value;
      },
    },
  ),
}));
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    delete: (name: string): void => {
      connection.cookies.delete(name);
    },
    get: (name: string): { value: string } | undefined => {
      const value = connection.cookies.get(name);

      return value === undefined ? undefined : { value };
    },
    set: (name: string, value: string): void => {
      connection.cookies.set(name, value);
    },
  })),
  headers: vi.fn(async () => new Headers()),
}));
vi.mock('$server/rate-limiter', () => ({
  createMfaRateLimitKeys: vi.fn(() => ({
    account: 'test-account',
    challenge: 'test-challenge',
  })),
  recordLoginAttempt: vi.fn(async () => undefined),
  reserveAuthenticatedApiRateLimit: vi.fn(async () => ({ allowed: true })),
  reserveMfaRateLimits: vi.fn(async () => ({ allowed: true })),
  reserveSensitiveActionRateLimit: vi.fn(async () => ({ allowed: true })),
}));
vi.mock('$server/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('$server/auth')>()),
  getAuthSession: connection.session,
}));

const target = process.env.ACCOUNT_TEST_DATABASE_URL;
describe.skipIf(!target)(
  'personal account on fully migrated PostgreSQL',
  () => {
    let db: PrismaClient;
    let passwordHash: string;
    const password = 'FictiveCurrent1!';
    const nextPassword = 'FictiveReplacement2!';
    const account = (
      overrides: Partial<Prisma.UserCreateInput> = {},
    ): Promise<User> =>
      db.user.create({
        data: {
          contactEmail: 'initial@example.test',
          firstName: 'Fictif',
          lastName: 'Initial',
          loginName: 'test.' + randomUUID().replaceAll('-', '').slice(0, 20),
          passwordHash,
          securityVersion: 2,
          ...overrides,
        },
      });
    const session = (
      user: User,
      overrides: Partial<Prisma.SessionUncheckedCreateInput> = {},
    ): Promise<Session> =>
      db.session.create({
        data: {
          criticalMfaVerifiedAt: new Date(),
          expiresAt: new Date(Date.now() + 3600_000),
          idleExpiresAt: new Date(Date.now() + 1800_000),
          mfaMethod: 'TOTP',
          mfaVerifiedAt: new Date(),
          passwordReauthenticatedAt: new Date(),
          securityVersion: user.securityVersion,
          token: randomUUID(),
          userId: user.id,
          ...overrides,
        },
      });
    const signIn = async (user: User): Promise<Session> => {
      const current = await session(user);
      connection.session.mockResolvedValue({
        session: current,
        user: mapUserToUserType(user),
      });

      return current;
    };
    const mfaAccount = async (): Promise<{
      codes: GeneratedRecoveryCode[];
      secret: string;
      user: User;
    }> => {
      const user = await account({ mfaEnabledAt: new Date() });
      const secret = generateTotpSecret();
      await db.totpCredential.create({
        data: { ...encryptTotpSecret(secret, user.id), userId: user.id },
      });
      const codes = generateRecoveryCodes(user.id);
      await db.mfaRecoveryCode.createMany({
        data: codes.map(({ codeHash, salt }) => ({
          codeHash,
          salt,
          userId: user.id,
        })),
      });

      return { codes, secret, user };
    };
    const totp = (secret: string): Promise<string> =>
      generate({ algorithm: 'sha1', digits: 6, period: 30, secret });
    const mfaRequest = (
      path: string,
      body: Record<string, unknown>,
      method = 'POST',
    ): NextRequest =>
      new NextRequest('http://localhost/api/auth/mfa/' + path, {
        body: JSON.stringify(body),
        method,
      });
    const request = (
      path: string,
      body: Record<string, unknown>,
      method = 'PATCH',
    ): Request =>
      new Request('http://localhost/api/auth/' + path, {
        body: JSON.stringify(body),
        method,
      });
    const contact = (
      user: User,
      contactEmail: string | null,
      extra = {},
    ): ReturnType<typeof updateContact> =>
      updateContact(
        request('contact-email', {
          contactEmail,
          currentPassword: password,
          expectedUpdatedAt: user.updatedAt.toISOString(),
          ...extra,
        }),
      );
    const profile = (
      user: User,
      firstName: string,
    ): ReturnType<typeof updateProfile> =>
      updateProfile(
        request('me', {
          expectedUpdatedAt: user.updatedAt.toISOString(),
          firstName,
          lastName: '',
        }),
      );
    const change = (
      currentPassword: string | undefined = password,
    ): ReturnType<typeof changePassword> =>
      changePassword(
        request(
          'change-password',
          {
            confirmPassword: nextPassword,
            currentPassword,
            newPassword: nextPassword,
          },
          'POST',
        ),
      );
    const revoke = (id?: string): ReturnType<typeof revokeSessions> =>
      revokeSessions(
        new Request(
          'http://localhost/api/auth/sessions' + (id ? '?id=' + id : ''),
          { method: 'DELETE' },
        ),
      );
    const auditCount = (user: User): Promise<number> =>
      db.auditLog.count({ where: { targetUserId: user.id } });
    const auditFailure = async (
      user: User,
      run: () => Promise<void>,
    ): Promise<void> => {
      const name = 'account_audit_failure_' + randomUUID().replaceAll('-', '');
      if (!/^[a-z0-9]+$/.test(user.id))
        throw new Error('Unexpected fixture identifier');
      // Only generated identifiers and a database-generated cuid enter this temporary DDL.
      await db.$executeRawUnsafe(
        `CREATE FUNCTION "${name}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Audit failure injected by account test'; END; $$`,
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
      if (!target) throw new Error('Missing isolated account database');
      const url = new URL(target);
      if (
        !['localhost', '127.0.0.1'].includes(url.hostname) ||
        url.pathname !== '/account_service_test'
      )
        throw new Error('A local account_service_test database is required');
      db = new PrismaClient({ datasourceUrl: target });
      connection.client = db;
      const migrations = await db.$queryRaw<
        Array<{ count: number }>
      >`SELECT COUNT(*)::integer AS count FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;
      expect(migrations[0]?.count).toBeGreaterThanOrEqual(52);
      passwordHash = await bcrypt.hash(password, 4);
    });
    beforeEach(() => {
      connection.session.mockReset();
      connection.cookies.clear();
    });
    afterAll(async () => {
      await db?.$disconnect();
      connection.client = null;
    });

    it('rejects anonymous reads and mutations', async () => {
      connection.session.mockResolvedValue({ session: null, user: null });
      expect((await getMe()).status).toBe(401);
      expect((await getSessions()).status).toBe(401);
      expect((await change()).status).toBe(401);
      expect((await updateProfile(request('me', {}))).status).toBe(401);
      expect((await updateContact(request('contact-email', {}))).status).toBe(
        401,
      );
      expect((await revoke()).status).toBe(401);
    });

    it('honors profile autonomy while preserving mandatory personal security access despite legacy denies', async () => {
      const user = await account({
        permissions: {
          [PERMISSIONS.ACCOUNT.UPDATE_PROFILE]: false,
          [PERMISSIONS.ACCOUNT.MANAGE_SESSIONS]: false,
          [PERMISSIONS.ACCOUNT.CHANGE_PASSWORD]: false,
        },
      });
      await signIn(user);
      expect((await profile(user, 'Forbidden')).status).toBe(403);
      expect((await getSessions()).status).toBe(200);
      expect((await change()).status).toBe(200);
      expect(
        (await db.user.findUniqueOrThrow({ where: { id: user.id } })).firstName,
      ).toBe(user.firstName);
      expect(await auditCount(user)).toBe(1);
    });

    it('returns only the public personal DTO and session deadlines', async () => {
      const user = await account();
      const current = await signIn(user);
      const response = await getMe();
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.user).toMatchObject({
        contactEmail: user.contactEmail,
        id: user.id,
      });
      expect(body.data.user).not.toHaveProperty('passwordHash');
      expect(body.data.user).not.toHaveProperty('securityVersion');
      expect(Object.keys(body.data.session).sort()).toEqual([
        'expiresAt',
        'idleExpiresAt',
        'lastSeenAt',
        'rememberMe',
      ]);
      expect(JSON.stringify(body)).not.toContain(current.token);
    });

    it('allows the protected root to change its own contact with a password and current revision', async () => {
      const existing = await db.user.findFirst({
        where: { isProtected: true },
      });
      const user = existing
        ? await db.user.update({
            data: { contactEmail: 'initial@example.test', passwordHash },
            where: { id: existing.id },
          })
        : await account({ isProtected: true, role: 'ADMIN' });
      const baselineAuditCount = await auditCount(user);
      await signIn(user);
      expect((await contact(user, 'root-owner@example.test')).status).toBe(200);
      expect(
        await db.user.findUnique({ where: { id: user.id } }),
      ).toMatchObject({
        contactEmail: 'root-owner@example.test',
        isProtected: true,
        role: 'ADMIN',
      });
      expect(await auditCount(user)).toBe(baselineAuditCount + 1);
    });

    it('lists only sessions with valid dates and the current security version', async () => {
      const user = await account();
      const current = await signIn(user);
      await session(user, { securityVersion: 1 });
      await session(user, { expiresAt: new Date(Date.now() - 1000) });
      await session(user, { idleExpiresAt: new Date(Date.now() - 1000) });
      const foreign = await account();
      const foreignSession = await session(foreign, { securityVersion: 1 });
      const response = await getSessions();
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.sessions.map((item: { id: string }) => item.id)).toEqual(
        [current.id],
      );
      expect(body.data.sessions[0].isCurrent).toBe(true);
      expect(JSON.stringify(body)).not.toContain(current.token);
      expect(await db.session.count({ where: { userId: user.id } })).toBe(1);
      expect(
        await db.session.findUnique({ where: { id: foreignSession.id } }),
      ).not.toBeNull();
    });

    it('does not delete or disclose a newer session if the security version advances after authentication', async () => {
      const user = await account();
      await signIn(user);
      const newerUser = await db.user.update({
        data: { securityVersion: { increment: 1 } },
        where: { id: user.id },
      });
      const newer = await session(newerUser);
      const response = await getSessions();
      expect(response.status).toBe(200);
      expect((await response.json()).data.sessions).toEqual([]);
      expect(
        await db.session.findUnique({ where: { id: newer.id } }),
      ).not.toBeNull();
    });

    it('requires a contact revision before password work or mutation', async () => {
      const user = await account();
      await signIn(user);
      expect(
        (
          await contact(user, 'changed@example.test', {
            expectedUpdatedAt: undefined,
          })
        ).status,
      ).toBe(400);
      expect(
        (await db.user.findUniqueOrThrow({ where: { id: user.id } }))
          .contactEmail,
      ).toBe(user.contactEmail);
      expect(await auditCount(user)).toBe(0);
    });

    it('rejects a stale contact dialog including a stale no-op, then accepts explicit reload and removal', async () => {
      const user = await account({ contactEmailVerifiedAt: new Date() });
      const current = await signIn(user);
      expect((await contact(user, '  FIRST@EXAMPLE.TEST  ')).status).toBe(200);
      expect((await contact(user, 'second@example.test')).status).toBe(409);
      expect((await contact(user, 'first@example.test')).status).toBe(409);
      const newerUser = await db.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      expect(newerUser.contactEmail).toBe('first@example.test');
      expect(newerUser.contactEmailVerifiedAt).toBeNull();
      connection.session.mockResolvedValue({
        session: current,
        user: mapUserToUserType(newerUser),
      });
      const response = await contact(newerUser, null);
      expect(response.status).toBe(200);
      expect((await response.json()).data.user.contactEmail).toBeNull();
      expect(await auditCount(user)).toBe(2);
      expect(await db.session.count({ where: { userId: user.id } })).toBe(1);
    });

    it('commits one of two contact changes based on the same revision', async () => {
      const user = await account();
      await signIn(user);
      const responses = await Promise.all([
        contact(user, 'one@example.test'),
        contact(user, 'two@example.test'),
      ]);
      expect(responses.map((response) => response.status).sort()).toEqual([
        200, 409,
      ]);
      expect(await auditCount(user)).toBe(1);
    });

    it('rolls back contact and its verification flag if the required audit fails', async () => {
      const user = await account({ contactEmailVerifiedAt: new Date() });
      await signIn(user);
      await auditFailure(user, async () => {
        expect((await contact(user, 'changed@example.test')).status).toBe(500);
        expect(
          await db.user.findUnique({ where: { id: user.id } }),
        ).toMatchObject({
          contactEmail: user.contactEmail,
          contactEmailVerifiedAt: user.contactEmailVerifiedAt,
          updatedAt: user.updatedAt,
        });
        expect(await auditCount(user)).toBe(0);
      });
    });

    it('clears the optional last name and commits only one concurrent profile update', async () => {
      const user = await account();
      await signIn(user);
      const responses = await Promise.all([
        profile(user, 'Première'),
        profile(user, 'Deuxième'),
      ]);
      expect(responses.map((response) => response.status).sort()).toEqual([
        200, 409,
      ]);
      expect(
        (await db.user.findUniqueOrThrow({ where: { id: user.id } })).lastName,
      ).toBe('');
      expect(await auditCount(user)).toBe(1);
    });

    it('rolls back profile changes when their required audit fails', async () => {
      const user = await account();
      await signIn(user);
      await auditFailure(user, async () => {
        expect((await profile(user, 'Changed')).status).toBe(500);
        expect(
          await db.user.findUnique({ where: { id: user.id } }),
        ).toMatchObject({
          firstName: user.firstName,
          lastName: user.lastName,
          updatedAt: user.updatedAt,
        });
        expect(await auditCount(user)).toBe(0);
      });
    });

    it('rejects a current password exceeding 72 bytes even when bcrypt accepts its prefix', async () => {
      const maximumPassword = 'A'.repeat(70) + '1!';
      const hash = await bcrypt.hash(maximumPassword, 4);
      const user = await account({ passwordHash: hash });
      await signIn(user);
      expect(await bcrypt.compare(maximumPassword + 'extra', hash)).toBe(true);
      expect((await change(maximumPassword + 'extra')).status).toBe(400);
      expect(
        (await db.user.findUniqueOrThrow({ where: { id: user.id } }))
          .passwordHash,
      ).toBe(hash);
      expect(await auditCount(user)).toBe(0);
    });

    it('changes a password, preserves only the current session and clears recent proofs without returning secrets', async () => {
      const user = await account();
      const current = await signIn(user);
      await session(user);
      const response = await change();
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ success: true });
      const updated = await db.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      expect(updated.securityVersion).toBe(3);
      expect(await bcrypt.compare(nextPassword, updated.passwordHash)).toBe(
        true,
      );
      expect(await bcrypt.compare(password, updated.passwordHash)).toBe(false);
      const sessions = await db.session.findMany({
        where: { userId: user.id },
      });
      expect(sessions).toHaveLength(1);
      expect(sessions[0]).toMatchObject({
        criticalMfaVerifiedAt: null,
        id: current.id,
        mfaMethod: 'TOTP',
        passwordReauthenticatedAt: null,
        securityVersion: 3,
      });
      const audit = await db.auditLog.findMany({
        where: { targetUserId: user.id },
      });
      expect(audit).toHaveLength(1);
      expect(JSON.stringify(audit)).not.toContain(nextPassword);
      expect(JSON.stringify(audit)).not.toContain(updated.passwordHash);
    });

    it('allows mandatory password replacement but blocks unrelated personal mutations until it completes', async () => {
      const user = await account({ mustChangePassword: true });
      await signIn(user);
      expect((await getMe()).status).toBe(200);
      expect((await profile(user, 'Other')).status).toBe(403);
      expect((await contact(user, null)).status).toBe(403);
      expect((await getSessions()).status).toBe(403);
      expect(
        (
          await changePassword(
            request(
              'change-password',
              { confirmPassword: nextPassword, newPassword: nextPassword },
              'POST',
            ),
          )
        ).status,
      ).toBe(200);
      expect(
        (await db.user.findUniqueOrThrow({ where: { id: user.id } }))
          .mustChangePassword,
      ).toBe(false);
    });

    it('rolls back password, version, sessions and audit together on audit failure', async () => {
      const user = await account();
      await signIn(user);
      await session(user);
      await auditFailure(user, async () => {
        expect((await change()).status).toBe(500);
        expect(
          await db.user.findUnique({ where: { id: user.id } }),
        ).toMatchObject({
          passwordHash,
          securityVersion: 2,
          updatedAt: user.updatedAt,
        });
        expect(await db.session.count({ where: { userId: user.id } })).toBe(2);
        expect(await auditCount(user)).toBe(0);
      });
    });

    it('refuses password mutation from a session revoked after authentication', async () => {
      const user = await account();
      const current = await signIn(user);
      await db.session.delete({ where: { id: current.id } });
      expect((await change()).status).toBe(401);
      expect(
        await db.user.findUnique({ where: { id: user.id } }),
      ).toMatchObject({ passwordHash, securityVersion: 2 });
      expect(await auditCount(user)).toBe(0);
    });

    it('revokes owned sessions while preserving the current session and another account', async () => {
      const user = await account();
      const current = await signIn(user);
      const one = await session(user);
      await session(user);
      const foreign = await account();
      const foreignSession = await session(foreign);
      expect((await revoke(foreignSession.id)).status).toBe(404);
      expect((await revoke(current.id)).status).toBe(403);
      expect((await revoke(one.id)).status).toBe(200);
      expect((await revoke(one.id)).status).toBe(404);
      expect((await revoke()).status).toBe(200);
      expect(await db.session.count({ where: { userId: user.id } })).toBe(1);
      expect(
        await db.session.findUnique({ where: { id: current.id } }),
      ).not.toBeNull();
      expect(
        await db.session.findUnique({ where: { id: foreignSession.id } }),
      ).not.toBeNull();
      expect(await auditCount(user)).toBe(2);
    });

    it.each(['all', 'one'] as const)(
      'refuses %s session revocation from a security snapshot superseded after authentication',
      async (scope) => {
        const user = await account();
        await signIn(user);
        const rotated = await db.$transaction(async (transaction) => {
          const updated = await transaction.user.update({
            data: { securityVersion: { increment: 1 } },
            where: { id: user.id },
          });
          await transaction.session.deleteMany({ where: { userId: user.id } });

          return updated;
        });
        const replacement = await session(rotated);

        expect(
          (await revoke(scope === 'one' ? replacement.id : undefined)).status,
        ).toBe(401);
        expect(
          await db.session.findUnique({ where: { id: replacement.id } }),
        ).not.toBeNull();
        expect(await auditCount(user)).toBe(0);
      },
    );

    it.each(['all', 'one'] as const)(
      'refuses %s session revocation if the source session disappeared after authentication',
      async (scope) => {
        const user = await account();
        const current = await signIn(user);
        const other = await session(user);
        await db.session.delete({ where: { id: current.id } });

        expect(
          (await revoke(scope === 'one' ? other.id : undefined)).status,
        ).toBe(401);
        expect(
          await db.session.findUnique({ where: { id: other.id } }),
        ).not.toBeNull();
        expect(await auditCount(user)).toBe(0);
      },
    );

    it('returns one success and one not-found when the same session is revoked concurrently', async () => {
      const user = await account();
      await signIn(user);
      const other = await session(user);
      const responses = await Promise.all([revoke(other.id), revoke(other.id)]);
      expect(responses.map((response) => response.status).sort()).toEqual([
        200, 404,
      ]);
      expect(await auditCount(user)).toBe(1);
    });

    it('refuses session revocation if the account is disabled after authentication', async () => {
      const user = await account();
      await signIn(user);
      const other = await session(user);
      await db.user.update({
        data: { isActive: false },
        where: { id: user.id },
      });
      expect((await revoke()).status).toBe(401);
      expect(
        await db.session.findUnique({ where: { id: other.id } }),
      ).not.toBeNull();
      expect(await auditCount(user)).toBe(0);
    });

    it('rechecks the source deadline after waiting for the account row lock', async () => {
      const user = await account();
      const current = await signIn(user);
      const other = await session(user);
      const expiresAt = new Date(Date.now() + 700);
      await db.session.update({
        data: { idleExpiresAt: expiresAt },
        where: { id: current.id },
      });
      let unlock: () => void = () => undefined;
      let acquired: () => void = () => undefined;
      const unlocked = new Promise<void>((resolve) => {
        unlock = resolve;
      });
      const locked = new Promise<void>((resolve) => {
        acquired = resolve;
      });
      const holder = db.$transaction(async (transaction) => {
        await transaction.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${user.id} FOR UPDATE`;
        acquired();
        await unlocked;
      });
      await locked;
      const pending = revoke();
      try {
        const until = Date.now() + 2_000;
        let observedWait = false;
        while (!observedWait && Date.now() < until) {
          const waiting = await db.$queryRaw<Array<{ waiting: boolean }>>`
            SELECT EXISTS (
              SELECT 1 FROM pg_stat_activity
              WHERE datname = current_database() AND wait_event_type = 'Lock'
                AND query LIKE '%FOR NO KEY UPDATE%'
            ) AS waiting
          `;
          observedWait = waiting[0]?.waiting ?? false;
          if (!observedWait)
            await new Promise((resolve) => setTimeout(resolve, 10));
        }
        expect(observedWait).toBe(true);
        const remaining = expiresAt.getTime() - Date.now() + 20;
        if (remaining > 0)
          await new Promise((resolve) => setTimeout(resolve, remaining));
      } finally {
        unlock();
        await holder;
      }
      expect((await pending).status).toBe(401);
      expect(
        await db.session.findUnique({ where: { id: other.id } }),
      ).not.toBeNull();
      expect(await auditCount(user)).toBe(0);
    });

    it('rolls back session revocation if its required audit fails', async () => {
      const user = await account();
      await signIn(user);
      const other = await session(user);
      await auditFailure(user, async () => {
        expect((await revoke(other.id)).status).toBe(500);
        expect((await revoke()).status).toBe(500);
        expect(await db.session.count({ where: { userId: user.id } })).toBe(2);
        expect(await auditCount(user)).toBe(0);
      });
    });

    it('cancels a staged MFA replacement while retaining the active credential, codes and sessions', async () => {
      const { codes, secret, user } = await mfaAccount();
      await signIn(user);
      await session(user);
      const response = await startMfaSetup(
        mfaRequest('setup', {
          currentCode: await totp(secret),
          currentPassword: password,
        }),
      );
      expect(response.status).toBe(200);
      expect((await response.json()).data.replacing).toBe(true);
      expect(
        await db.totpEnrollment.count({ where: { userId: user.id } }),
      ).toBe(1);
      expect((await cancelMfaSetup()).status).toBe(200);
      expect(
        await db.totpEnrollment.count({ where: { userId: user.id } }),
      ).toBe(0);
      expect(
        await db.mfaLoginChallenge.count({ where: { userId: user.id } }),
      ).toBe(0);
      const credential = await db.totpCredential.findUniqueOrThrow({
        where: { userId: user.id },
      });
      expect(decryptTotpSecret(credential, user.id)).toBe(secret);
      const storedCodes = await db.mfaRecoveryCode.findMany({
        where: { userId: user.id },
      });
      expect(
        findMatchingRecoveryCode(
          codes[0]?.plaintext ?? '',
          storedCodes,
          user.id,
        ),
      ).not.toBeNull();
      expect(await db.session.count({ where: { userId: user.id } })).toBe(2);
      expect(
        (await db.user.findUniqueOrThrow({ where: { id: user.id } }))
          .securityVersion,
      ).toBe(2);
      expect(await auditCount(user)).toBe(0);
    });

    it('rolls back MFA replacement on audit failure, then commits once and refuses challenge replay', async () => {
      const { codes, secret, user } = await mfaAccount();
      const current = await signIn(user);
      await session(user);
      const setup = await startMfaSetup(
        mfaRequest('setup', {
          currentCode: await totp(secret),
          currentPassword: password,
        }),
      );
      expect(setup.status).toBe(200);
      const manualKey: string = (await setup.json()).data.manualKey;
      const originalChallenge = connection.cookies.get(
        MFA_CHALLENGE_COOKIE_NAME,
      );
      const credentialBeforeConfirmation =
        await db.totpCredential.findUniqueOrThrow({
          where: { userId: user.id },
        });
      const confirmation = async (): ReturnType<typeof confirmMfaSetup> =>
        confirmMfaSetup(
          mfaRequest('setup', { code: await totp(manualKey) }, 'PUT'),
        );
      await auditFailure(user, async () => {
        expect((await confirmation()).status).toBe(500);
        expect(
          await db.totpCredential.findUnique({ where: { userId: user.id } }),
        ).toEqual(credentialBeforeConfirmation);
        expect(await db.session.count({ where: { userId: user.id } })).toBe(2);
        expect(
          await db.totpEnrollment.count({ where: { userId: user.id } }),
        ).toBe(1);
        expect(
          await db.mfaLoginChallenge.count({ where: { userId: user.id } }),
        ).toBe(1);
        expect(
          (await db.user.findUniqueOrThrow({ where: { id: user.id } }))
            .securityVersion,
        ).toBe(2);
        expect(await auditCount(user)).toBe(0);
      });
      const response = await confirmation();
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.recoveryCodes).toHaveLength(10);
      const credential = await db.totpCredential.findUniqueOrThrow({
        where: { userId: user.id },
      });
      expect(decryptTotpSecret(credential, user.id)).toBe(manualKey);
      const storedCodes = await db.mfaRecoveryCode.findMany({
        where: { userId: user.id },
      });
      expect(
        findMatchingRecoveryCode(
          codes[0]?.plaintext ?? '',
          storedCodes,
          user.id,
        ),
      ).toBeNull();
      expect(
        findMatchingRecoveryCode(
          body.data.recoveryCodes[0],
          storedCodes,
          user.id,
        ),
      ).not.toBeNull();
      const sessions = await db.session.findMany({
        where: { userId: user.id },
      });
      expect(sessions).toHaveLength(1);
      expect(sessions[0]).toMatchObject({
        expiresAt: current.expiresAt,
        idleExpiresAt: current.idleExpiresAt,
        securityVersion: 3,
      });
      expect(sessions[0]?.id).not.toBe(current.id);
      expect(
        await db.totpEnrollment.count({ where: { userId: user.id } }),
      ).toBe(0);
      if (!originalChallenge) throw new Error('Missing fixture MFA challenge');
      connection.cookies.set(MFA_CHALLENGE_COOKIE_NAME, originalChallenge);
      expect((await confirmation()).status).toBe(401);
      const audit = await db.auditLog.findMany({
        where: { targetUserId: user.id },
      });
      expect(audit).toHaveLength(1);
      expect(audit[0]?.metadata).toMatchObject({ replacing: true });
      expect(JSON.stringify(audit)).not.toContain(manualKey);
      expect(JSON.stringify(audit)).not.toContain(body.data.recoveryCodes[0]);
    });

    it('rolls back recovery-code regeneration and TOTP consumption, then rotates once and refuses proof replay', async () => {
      const { codes, secret, user } = await mfaAccount();
      const current = await signIn(user);
      await session(user);
      const currentCode = await totp(secret);
      const regenerate = (): ReturnType<typeof regenerateCodes> =>
        regenerateCodes(
          mfaRequest('recovery-codes', {
            currentPassword: password,
            currentTotpCode: currentCode,
          }),
        );
      await auditFailure(user, async () => {
        expect((await regenerate()).status).toBe(500);
        expect(
          (
            await db.totpCredential.findUniqueOrThrow({
              where: { userId: user.id },
            })
          ).lastUsedTimeStep,
        ).toBeNull();
        const storedCodes = await db.mfaRecoveryCode.findMany({
          where: { userId: user.id },
        });
        expect(
          findMatchingRecoveryCode(
            codes[0]?.plaintext ?? '',
            storedCodes,
            user.id,
          ),
        ).not.toBeNull();
        expect(await db.session.count({ where: { userId: user.id } })).toBe(2);
        expect(
          (await db.user.findUniqueOrThrow({ where: { id: user.id } }))
            .securityVersion,
        ).toBe(2);
        expect(await auditCount(user)).toBe(0);
      });
      const response = await regenerate();
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.recoveryCodes).toHaveLength(10);
      const storedCodes = await db.mfaRecoveryCode.findMany({
        where: { userId: user.id },
      });
      expect(
        findMatchingRecoveryCode(
          codes[0]?.plaintext ?? '',
          storedCodes,
          user.id,
        ),
      ).toBeNull();
      expect(
        findMatchingRecoveryCode(
          body.data.recoveryCodes[0],
          storedCodes,
          user.id,
        ),
      ).not.toBeNull();
      const sessions = await db.session.findMany({
        where: { userId: user.id },
      });
      expect(sessions).toHaveLength(1);
      expect(sessions[0]).toMatchObject({
        expiresAt: current.expiresAt,
        idleExpiresAt: current.idleExpiresAt,
        securityVersion: 3,
      });
      const updatedUser = await db.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      connection.session.mockResolvedValue({
        session: sessions[0],
        user: mapUserToUserType(updatedUser),
      });
      expect((await regenerate()).status).toBe(400);
      const audit = await db.auditLog.findMany({
        where: { targetUserId: user.id },
      });
      expect(audit).toHaveLength(1);
      expect(JSON.stringify(audit)).not.toContain(body.data.recoveryCodes[0]);
      expect(JSON.stringify(audit)).not.toContain(secret);
    });
  },
);
