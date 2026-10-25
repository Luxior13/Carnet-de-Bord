import { randomUUID } from 'node:crypto';

import { PrismaClient, type User } from '@prisma/client';
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

import { POST } from '$app/api/users/route';

const connection = vi.hoisted(() => ({
  afterHash: null as (() => Promise<void>) | null,
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
        if (!connection.client) throw new Error('Missing isolated database');
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
vi.mock('$server/session', async (importOriginal) => ({
  ...(await importOriginal<typeof import('$server/session')>()),
  getAuthSession: connection.session,
}));
vi.mock('$server/password', async (importOriginal) => {
  const original = await importOriginal<typeof import('$server/password')>();

  return {
    ...original,
    hashPassword: async (password: string): Promise<string> => {
      const hash = await original.hashPassword(password);
      await connection.afterHash?.();

      return hash;
    },
  };
});

const target = process.env.USER_CREATION_TEST_DATABASE_URL;
describe.skipIf(!target)(
  'creation authorization after hashing on PostgreSQL',
  () => {
    let db: PrismaClient;
    const login = (): string =>
      'test.' + randomUUID().replaceAll('-', '').slice(0, 20);
    const account = async (protectedAccount = false): Promise<User> => {
      if (protectedAccount) {
        const existing = await db.user.findFirst({
          where: { isProtected: true },
        });
        if (existing) return existing;

        return db.user.upsert({
          create: {
            firstName: 'Acteur fictif',
            isProtected: true,
            lastName: '',
            loginName: 'test.creation.root',
            passwordHash: '!fixture',
            role: 'ADMIN',
          },
          update: {},
          where: { loginName: 'test.creation.root' },
        });
      }
      const user = await db.user.create({
        data: {
          firstName: 'Acteur fictif',
          isProtected: protectedAccount,
          lastName: '',
          loginName: login(),
          passwordHash: '!fixture',
          role: 'ADMIN',
        },
      });
      await db.loginNameReservation.create({
        data: { loginName: user.loginName, userId: user.id },
      });

      return user;
    };
    const signIn = async (
      actor: User,
    ): Promise<Awaited<ReturnType<PrismaClient['session']['create']>>> => {
      const session = await db.session.create({
        data: {
          criticalMfaVerifiedAt: new Date(),
          expiresAt: new Date(Date.now() + 3600_000),
          idleExpiresAt: new Date(Date.now() + 1800_000),
          mfaMethod: 'TOTP',
          mfaVerifiedAt: new Date(),
          passwordReauthenticatedAt: new Date(),
          securityVersion: actor.securityVersion,
          token: randomUUID(),
          userId: actor.id,
        },
      });
      connection.session.mockResolvedValue({ session, user: actor });

      return session;
    };
    const call = (loginName: string, role = 'USER'): ReturnType<typeof POST> =>
      POST(
        new NextRequest('http://localhost/api/users', {
          body: JSON.stringify({
            firstName: 'Creation fictive',
            lastName: '',
            loginName,
            role,
          }),
          method: 'POST',
        }),
      );
    const expectNoCreation = async (loginName: string): Promise<void> => {
      expect(await db.user.findUnique({ where: { loginName } })).toBeNull();
      expect(
        await db.loginNameReservation.findUnique({ where: { loginName } }),
      ).toBeNull();
      expect(
        await db.auditLog.count({
          where: {
            action: 'USER_CREATE',
            metadata: { equals: loginName, path: ['loginName'] },
          },
        }),
      ).toBe(0);
    };
    beforeAll(async () => {
      if (!target) throw new Error('Missing isolated creation database');
      const url = new URL(target);
      if (
        !['127.0.0.1', 'localhost'].includes(url.hostname) ||
        url.pathname !== '/creation_service_test'
      )
        throw new Error('A local creation_service_test database is required');
      db = new PrismaClient({ datasourceUrl: target });
      connection.client = db;
      const count = await db.$queryRaw<
        Array<{ count: number }>
      >`SELECT COUNT(*)::integer AS count FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;
      expect(count[0]?.count).toBeGreaterThanOrEqual(52);
    });
    beforeEach(() => {
      connection.afterHash = null;
    });
    afterAll(async () => {
      await db?.$disconnect();
      connection.client = null;
    });

    it.each([
      'source revoked',
      'security rotated',
      'permission removed',
      'actor disabled',
      'source expired',
    ] as const)(
      'refuses creation when %s after the authentication snapshot and hashing',
      async (condition) => {
        const actor = await account();
        const source = await signIn(actor);
        const loginName = login();
        connection.afterHash = async (): Promise<void> => {
          if (condition === 'source revoked')
            await db.session.delete({ where: { id: source.id } });
          if (condition === 'security rotated')
            await db.user.update({
              data: { securityVersion: { increment: 1 } },
              where: { id: actor.id },
            });
          // An ADMIN keeps every administrative access whatever its
          // overrides (rule of 18 October 2026): losing the right means
          // losing the role.
          if (condition === 'permission removed')
            await db.user.update({
              data: { role: 'USER' },
              where: { id: actor.id },
            });
          if (condition === 'actor disabled')
            await db.user.update({
              data: { isActive: false },
              where: { id: actor.id },
            });
          if (condition === 'source expired')
            await db.session.update({
              data: { idleExpiresAt: new Date(Date.now() - 1) },
              where: { id: source.id },
            });
        };
        const response = await call(loginName);
        expect(response.status).toBe(
          condition === 'permission removed' ? 403 : 401,
        );
        expect(await response.json()).not.toHaveProperty('data');
        await expectNoCreation(loginName);
      },
    );

    it('refuses ADMIN creation when the proof expires during an observed actor lock wait', async () => {
      const actor = await account(true);
      const source = await signIn(actor);
      const loginName = login();
      const proofDate = new Date(Date.now() - 5 * 60_000 + 1500);
      await db.session.update({
        data: { criticalMfaVerifiedAt: proofDate },
        where: { id: source.id },
      });
      connection.session.mockResolvedValue({
        session: { ...source, criticalMfaVerifiedAt: proofDate },
        user: actor,
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
        await transaction.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${actor.id} FOR UPDATE`;
        acquired();
        await unlocked;
      });
      await locked;
      const pending = call(loginName, 'ADMIN');
      try {
        let observedWait = false;
        const until = Date.now() + 3000;
        while (!observedWait && Date.now() < until) {
          const rows = await db.$queryRaw<
            Array<{ waiting: boolean }>
          >`SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock') AS waiting`;
          observedWait = rows[0]?.waiting ?? false;
          if (!observedWait)
            await new Promise((resolve) => setTimeout(resolve, 10));
        }
        expect(observedWait).toBe(true);
        const remaining = proofDate.getTime() + 5 * 60_000 - Date.now() + 20;
        if (remaining > 0)
          await new Promise((resolve) => setTimeout(resolve, remaining));
      } finally {
        unlock();
        await holder;
      }
      const response = await pending;
      expect(response.status).toBe(403);
      expect((await response.json()).error.code).toBe(
        'REAUTHENTICATION_REQUIRED',
      );
      await expectNoCreation(loginName);
    });
  },
);
