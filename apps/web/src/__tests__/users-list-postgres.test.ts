import { randomUUID } from 'node:crypto';

import { Prisma, PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildUserSearchQuery } from '$features/users/server/users-list-search';

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
    await db.$executeRaw`CREATE TABLE "User" ("id" text PRIMARY KEY, "loginName" text, "firstName" text, "lastName" text, "contactEmail" text, "isProtected" boolean DEFAULT false, "deletedAt" timestamp)`;
    await db.$executeRaw`INSERT INTO "User" ("id", "loginName", "firstName", "lastName", "contactEmail", "isProtected", "deletedAt") VALUES
      ('elodie', 'emartin', 'Élodie', 'Martin', 'only-contact@example.test', false, null),
      ('compound', 'jdp', 'Jean Pierre', 'Du Pont', null, false, null),
      ('root', 'private.root', 'Secret', 'Person', 'hidden-root@example.test', true, null),
      ('deleted', 'old', 'Élodie', 'Martin', null, false, timestamp '2026-01-01'),
      ('literal', 'literal', '100%_test', 'Backslash', null, false, null)`;
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
    expect(await find('Secret Person', true, true)).toEqual(['root']);
  });
});
