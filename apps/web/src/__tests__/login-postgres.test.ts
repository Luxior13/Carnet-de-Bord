import { createHash, randomUUID } from 'node:crypto';

import { type Prisma, PrismaClient, type User } from '@prisma/client';
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

import { POST as login } from '$app/api/auth/login/route';
import { DELETE as cancelChallenge } from '$app/api/auth/mfa/challenge/route';
import {
  POST as startSetup,
  PUT as confirmSetup,
} from '$app/api/auth/mfa/setup/route';
import { POST as verifyMfa } from '$app/api/auth/mfa/verify/route';
import { MFA_CHALLENGE_COOKIE_NAME } from '$constants/security.constants';
import {
  encryptTotpSecret,
  generateRecoveryCodes,
  generateTotpSecret,
} from '$server/mfa';
import { createLoginRateLimitKeys } from '$server/rate-limiter';
import { createSession, getAuthSession } from '$server/session';

const connection = vi.hoisted(() => ({
  client: null as PrismaClient | null,
  cookies: new Map<string, string>(),
}));
vi.mock('server-only', () => ({}));
vi.mock('$env', () => ({
  env: {
    NODE_ENV: 'test',
  },
}));
// Read from the process environment at use (key rotation, REV-10).
vi.stubEnv('MFA_ENCRYPTION_KEY_V1', Buffer.alloc(32, 11).toString('base64'));
vi.mock('$server/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn() },
}));
vi.mock('$server/prisma', () => ({
  prisma: new Proxy(
    {},
    {
      get: (_target, key): unknown => {
        if (!connection.client)
          throw new Error('Isolated login database not initialized');
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

const target = process.env.LOGIN_TEST_DATABASE_URL;
const gate = (): { open: () => void; promise: Promise<void> } => {
  let open: () => void = () => undefined;
  const promise = new Promise<void>((resolve) => {
    open = resolve;
  });

  return { open, promise };
};

describe.skipIf(!target)(
  'login and mandatory MFA on migrated PostgreSQL',
  () => {
    let db: PrismaClient;
    let passwordHash: string;
    const password = 'FictivePassword1!';
    const account = (
      overrides: Partial<Prisma.UserCreateInput> = {},
    ): Promise<User> =>
      db.user.create({
        data: {
          firstName: 'Login fixture',
          loginName: 'test.' + randomUUID().replaceAll('-', '').slice(0, 20),
          passwordHash,
          ...overrides,
        },
      });
    const request = (
      path: string,
      body: Record<string, unknown>,
      method = 'POST',
    ): NextRequest =>
      new NextRequest('http://localhost/api/auth/' + path, {
        body: JSON.stringify(body),
        method,
      });
    const begin = async (user: User, rememberMe = false): Promise<void> => {
      const response = await login(
        request('login', { loginName: user.loginName, password, rememberMe }),
      );
      expect(response.status).toBe(200);
      expect(connection.cookies.get(MFA_CHALLENGE_COOKIE_NAME)).toBeTruthy();
      expect(connection.cookies.get('session')).toBeUndefined();
    };
    const totp = (secret: string): Promise<string> =>
      generate({ algorithm: 'sha1', digits: 6, period: 30, secret });
    const configured = async (): Promise<{
      recoveryCode: string;
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
      const recoveryCode = codes[0]?.plaintext;
      if (!recoveryCode) throw new Error('Recovery fixture missing');

      return { recoveryCode, secret, user };
    };
    const prepareSetup = async (): Promise<{ secret: string; user: User }> => {
      const user = await account();
      await begin(user);
      const response = await startSetup(request('mfa/setup', {}));
      expect(response.status).toBe(200);

      return { secret: (await response.json()).data.manualKey, user };
    };
    const auditFailure = async (
      user: User,
      run: () => Promise<void>,
    ): Promise<void> => {
      const name = 'login_audit_failure_' + randomUUID().replaceAll('-', '');
      if (!/^[a-z0-9]+$/.test(user.id))
        throw new Error('Unexpected fixture id');
      await db.$executeRawUnsafe(
        `CREATE FUNCTION "${name}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Injected login audit failure'; END; $$`,
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
    const waitForLock = async (): Promise<void> => {
      const deadline = Date.now() + 2000;
      while (Date.now() < deadline) {
        const rows = await db.$queryRaw<Array<{ count: number }>>`
        SELECT COUNT(*)::integer AS count
        FROM pg_catalog.pg_locks AS locks
        JOIN pg_catalog.pg_stat_activity AS activity ON activity.pid = locks.pid
        WHERE NOT locks.granted AND activity.datname = current_database()
          AND locks.locktype = 'transactionid'
      `;
        if ((rows[0]?.count ?? 0) > 0) return;
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      throw new Error(
        'Expected a real login transaction waiting on the User lock',
      );
    };

    beforeAll(async () => {
      if (!target) throw new Error('Missing isolated login database');
      const url = new URL(target);
      if (
        !['127.0.0.1', 'localhost'].includes(url.hostname) ||
        url.pathname !== '/login_service_test'
      )
        throw new Error('Only local login_service_test is allowed');
      db = new PrismaClient({ datasourceUrl: target });
      connection.client = db;
      const migrations = await db.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::integer AS count FROM "_prisma_migrations"
      WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
    `;
      expect(migrations[0]?.count).toBeGreaterThanOrEqual(52);
      passwordHash = await bcrypt.hash(password, 4);
    });
    beforeEach(async () => {
      connection.cookies.clear();
      await db.rateLimit.deleteMany();
    });
    afterAll(async () => {
      await db?.$disconnect();
      connection.client = null;
    });

    it('upgrades a legacy bcrypt hash at the password step without touching the account revision', async () => {
      const user = await account();
      expect(user.passwordHash.startsWith('$2')).toBe(true);
      await begin(user);
      const upgraded = await db.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      expect(upgraded.passwordHash).toMatch(/^\$argon2id\$v=19\$/);
      expect(upgraded.updatedAt).toEqual(user.updatedAt);
      expect(upgraded.securityVersion).toBe(user.securityVersion);
      expect(upgraded.passwordChangedAt).toEqual(user.passwordChangedAt);

      // The upgraded hash proves the same password.
      connection.cookies.clear();
      await begin(upgraded);
    });

    it('keeps unknown, disabled and wrong-password replies indistinguishable', async () => {
      const users = [await account({ isActive: false }), await account()];
      const names = [
        'missing.' + randomUUID().replaceAll('-', '').slice(0, 20),
        ...users.map((user) => user.loginName),
      ];
      const replies: unknown[] = [];
      for (const loginName of names) {
        const response = await login(
          request('login', { loginName, password: 'WrongFixture1!' }),
        );
        expect(response.status).toBe(401);
        replies.push(await response.json());
      }
      expect(
        replies.every(
          (reply) => JSON.stringify(reply) === JSON.stringify(replies[0]),
        ),
      ).toBe(true);
      expect(connection.cookies.size).toBe(0);
      expect(
        await db.session.count({
          where: { userId: { in: users.map((user) => user.id) } },
        }),
      ).toBe(0);
    });

    it('blocks the source after five bad passwords without blocking the account', async () => {
      const user = await account();
      for (let attempt = 0; attempt < 5; attempt++) {
        expect(
          (
            await login(
              request('login', {
                loginName: user.loginName,
                password: 'WrongFixture1!',
              }),
            )
          ).status,
        ).toBe(401);
      }
      const blocked = await login(
        request('login', { loginName: user.loginName, password }),
      );
      expect(blocked.status).toBe(429);
      expect(Number(blocked.headers.get('Retry-After'))).toBeGreaterThan(0);
      // REV-01: only the IP + login pair is blocked; nothing locks the account.
      expect(
        await db.auditLog.count({
          where: { action: 'ACCOUNT_LOCKED', targetUserId: user.id },
        }),
      ).toBe(0);
      // 31 October 2026: the block reaches the activity journal once, however
      // many refusals follow while it lasts.
      expect(
        (await login(request('login', { loginName: user.loginName, password })))
          .status,
      ).toBe(429);
      const reports = await db.auditLog.findMany({
        where: { action: 'ATTEMPTS_BLOCKED', targetUserId: user.id },
      });
      expect(reports).toHaveLength(1);
      expect(reports[0]).toMatchObject({
        metadata: expect.objectContaining({ proof: 'password', step: 'login' }),
        outcome: 'FAILURE',
        severity: 'WARNING',
        stream: 'AUTHENTICATION',
        userId: null,
      });
      const keys = createLoginRateLimitKeys(null, user.loginName);
      expect(
        await db.rateLimit.findUnique({ where: { key: keys.pair } }),
      ).toMatchObject({ blockedUntil: expect.any(Date), count: 5 });
      expect(
        await db.rateLimit.findUnique({ where: { key: keys.account } }),
      ).toMatchObject({ blockedUntil: null, count: 5 });
      expect(keys.account).not.toContain(user.loginName);
    });

    it.each([false, true])(
      'issues a hashed session with the reviewed deadlines, rememberMe=%s',
      async (rememberMe) => {
        const { secret, user } = await configured();
        const before = Date.now();
        const logged = await login(
          request('login', {
            loginName: '  ' + user.loginName.toUpperCase() + '  ',
            password,
            rememberMe,
          }),
        );
        expect(logged.status).toBe(200);
        const loginBody = await logged.json();
        expect(loginBody.data).toMatchObject({ status: 'mfa_required' });
        expect(Object.keys(loginBody.data).sort()).toEqual([
          'challengeExpiresAt',
          'status',
        ]);
        const challengeToken = connection.cookies.get(
          MFA_CHALLENGE_COOKIE_NAME,
        );
        expect(
          await db.mfaLoginChallenge.findUnique({ where: { userId: user.id } }),
        ).toMatchObject({
          rememberMe,
          tokenHash: createHash('sha256')
            .update(challengeToken ?? '')
            .digest('hex'),
        });
        const response = await verifyMfa(
          request('mfa/verify', { code: await totp(secret) }),
        );
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.data.user).not.toHaveProperty('passwordHash');
        expect(body.data.user).not.toHaveProperty('totpCredential');
        const token = connection.cookies.get('session');
        const saved = await db.session.findFirstOrThrow({
          where: { userId: user.id },
        });
        expect(saved.token).toBe(
          createHash('sha256')
            .update(token ?? '')
            .digest('hex'),
        );
        expect(saved.token).not.toBe(token);
        expect(saved.rememberMe).toBe(rememberMe);
        const duration = (rememberMe ? 30 : 1) * 86_400_000;
        // A remembered session's idle limit meets its absolute limit.
        const idle = rememberMe ? 30 * 86_400_000 : 30 * 60_000;
        expect(saved.expiresAt.getTime() - saved.lastSeenAt.getTime()).toBe(
          duration,
        );
        expect(saved.idleExpiresAt.getTime() - saved.lastSeenAt.getTime()).toBe(
          idle,
        );
        expect(saved.lastSeenAt.getTime()).toBeGreaterThanOrEqual(before);
        expect((await getAuthSession()).user?.id).toBe(user.id);
        expect(
          await db.mfaLoginChallenge.findUnique({ where: { userId: user.id } }),
        ).toBeNull();
        expect(
          await db.auditLog.count({
            where: { action: 'LOGIN_SUCCESS', userId: user.id },
          }),
        ).toBe(1);
      },
    );

    it('keeps the MFA account quota across replacement login challenges', async () => {
      const { user } = await configured();
      await begin(user);
      for (let attempt = 0; attempt < 5; attempt++) {
        expect(
          (await verifyMfa(request('mfa/verify', { code: 'wrong-fixture' })))
            .status,
        ).toBe(400);
      }
      expect(
        (await verifyMfa(request('mfa/verify', { code: 'wrong-fixture' })))
          .status,
      ).toBe(429);
      const oldToken = connection.cookies.get(MFA_CHALLENGE_COOKIE_NAME);
      await begin(user);
      expect(connection.cookies.get(MFA_CHALLENGE_COOKIE_NAME)).not.toBe(
        oldToken,
      );
      expect(
        (await verifyMfa(request('mfa/verify', { code: 'wrong-fixture' })))
          .status,
      ).toBe(429);
      expect(await db.session.count({ where: { userId: user.id } })).toBe(0);
    });

    it.each(['TOTP', 'RECOVERY_CODE'] as const)(
      'allows one concurrent consumption of a %s login proof',
      async (method) => {
        const { recoveryCode, secret, user } = await configured();
        await begin(user);
        const code = method === 'TOTP' ? await totp(secret) : recoveryCode;
        const responses = await Promise.all([
          verifyMfa(request('mfa/verify', { code })),
          verifyMfa(request('mfa/verify', { code })),
        ]);
        expect(responses.map((response) => response.status).sort()).toEqual([
          200, 401,
        ]);
        expect(await db.session.count({ where: { userId: user.id } })).toBe(1);
        expect(
          await db.auditLog.count({
            where: { action: 'LOGIN_SUCCESS', userId: user.id },
          }),
        ).toBe(1);
        expect(
          await db.mfaRecoveryCode.count({
            where: { usedAt: { not: null }, userId: user.id },
          }),
        ).toBe(method === 'RECOVERY_CODE' ? 1 : 0);
        connection.cookies.delete('session');
        await begin(user);
        expect((await verifyMfa(request('mfa/verify', { code }))).status).toBe(
          400,
        );
        expect(await db.session.count({ where: { userId: user.id } })).toBe(1);
      },
    );

    it('stamps the last login without changing the account revision', async () => {
      const { secret, user } = await configured();
      const before = await db.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      await begin(user);
      expect(
        (await verifyMfa(request('mfa/verify', { code: await totp(secret) })))
          .status,
      ).toBe(200);
      const after = await db.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      expect(after.lastLoginAt).not.toBeNull();
      // An administrator editing this account is not told it changed.
      expect(after.updatedAt).toEqual(before.updatedAt);
      expect(after.securityVersion).toBe(before.securityVersion);
    });

    it('rolls back challenge consumption, TOTP state, last login and session when the success audit fails', async () => {
      const { secret, user } = await configured();
      await begin(user);
      const token = connection.cookies.get(MFA_CHALLENGE_COOKIE_NAME);
      const code = await totp(secret);
      await auditFailure(user, async () => {
        expect((await verifyMfa(request('mfa/verify', { code }))).status).toBe(
          500,
        );
      });
      expect(await db.session.count({ where: { userId: user.id } })).toBe(0);
      expect(
        await db.user.findUnique({ where: { id: user.id } }),
      ).toMatchObject({ lastLoginAt: null });
      expect(
        await db.totpCredential.findUnique({ where: { userId: user.id } }),
      ).toMatchObject({ lastUsedTimeStep: null });
      expect(
        await db.mfaLoginChallenge.findUnique({ where: { userId: user.id } }),
      ).not.toBeNull();
      expect(connection.cookies.get(MFA_CHALLENGE_COOKIE_NAME)).toBe(token);
      expect((await verifyMfa(request('mfa/verify', { code }))).status).toBe(
        200,
      );
    });

    it('completes mandatory setup once with recovery hashes and an MFA-bound session', async () => {
      const { secret, user } = await prepareSetup();
      const code = await totp(secret);
      const response = await confirmSetup(
        request('mfa/setup', { code }, 'PUT'),
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.recoveryCodes).toHaveLength(10);
      expect(body.data.user).toMatchObject({
        mfaEnabledAt: expect.any(String),
      });
      const storedCodes = await db.mfaRecoveryCode.findMany({
        where: { userId: user.id },
      });
      expect(storedCodes).toHaveLength(10);
      expect(
        body.data.recoveryCodes.every(
          (plain: string) => !JSON.stringify(storedCodes).includes(plain),
        ),
      ).toBe(true);
      expect(
        await db.totpCredential.findUnique({ where: { userId: user.id } }),
      ).not.toBeNull();
      expect(
        await db.totpEnrollment.findUnique({ where: { userId: user.id } }),
      ).toBeNull();
      expect(
        await db.user.findUnique({ where: { id: user.id } }),
      ).toMatchObject({ securityVersion: user.securityVersion + 1 });
      expect(
        (await confirmSetup(request('mfa/setup', { code }, 'PUT'))).status,
      ).toBe(401);
      expect(await db.session.count({ where: { userId: user.id } })).toBe(1);
    });

    it('rolls back bootstrap enrollment, credentials and version if its required audit fails', async () => {
      const { secret, user } = await prepareSetup();
      const code = await totp(secret);
      await auditFailure(user, async () => {
        expect(
          (await confirmSetup(request('mfa/setup', { code }, 'PUT'))).status,
        ).toBe(500);
      });
      expect(
        await db.user.findUnique({ where: { id: user.id } }),
      ).toMatchObject({
        lastLoginAt: null,
        mfaEnabledAt: null,
        securityVersion: user.securityVersion,
      });
      expect(
        await db.totpCredential.findUnique({ where: { userId: user.id } }),
      ).toBeNull();
      expect(
        await db.totpEnrollment.findUnique({ where: { userId: user.id } }),
      ).not.toBeNull();
      expect(
        await db.mfaLoginChallenge.findUnique({ where: { userId: user.id } }),
      ).not.toBeNull();
      expect(
        await db.mfaRecoveryCode.count({ where: { userId: user.id } }),
      ).toBe(0);
      expect(await db.session.count({ where: { userId: user.id } })).toBe(0);
      expect(
        (await confirmSetup(request('mfa/setup', { code }, 'PUT'))).status,
      ).toBe(200);
    });

    it.each(['version', 'disabled'] as const)(
      'rejects a challenge after the account becomes stale: %s',
      async (reason) => {
        const { secret, user } = await configured();
        await begin(user);
        await db.user.update({
          data:
            reason === 'version'
              ? { securityVersion: { increment: 1 } }
              : { isActive: false },
          where: { id: user.id },
        });
        expect(
          (await verifyMfa(request('mfa/verify', { code: await totp(secret) })))
            .status,
        ).toBe(401);
        expect(await db.session.count({ where: { userId: user.id } })).toBe(0);
      },
    );

    it('cancels the exact pending setup without enabling MFA or creating a session', async () => {
      const { user } = await prepareSetup();
      expect((await cancelChallenge()).status).toBe(200);
      expect(
        await db.mfaLoginChallenge.findUnique({ where: { userId: user.id } }),
      ).toBeNull();
      expect(
        await db.totpEnrollment.findUnique({ where: { userId: user.id } }),
      ).toBeNull();
      expect(
        await db.user.findUnique({ where: { id: user.id } }),
      ).toMatchObject({ mfaEnabledAt: null });
      expect(await db.session.count({ where: { userId: user.id } })).toBe(0);
    });

    it.each(['expiresAt', 'idleExpiresAt'] as const)(
      'refuses an MFA source-session replacement whose %s expires during the user lock',
      async (field) => {
        const { user } = await configured();
        const deadline = new Date(Date.now() + 1200);
        const future = new Date(Date.now() + 86_400_000);
        const source = await db.session.create({
          data: {
            expiresAt: future,
            idleExpiresAt: future,
            mfaMethod: 'TOTP',
            mfaVerifiedAt: new Date(),
            securityVersion: user.securityVersion,
            token: randomUUID(),
            userId: user.id,
            [field]: deadline,
          },
        });
        const ready = gate();
        const release = gate();
        const blocker = db.$transaction(
          async (transaction) => {
            await transaction.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${user.id} FOR UPDATE`;
            ready.open();
            await release.promise;
          },
          { timeout: 10_000 },
        );
        await ready.promise;
        const replacement = createSession(
          randomUUID(),
          user.id,
          user.securityVersion,
          false,
          undefined,
          {
            advanceSecurityVersion: true,
            mfaMethod: 'TOTP',
            precondition: async () => undefined,
            requireMfaEnabled: true,
            revokeExistingSessions: true,
            sourceSessionToken: source.token,
          },
        ).then(
          () => null,
          (error: unknown) => error,
        );
        try {
          await waitForLock();
          await new Promise((resolve) =>
            setTimeout(
              resolve,
              Math.max(0, deadline.getTime() - Date.now() + 25),
            ),
          );
        } finally {
          release.open();
          await blocker;
        }
        expect(await replacement).toMatchObject({
          code: 'UNAUTHORIZED',
          name: 'UserActionAuthorizationError',
          status: 401,
        });
        expect(await db.session.count({ where: { userId: user.id } })).toBe(1);
        expect(
          await db.session.findUnique({ where: { id: source.id } }),
        ).not.toBeNull();
        expect(
          await db.user.findUnique({ where: { id: user.id } }),
        ).toMatchObject({
          lastLoginAt: null,
          securityVersion: user.securityVersion,
        });
      },
    );

    it.each(['LOGIN', 'SETUP'] as const)(
      'refuses a %s challenge that expires while waiting for the user lock',
      async (purpose) => {
        const user = await account({
          mfaEnabledAt: purpose === 'LOGIN' ? new Date() : null,
        });
        let secret = generateTotpSecret();
        if (purpose === 'LOGIN') {
          await db.totpCredential.create({
            data: { ...encryptTotpSecret(secret, user.id), userId: user.id },
          });
        }
        await begin(user);
        if (purpose === 'SETUP') {
          const started = await startSetup(request('mfa/setup', {}));
          expect(started.status).toBe(200);
          const body = await started.json();
          secret = body.data.manualKey;
        }
        const deadline = new Date(Date.now() + 1200);
        await db.mfaLoginChallenge.update({
          data: { expiresAt: deadline },
          where: { userId: user.id },
        });
        if (purpose === 'SETUP') {
          await db.totpEnrollment.update({
            data: { expiresAt: deadline },
            where: { userId: user.id },
          });
        }
        const ready = gate();
        const release = gate();
        const blocker = db.$transaction(
          async (transaction) => {
            await transaction.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${user.id} FOR UPDATE`;
            ready.open();
            await release.promise;
          },
          { timeout: 10_000 },
        );
        await ready.promise;
        const code = await generate({
          algorithm: 'sha1',
          digits: 6,
          period: 30,
          secret,
        });
        const mutation =
          purpose === 'LOGIN'
            ? verifyMfa(request('mfa/verify', { code }))
            : confirmSetup(request('mfa/setup', { code }, 'PUT'));
        try {
          await waitForLock();
          await new Promise((resolve) =>
            setTimeout(
              resolve,
              Math.max(0, deadline.getTime() - Date.now() + 25),
            ),
          );
        } finally {
          release.open();
          await blocker;
        }
        expect((await mutation).status).toBe(401);
        expect(await db.session.count({ where: { userId: user.id } })).toBe(0);
        expect(
          await db.auditLog.count({
            where: { action: 'LOGIN_SUCCESS', userId: user.id },
          }),
        ).toBe(0);
        expect(
          await db.mfaLoginChallenge.findUnique({ where: { userId: user.id } }),
        ).not.toBeNull();
      },
    );
  },
);
