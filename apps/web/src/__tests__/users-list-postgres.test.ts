import { randomUUID } from 'node:crypto';

import { Prisma, PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  listUsers,
  type UserListInput,
} from '$features/users/server/users-list.service';
import { buildUserSearchQuery } from '$features/users/server/users-list-search';

const listDb = vi.hoisted(() => ({ $queryRaw: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('$server/prisma', () => ({ prisma: listDb }));

// Explicit local disposable database only. Never fall back to DATABASE_URL.
const target = process.env.USERS_LIST_TEST_DATABASE_URL;
describe.skipIf(!target)('users identity search on PostgreSQL', () => {
  const schema = `users_list_${randomUUID().replaceAll('-', '')}`;
  let admin: PrismaClient;
  let db: PrismaClient;
  let created = false;
  beforeAll(async () => {
    if (!target) throw new Error('Missing isolated users database');
    const url = new URL(target);
    if (
      !['localhost', '127.0.0.1'].includes(url.hostname) ||
      url.pathname !== '/users_list_test'
    )
      throw new Error('A local users_list_test database is required');
    admin = new PrismaClient({ datasourceUrl: target });
    await admin.$executeRaw(
      Prisma.sql`CREATE SCHEMA ${Prisma.raw('"' + schema + '"')}`,
    );
    created = true;
    url.searchParams.set('schema', schema);
    url.searchParams.set('connection_limit', '1');
    db = new PrismaClient({ datasourceUrl: url.toString() });
    listDb.$queryRaw.mockImplementation((query: Prisma.Sql) =>
      db.$queryRaw(query),
    );
    await db.$executeRaw`CREATE TABLE "User" (
      "id" text PRIMARY KEY, "loginName" text, "firstName" text, "lastName" text,
      "contactEmail" text, "isProtected" boolean DEFAULT false, "deletedAt" timestamp,
      "contactEmailVerifiedAt" timestamp, "createdAt" timestamp DEFAULT '2026-03-01',
      "failedLoginAttempts" integer DEFAULT 0, "isActive" boolean DEFAULT true,
      "lastLoginAt" timestamp, "lockedUntil" timestamp, "mfaEnabledAt" timestamp,
      "mustChangePassword" boolean DEFAULT false, "passwordChangedAt" timestamp,
      "role" text DEFAULT 'USER'
    )`;
    await db.$executeRaw`INSERT INTO "User" ("id", "loginName", "firstName", "lastName", "contactEmail", "isProtected", "deletedAt") VALUES
      ('elodie', 'emartin', 'Élodie', 'Martin', 'only-contact@example.test', false, null),
      ('compound', 'jdp', 'Jean Pierre', 'Du Pont', null, false, null),
      ('root', 'private.root', 'Secret', 'Person', 'hidden-root@example.test', true, null),
      ('deleted', 'old', 'Élodie', 'Martin', null, false, timestamp '2026-01-01'),
      ('literal', 'literal', '100%_test', 'Backslash', null, false, null)`;
    await db.$executeRaw`UPDATE "User" SET "role" = 'ADMIN' WHERE "id" IN ('root', 'compound')`;
    await db.$executeRaw`UPDATE "User" SET "isActive" = false, "createdAt" = '2026-02-01' WHERE "id" = 'compound'`;
    await db.$executeRaw`UPDATE "User" SET "mustChangePassword" = true, "lastLoginAt" = '2026-10-10' WHERE "id" = 'elodie'`;
    await db.$executeRaw`UPDATE "User" SET "mustChangePassword" = true, "lastLoginAt" = '2026-10-11', "createdAt" = '2026-01-01' WHERE "id" = 'root'`;
  });
  afterAll(async () => {
    await db?.$disconnect();
    if (created)
      await admin.$executeRaw(
        Prisma.sql`DROP SCHEMA ${Prisma.raw('"' + schema + '"')} CASCADE`,
      );
    await admin?.$disconnect();
  });
  const find = async (
    query: string,
    canViewContact = false,
    isProtected = false,
  ): Promise<string[]> => {
    const rows = await db.$queryRaw<Array<{ id: string }>>(
      buildUserSearchQuery(query, { canViewContact, isProtected }),
    );

    return rows.map((row) => row.id).sort();
  };
  it.each([
    'Élodie Martin',
    'martin ELODIE',
    '  Élo   Mar  ',
    'emartin Martin',
  ])('matches all identity words in any order: %s', async (query) => {
    expect(await find(query)).toEqual(['elodie']);
  });
  it.each(['Jean Pierre Du Pont', 'Pont Jean', 'Pierre Dupont'])(
    'handles compound names without inventing concatenations: %s',
    async (query) => {
      expect(await find(query)).toEqual(
        query === 'Pierre Dupont' ? [] : ['compound'],
      );
    },
  );
  it('requires every word, excludes tombstones and treats LIKE symbols literally', async () => {
    expect(await find('Élodie Hopper')).toEqual([]);
    expect(await find('%')).toEqual(['literal']);
    expect(await find('_')).toEqual(['literal']);
    expect(await find('\\')).toEqual([]);
    expect(await find('old')).toEqual([]);
  });
  it('only searches the complete contact query with permission', async () => {
    expect(await find('only-contact')).toEqual([]);
    expect(await find('only-contact', true)).toEqual(['elodie']);
    expect(await find('Élodie only-contact', true)).toEqual([]);
  });
  it('never reveals a protected identity through words or contact to a delegated viewer', async () => {
    for (const query of [
      'private.root',
      'Secret Person',
      'Person Secret',
      'hidden-root',
    ])
      expect(await find(query, true)).toEqual([]);
    expect(await find('superadmin', true)).toEqual(['root']);
    for (const query of ['racine compte', 'Compte   racine', 'protégé compte'])
      expect(await find(query, true)).toEqual(['root']);
    expect(await find('compte secret', true)).toEqual([]);
    expect(await find('Secret Person', true, true)).toEqual(['root']);
  });

  const page = (
    input: Partial<UserListInput> = {},
    visibility = {},
  ): ReturnType<typeof listUsers> =>
    listUsers(
      {
        limit: 25,
        role: null,
        search: '',
        skip: 0,
        sort: 'name',
        status: null,
        ...input,
      },
      {
        canViewContact: false,
        canViewSecurity: false,
        isProtected: false,
        ...visibility,
      },
    );

  it('returns the global visible statistics with exclusive access categories', async () => {
    const result = await page({ search: 'no-result' });
    expect(result.users).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.stats).toEqual({
      active: 3,
      byRole: { ADMIN: 1, SUPERADMIN: 1, USER: 2 },
      inactive: 1,
      pendingPasswordChange: null,
      total: 4,
    });
  });

  it.each(['name', 'recent', 'created'] as const)(
    'pages deterministically with total preserved and a public root first: %s',
    async (sort) => {
      const ids = [];
      for (let skip = 0; skip < 4; skip++) {
        const result = await page({ limit: 1, skip, sort });
        expect(result.total).toBe(4);
        ids.push(result.users[0]?.id);
      }
      expect(ids[0]).toBe('root');
      expect(new Set(ids).size).toBe(4);
      const empty = await page({ skip: 20, sort });
      expect(empty.total).toBe(4);
      expect(empty.users).toEqual([]);
    },
  );

  it('sorts recent logins before nulls, then creation and stable id for the root viewer', async () => {
    const result = await page({ sort: 'recent' }, { isProtected: true });
    expect(result.users.map((user) => user.id)).toEqual([
      'root',
      'elodie',
      'literal',
      'compound',
    ]);
    expect(result.users[0]?.lastLoginAt).toEqual(
      new Date('2026-10-11T00:00:00.000Z'),
    );
  });

  it.each([
    ['SUPERADMIN', ['root']],
    ['ADMIN', ['compound']],
    ['USER', ['literal', 'elodie']],
  ] as const)('filters the exclusive %s category', async (role, expected) => {
    const result = await page({ role });
    expect(result.users.map((user) => user.id)).toEqual(expected);
    expect(result.total).toBe(expected.length);
  });

  it('scopes password counts and pending results to visible security identities', async () => {
    const delegated = await page(
      { status: 'pending' },
      { canViewSecurity: true },
    );
    expect(delegated.users.map((user) => user.id)).toEqual(['elodie']);
    expect(delegated.stats.pendingPasswordChange).toBe(1);
    const root = await page(
      { status: 'pending' },
      { canViewSecurity: true, isProtected: true },
    );
    expect(root.total).toBe(2);
    expect(root.stats.pendingPasswordChange).toBe(2);
  });

  it.each([null, 'SUPERADMIN'] as const)(
    'never resolves private root login to a delegated viewer, role=%s',
    async (role) => {
      const result = await page({ loginName: 'private.root', role });
      expect(result.total).toBe(0);
      expect(result.users).toEqual([]);
      expect(
        (await page({ loginName: 'private.root', role }, { isProtected: true }))
          .total,
      ).toBe(1);
    },
  );

  it('combines search and filters while treating attempted SQL syntax literally', async () => {
    expect(
      (await page({ role: 'USER', search: 'Élodie Martin', status: 'active' }))
        .total,
    ).toBe(1);
    expect((await page({ role: 'ADMIN', search: 'Élodie Martin' })).total).toBe(
      0,
    );
    expect((await page({ search: "' OR 1=1 --" })).total).toBe(0);
    expect((await page({ search: 'only-contact' })).total).toBe(0);
    expect(
      (await page({ search: 'only-contact' }, { canViewContact: true })).total,
    ).toBe(1);
  });

  it('keeps the search inside SQL beyond the former parameter ceiling', async () => {
    await db.$executeRaw`INSERT INTO "User" ("id", "loginName", "firstName", "lastName")
      SELECT 'bulk-' || n, 'bulk.' || n, 'Volume', 'Fictif'
      FROM generate_series(1, 33000) n`;
    try {
      listDb.$queryRaw.mockClear();
      const result = await page({ search: 'Volume' });
      expect(result.total).toBe(33000);
      expect(result.users).toHaveLength(25);
      expect(listDb.$queryRaw).toHaveBeenCalledTimes(2);
      for (const [query] of listDb.$queryRaw.mock.calls)
        expect((query as Prisma.Sql).values.length).toBeLessThan(20);
    } finally {
      await db.$executeRaw`DELETE FROM "User" WHERE "id" LIKE 'bulk-%'`;
    }
  });
});
