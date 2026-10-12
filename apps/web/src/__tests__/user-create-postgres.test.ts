import { randomUUID } from 'node:crypto';

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { createUser } from '$features/users/server/user-create.service';
import { generateTemporaryPassword } from '$server/temporary-password';

const database = vi.hoisted(() => ({ $transaction: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('$env', () => ({ env: { NODE_ENV: 'test' } }));
vi.mock('$server/prisma', () => ({ prisma: database }));
vi.mock('$server/logger', () => ({ logger: { error: vi.fn() } }));
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
  headers: vi.fn(
    async () => new Headers({ 'user-agent': 'Creation service regression' }),
  ),
}));

// Fully migrated disposable database only; no application DATABASE_URL fallback.
const target = process.env.USER_CREATION_TEST_DATABASE_URL;
describe.skipIf(!target)('user creation transactions on PostgreSQL', () => {
  let db: PrismaClient;
  let actorId: string;
  let authority: Parameters<typeof createUser>[1];
  const login = (): string =>
    'test.' + randomUUID().replaceAll('-', '').slice(0, 20);
  const data = (
    loginName = login(),
    role: 'ADMIN' | 'USER' = 'USER',
  ): Parameters<typeof createUser>[0] => ({
    firstName: ' Fictif ',
    lastName: '',
    loginName,
    password: generateTemporaryPassword(),
    role,
  });
  const audit =
    (
      description = 'Création fictive de régression',
    ): Parameters<typeof createUser>[2] =>
    (user: { id: string }): ReturnType<Parameters<typeof createUser>[2]> => ({
      action: 'USER_CREATE' as const,
      category: 'USER' as const,
      description,
      metadata: { pageKey: 'users', poleKey: 'system', tabKey: 'creation' },
      targetUserId: user.id,
      userId: actorId,
    });
  beforeAll(async () => {
    if (!target) throw new Error('Missing isolated creation database');
    const url = new URL(target);
    if (
      !['localhost', '127.0.0.1'].includes(url.hostname) ||
      url.pathname !== '/creation_service_test'
    )
      throw new Error('A local creation_service_test database is required');
    db = new PrismaClient({ datasourceUrl: target });
    const migrations = await db.$queryRaw<
      Array<{ count: number }>
    >`SELECT COUNT(*)::integer AS count FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;
    expect(migrations[0]?.count).toBeGreaterThanOrEqual(52);
    database.$transaction.mockImplementation((callback) =>
      db.$transaction(callback),
    );
    const actor =
      (await db.user.findFirst({ where: { isProtected: true } })) ??
      (await db.user.upsert({
        create: {
          firstName: 'Acteur fictif',
          isProtected: true,
          lastName: '',
          loginName: 'test.creation.root',
          passwordHash: '!test-only',
          role: 'ADMIN',
        },
        update: {},
        where: { loginName: 'test.creation.root' },
      }));
    actorId = actor.id;
    await db.loginNameReservation.upsert({
      create: { loginName: actor.loginName, userId: actor.id },
      update: {},
      where: { loginName: actor.loginName },
    });
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
    authority = { actorId, session };
  });
  afterAll(async () => {
    await db?.$disconnect();
  });

  it.each(['USER', 'ADMIN'] as const)(
    'persists a complete %s account, reservation and audit with a real bcrypt hash',
    async (role) => {
      const input = {
        ...data(login(), role),
        contactEmail: ' FICTIF@EXAMPLE.TEST ',
      };
      const user = await createUser(input, authority, audit());
      expect(user).toMatchObject({
        contactEmail: 'fictif@example.test',
        contactEmailVerifiedAt: null,
        firstName: 'Fictif',
        isActive: true,
        isProtected: false,
        lastName: '',
        mustChangePassword: true,
        permissions: null,
        role,
        securityVersion: 0,
      });
      expect(bcrypt.getRounds(user.passwordHash)).toBe(12);
      expect(await bcrypt.compare(input.password, user.passwordHash)).toBe(
        true,
      );
      expect(
        await db.loginNameReservation.findUnique({
          where: { loginName: user.loginName },
        }),
      ).toMatchObject({ userId: user.id });
      const logs = await db.auditLog.findMany({
        where: { action: 'USER_CREATE', targetUserId: user.id },
      });
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        targetLoginNameSnapshot: user.loginName,
        userId: actorId,
      });
      expect(JSON.stringify(logs)).not.toContain(input.password);
      expect(JSON.stringify(logs)).not.toContain(user.passwordHash);
      expect(await db.session.count({ where: { userId: user.id } })).toBe(0);
    },
  );

  it('commits one complete account for simultaneous attempts at the same login', async () => {
    const input = data();
    const attempts = await Promise.allSettled([
      createUser(input, authority, audit()),
      createUser(
        { ...input, password: generateTemporaryPassword() },
        authority,
        audit(),
      ),
    ]);
    expect(
      attempts.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    const rejected = attempts.find((result) => result.status === 'rejected');
    expect(rejected?.status === 'rejected' && rejected.reason).toMatchObject({
      code: 'P2002',
    });
    const accounts = await db.user.findMany({
      where: { loginName: input.loginName },
    });
    expect(accounts).toHaveLength(1);
    const id = accounts[0]?.id;
    expect(
      await db.loginNameReservation.count({
        where: { loginName: input.loginName, userId: id },
      }),
    ).toBe(1);
    expect(
      await db.auditLog.count({
        where: { action: 'USER_CREATE', targetUserId: id },
      }),
    ).toBe(1);
  });

  it('rolls back a new account when a renamed identity still owns the login', async () => {
    const original = await createUser(data(), authority, audit());
    const newLogin = login();
    await db.$transaction(async (tx) => {
      await tx.loginNameReservation.create({
        data: { loginName: newLogin, userId: original.id },
      });
      await tx.user.update({
        data: { loginName: newLogin },
        where: { id: original.id },
      });
    });
    const countBefore = await db.user.count();
    const auditBefore = await db.auditLog.count();
    await expect(
      createUser(data(original.loginName), authority, audit()),
    ).rejects.toMatchObject({ code: 'P2002' });
    expect(await db.user.count()).toBe(countBefore);
    expect(await db.auditLog.count()).toBe(auditBefore);
    expect(
      await db.user.findUnique({ where: { loginName: original.loginName } }),
    ).toBeNull();
    expect(
      await db.loginNameReservation.findUnique({
        where: { loginName: original.loginName },
      }),
    ).toMatchObject({ userId: original.id });
  });

  it('rolls back account and reservation on audit insertion failure, then permits retry', async () => {
    const suffix = randomUUID().replaceAll('-', '');
    const trigger = 'creation_audit_failure_' + suffix;
    const description = 'test-failure-' + suffix;
    const input = data();
    await db.$executeRawUnsafe(
      `CREATE FUNCTION "${trigger}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Audit failure injected by creation test'; END; $$`,
    );
    try {
      await db.$executeRawUnsafe(
        `CREATE TRIGGER "${trigger}" BEFORE INSERT ON "AuditLog" FOR EACH ROW WHEN (NEW.description = '${description}') EXECUTE FUNCTION "${trigger}"()`,
      );
      await expect(
        createUser(input, authority, audit(description)),
      ).rejects.toThrow('Audit failure injected by creation test');
      expect(
        await db.user.findUnique({ where: { loginName: input.loginName } }),
      ).toBeNull();
      expect(
        await db.loginNameReservation.findUnique({
          where: { loginName: input.loginName },
        }),
      ).toBeNull();
      expect(await db.auditLog.count({ where: { description } })).toBe(0);
    } finally {
      await db.$executeRawUnsafe(
        `DROP TRIGGER IF EXISTS "${trigger}" ON "AuditLog"`,
      );
      await db.$executeRawUnsafe(`DROP FUNCTION "${trigger}"()`);
    }
    const retried = await createUser(input, authority, audit(description));
    expect(
      await db.auditLog.count({
        where: { description, targetUserId: retried.id },
      }),
    ).toBe(1);
  });
});
