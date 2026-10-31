import { randomUUID } from 'node:crypto';

import { PrismaClient, type User } from '@prisma/client';
import { NextRequest } from 'next/server';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { GET } from '$app/api/audit/route';
import type { JournalResponse } from '$features/audit/audit-journal.types';
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
          throw new Error('Isolated journal database not initialized');
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

const target = process.env.AUDIT_JOURNAL_TEST_DATABASE_URL;
const DAY_MS = 86_400_000;

describe.skipIf(!target)(
  'activity journal on fully migrated PostgreSQL (30 October 2026)',
  () => {
    let db: PrismaClient;
    let root: User;
    let admin: User;
    let member: User;

    const authenticate = async (user: User): Promise<void> => {
      const session = await db.session.create({
        data: {
          expiresAt: new Date(Date.now() + 3600_000),
          idleExpiresAt: new Date(Date.now() + 1800_000),
          mfaMethod: 'TOTP',
          mfaVerifiedAt: new Date(),
          securityVersion: user.securityVersion,
          token: randomUUID(),
          userId: user.id,
        },
      });
      connection.session.mockResolvedValue({
        session,
        user: mapUserToUserType(user),
      });
    };
    const read = async (
      query = '',
    ): Promise<{ body: { data: JournalResponse }; status: number }> => {
      const response = await GET(
        new NextRequest(`http://localhost/api/audit?${query}`),
      );

      return { body: await response.json(), status: response.status };
    };
    const user = (role: 'ADMIN' | 'USER', isProtected = false): Promise<User> =>
      db.user.create({
        data: {
          firstName: isProtected
            ? 'Racine'
            : role === 'ADMIN'
              ? 'Camille'
              : 'Cible',
          isProtected,
          lastName: 'Journal',
          loginName: 'journal.' + randomUUID().replaceAll('-', '').slice(0, 16),
          mfaEnabledAt: new Date(),
          passwordHash: '!fictive',
          role,
        },
      });

    beforeAll(async () => {
      if (!target) throw new Error('Missing isolated journal database');
      const url = new URL(target);
      if (
        !['127.0.0.1', 'localhost'].includes(url.hostname) ||
        url.pathname !== '/audit_journal_service_test'
      )
        throw new Error(
          'A local audit_journal_service_test database is required',
        );
      db = new PrismaClient({ datasourceUrl: target });
      connection.client = db;
      root =
        (await db.user.findFirst({ where: { isProtected: true } })) ??
        (await user('ADMIN', true));
      admin = await user('ADMIN');
      member = await user('USER');
      const events = [
        {
          action: 'LOGIN_FAILED' as const,
          category: 'AUTH' as const,
          description: `Connexion échouée: ${member.loginName}`,
          eventKind: 'CONNECTION' as const,
          metadata: { reason: 'INVALID_CREDENTIALS' },
          outcome: 'FAILURE' as const,
          severity: 'WARNING' as const,
          stream: 'AUTHENTICATION' as const,
          targetDisplayNameSnapshot: 'Cible Journal',
          targetUserId: member.id,
        },
        {
          action: 'PERMISSION_UPDATE' as const,
          actorDisplayNameSnapshot: 'Camille Journal',
          category: 'PERMISSION' as const,
          description: `Autorisations modifiées : ${member.loginName}`,
          metadata: { effectivelyGrantedPermissionKeys: ['persons:view'] },
          severity: 'CRITICAL' as const,
          stream: 'AUTHORIZATION' as const,
          targetDisplayNameSnapshot: 'Cible Journal',
          targetUserId: member.id,
          userId: admin.id,
        },
        {
          action: 'PASSWORD_CHANGE' as const,
          actorDisplayNameSnapshot: 'Racine Journal',
          category: 'AUTH' as const,
          description: 'Mot de passe changé',
          ipAddress: '192.0.2.10',
          stream: 'SECURITY' as const,
          userId: root.id,
        },
      ];
      for (const event of events) await db.auditLog.create({ data: event });
      // Outside the one-year period: never listed.
      await db.auditLog.create({
        data: {
          action: 'USER_UPDATE',
          category: 'USER',
          createdAt: new Date(Date.now() - 400 * DAY_MS),
          description: 'Ancien fait',
          stream: 'IDENTITY',
          targetUserId: member.id,
          userId: admin.id,
        },
      });
    });
    afterAll(async () => {
      await db?.$disconnect();
      connection.client = null;
    });

    it('refuses a reader without the journal permission', async () => {
      await authenticate(member);
      expect((await read()).status).toBe(403);
    });

    it('traces the reading once, hides the protected account and masks IPs', async () => {
      await authenticate(admin);
      const first = await read('period=1y');
      expect(first.status).toBe(200);
      const labels = first.body.data.events.map((event) => event.label);
      expect(labels).toContain('Journal consulté');
      expect(labels).toContain('Autorisations modifiées');
      expect(labels).toContain('Connexion échouée');
      expect(labels).not.toContain('Mot de passe changé');
      expect(labels).not.toContain('Compte modifié');

      await read('period=1y');
      expect(
        await db.auditLog.count({
          where: { action: 'AUDIT_VIEW', userId: admin.id },
        }),
      ).toBe(1);

      await authenticate(root);
      const forRoot = await read('period=1y&type=security');
      const password = forRoot.body.data.events.find(
        (event) => event.label === 'Mot de passe changé',
      );
      expect(password).toMatchObject({ ip: '192.0.2.10', ipMasked: false });
      expect(
        forRoot.body.data.events.every(
          (event) => event.typeLabel === 'Sécurité',
        ),
      ).toBe(true);
    });

    it('filters by failures, by account and by a case-insensitive name', async () => {
      await authenticate(admin);
      const failures = await read('show=failures');
      expect(failures.body.data.events.map((event) => event.label)).toEqual([
        'Connexion échouée',
      ]);

      const account = await read(`user=${member.id}&period=1y`);
      expect(account.body.data.focusLabel).toBe('Cible Journal');
      expect(
        account.body.data.events.every(
          (event) => event.target?.id === member.id,
        ),
      ).toBe(true);

      const search = await read('search=CIBLE');
      expect(search.body.data.pagination.total).toBe(2);
    });
  },
);
