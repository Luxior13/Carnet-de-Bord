import { createHash, randomUUID } from 'node:crypto';

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

const mocks = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('$env', () => ({
  env: {
    MFA_ENCRYPTION_KEY_V1: 'AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE=',
  },
}));
vi.mock('$server/prisma', () => ({
  prisma: { $queryRaw: mocks.query },
}));
vi.mock('$features/persons/server/person-audit', () => ({
  createPersonAudit: vi.fn(),
}));

import { listPersons } from '$features/persons/server/person-list.service';

// Optional real-PostgreSQL regression suite. It never reads DATABASE_URL and
// owns only a unique schema inside this explicitly named local test database.
const target = process.env.PERSONS_LIST_TEST_DATABASE_URL;
describe.skipIf(!target)('directory pagination on PostgreSQL', () => {
  const schema = `repertoire_list_test_${randomUUID().replaceAll('-', '')}`;
  let admin: PrismaClient;
  let db: PrismaClient;
  let schemaCreated = false;

  beforeAll(async () => {
    if (!target) throw new Error('Missing isolated test database URL');
    const url = new URL(target);
    if (
      !['127.0.0.1', 'localhost'].includes(url.hostname) ||
      url.pathname !== '/repertoire_pagination_test'
    ) {
      throw new Error(
        'An isolated local repertoire_pagination_test database is required',
      );
    }
    admin = new PrismaClient({ datasourceUrl: url.toString() });
    await admin.$executeRaw(
      Prisma.sql`CREATE SCHEMA ${Prisma.raw(`"${schema}"`)}`,
    );
    schemaCreated = true;
    url.searchParams.set('schema', schema);
    url.searchParams.set('connection_limit', '1');
    db = new PrismaClient({ datasourceUrl: url.toString() });
    await db.$executeRaw`SET TIME ZONE 'Europe/Paris'`;
    // Minimal schema for the real list query and relation counts; this suite
    // does not replace migration or mutation/integrity tests.
    await db.$executeRaw`CREATE TYPE "PersonStructureStatus" AS ENUM ('IN_STRUCTURE', 'OUTSIDE_STRUCTURE')`;
    await db.$executeRaw`CREATE TABLE "Person" (
      "id" text PRIMARY KEY, "nickname" text, "firstName" text, "lastName" text,
      "normalizedNickname" text, "normalizedFirstName" text, "normalizedLastName" text,
      "sortName" text NOT NULL, "structureStatus" "PersonStructureStatus" NOT NULL,
      "version" integer NOT NULL DEFAULT 1, "createdAt" timestamp(3) NOT NULL,
      "updatedAt" timestamp(3) NOT NULL
    )`;
    await db.$executeRaw`CREATE TABLE "PersonEmail" ("id" text, "personId" text, "normalizedEmail" text)`;
    await db.$executeRaw`CREATE TABLE "PersonPhone" ("id" text, "personId" text, "normalizedPhone" text)`;
    await db.$executeRaw`CREATE TABLE "PersonSocialProfile" ("id" text, "personId" text,
      "normalizedIdentifier" text, "normalizedProfileUrlHash" text, "normalizedProfileUrl" text)`;
    await db.$executeRaw`CREATE TABLE "User" ("id" text PRIMARY KEY, "isProtected" boolean NOT NULL)`;
    await db.$executeRaw`CREATE TABLE "AuditLog" ("id" text, "userId" text, "entityType" text, "entityId" text,
      "createdAt" timestamp(3), "actorDisplayNameSnapshot" text, "actorLoginNameSnapshot" text)`;
    mocks.query.mockImplementation((query: Prisma.Sql) => db.$queryRaw(query));
  });

  afterAll(async () => {
    await db?.$disconnect();
    if (schemaCreated)
      await admin.$executeRaw(
        Prisma.sql`DROP SCHEMA ${Prisma.raw(`"${schema}"`)} CASCADE`,
      );
    await admin?.$disconnect();
  });

  beforeEach(async () => {
    await db.$executeRaw`DELETE FROM "PersonEmail"`;
    await db.$executeRaw`DELETE FROM "PersonPhone"`;
    await db.$executeRaw`DELETE FROM "PersonSocialProfile"`;
    await db.$executeRaw`DELETE FROM "AuditLog"`;
    await db.$executeRaw`DELETE FROM "Person"`;
    await db.$executeRaw`INSERT INTO "Person" ("id", "nickname", "normalizedNickname",
      "sortName", "structureStatus", "createdAt", "updatedAt")
      SELECT 'person-' || lpad(n::text, 3, '0'), 'Membre ' || lpad(n::text, 3, '0'),
        'membre ' || lpad(n::text, 3, '0'), 'membre ' || lpad(n::text, 3, '0'),
        CASE WHEN n % 3 = 0 THEN 'OUTSIDE_STRUCTURE' ELSE 'IN_STRUCTURE' END::"PersonStructureStatus",
        timestamp '2026-01-01' + n * interval '1 second',
        timestamp '2026-01-01' + n * interval '1 second'
      FROM generate_series(1, 60) n`;
  });

  it.each([
    'Élodie Martin',
    'martin ELODIE',
    '  Élo   Mar  ',
    'Phoenix Martin Élodie',
  ])(
    'finds identity words in any order independently of the nickname: %s',
    async (q) => {
      await db.$executeRaw`UPDATE "Person" SET "nickname" = 'Phoenix', "normalizedNickname" = 'phoenix',
        "firstName" = 'Élodie', "normalizedFirstName" = 'elodie',
        "lastName" = 'Martin', "normalizedLastName" = 'martin' WHERE "id" = 'person-001'`;
      const page = await listPersons(
        { limit: 25, q },
        { id: 'reader', isProtected: false, permissions: null, role: 'ADMIN' },
      );
      expect(page.items.map((person) => person.id)).toEqual(['person-001']);
      expect(page.items[0]?.matchedByContact).toBe(false);
    },
  );

  it('requires all words and treats LIKE wildcards as literal input', async () => {
    await db.$executeRaw`UPDATE "Person" SET "normalizedFirstName" = 'ada',
      "normalizedLastName" = 'lovelace' WHERE "id" = 'person-001'`;
    for (const q of ['Ada Hopper', 'Ada %', 'Ada _', 'Ada \\']) {
      expect(
        (
          await listPersons(
            { limit: 25, q },
            {
              id: 'reader',
              isProtected: false,
              permissions: null,
              role: 'ADMIN',
            },
          )
        ).items,
      ).toEqual([]);
    }
  });

  it.each([
    ['https://example.test/Case', 'https://example.test/case'],
    ['élan', 'elan'],
  ])(
    'rejects a cursor when contact search changes from %s to %s',
    async (q, changedQuery) => {
      const profileUrl = q.startsWith('https:') ? q : null;
      const hash = profileUrl
        ? createHash('sha256').update(profileUrl).digest('hex')
        : null;
      await db.$executeRaw`INSERT INTO "PersonSocialProfile"
      ("id", "personId", "normalizedIdentifier", "normalizedProfileUrl", "normalizedProfileUrlHash")
      SELECT 'social-' || "id", "id", ${profileUrl ? null : q}, ${profileUrl}, ${hash}
      FROM "Person"`;
      const first = await listPersons(
        { limit: 25, q },
        { id: 'reader', isProtected: false, permissions: null, role: 'ADMIN' },
      );
      expect(first.pagination.total).toBe(60);
      expect(first.pagination.nextCursor).not.toBeNull();
      expect(
        (
          await listPersons(
            { limit: 25, q: changedQuery },
            {
              id: 'reader',
              isProtected: false,
              permissions: null,
              role: 'ADMIN',
            },
          )
        ).pagination.total,
      ).toBe(0);

      await expect(
        listPersons(
          {
            cursor: first.pagination.nextCursor ?? undefined,
            limit: 25,
            q: changedQuery,
          },
          {
            id: 'reader',
            isProtected: false,
            permissions: null,
            role: 'ADMIN',
          },
        ),
      ).rejects.toThrow('INVALID_CURSOR');
    },
  );

  it('excludes all three contact kinds, combines filters and keeps totals before cursors', async () => {
    await db.$executeRaw`INSERT INTO "PersonEmail" VALUES ('e1', 'person-001', 'member@example.test')`;
    await db.$executeRaw`INSERT INTO "PersonPhone" VALUES ('ph1', 'person-002', '+33600000000')`;
    await db.$executeRaw`INSERT INTO "PersonSocialProfile" ("id", "personId", "normalizedIdentifier")
      VALUES ('sp1', 'person-003', 'member')`;
    const first = await listPersons(
      { contacts: 'missing', limit: 25, q: '' },
      { id: 'reader', isProtected: false, permissions: null, role: 'ADMIN' },
    );
    const next = await listPersons(
      {
        contacts: 'missing',
        cursor: first.pagination.nextCursor ?? undefined,
        limit: 25,
        q: '',
      },
      { id: 'reader', isProtected: false, permissions: null, role: 'ADMIN' },
    );
    expect(first.pagination.total).toBe(57);
    expect(next.pagination.total).toBe(57);
    expect(first.items[0]?.id).toBe('person-004');
    // Faceted: statuses keep the missing-contact filter (person-001 and -002
    // are in the structure, -003 outside); the missing count keeps « Tous ».
    expect(first.overview).toEqual({
      inStructure: 38,
      noContacts: 57,
      outsideStructure: 19,
      total: 57,
    });
    const outside = await listPersons(
      {
        contacts: 'missing',
        limit: 25,
        q: 'Membre',
        structureStatus: 'OUTSIDE_STRUCTURE',
      },
      { id: 'reader', isProtected: false, permissions: null, role: 'ADMIN' },
    );
    expect(outside.pagination.total).toBe(19);
    expect(
      outside.items.every(
        (person) => person.structureStatus === 'OUTSIDE_STRUCTURE',
      ),
    ).toBe(true);
    await expect(
      listPersons(
        {
          cursor: first.pagination.nextCursor ?? undefined,
          limit: 25,
          q: '',
        },
        { id: 'reader', isProtected: false, permissions: null, role: 'ADMIN' },
      ),
    ).rejects.toThrow('INVALID_CURSOR');
  });

  it.each(['name', 'created', 'updated'] as const)(
    'keeps a total of 60 across all pages sorted by %s',
    async (sort) => {
      const ids: string[] = [];
      let cursor: string | undefined;
      for (const size of [25, 25, 10]) {
        const page = await listPersons(
          { cursor, limit: 25, q: '', sort },
          {
            id: 'reader',
            isProtected: false,
            permissions: null,
            role: 'ADMIN',
          },
        );
        expect(page.pagination.total).toBe(60);
        expect(page.items).toHaveLength(size);
        ids.push(...page.items.map((person) => person.id));
        cursor = page.pagination.nextCursor ?? undefined;
      }
      expect(cursor).toBeUndefined();
      expect(new Set(ids).size).toBe(60);
      expect(ids[0]).toBe(sort === 'name' ? 'person-001' : 'person-060');
    },
  );

  it.each(['created', 'updated'] as const)(
    'breaks equal %s timestamps by ID across pages',
    async (sort) => {
      await db.$executeRaw`UPDATE "Person" SET "createdAt" = timestamp '2026-01-01', "updatedAt" = timestamp '2026-01-01'`;
      let cursor: string | undefined;
      const ids: string[] = [];
      for (const size of [25, 25, 10]) {
        const page = await listPersons(
          { cursor, limit: 25, q: '', sort },
          {
            id: 'reader',
            isProtected: false,
            permissions: null,
            role: 'ADMIN',
          },
        );
        expect(page.items).toHaveLength(size);
        ids.push(...page.items.map((person) => person.id));
        cursor = page.pagination.nextCursor ?? undefined;
      }
      expect(new Set(ids).size).toBe(60);
      expect(ids[0]).toBe('person-060');
      expect(ids.at(-1)).toBe('person-001');
    },
  );

  it('does not include a future record through the database timezone offset', async () => {
    const future = new Date(Date.now() + 30 * 60 * 1000);
    await db.$executeRaw`UPDATE "Person" SET
      "createdAt" = (${future} AT TIME ZONE 'UTC'),
      "updatedAt" = (${future} AT TIME ZONE 'UTC') WHERE "id" = 'person-060'`;
    for (const sort of ['name', 'created', 'updated'] as const) {
      const page = await listPersons(
        { limit: 100, q: '', sort },
        { id: 'reader', isProtected: false, permissions: null, role: 'ADMIN' },
      );
      expect(page.pagination.total).toBe(59);
      expect(page.items.some((person) => person.id === 'person-060')).toBe(
        false,
      );
    }
  });

  it('counts only matching status and search terms before the cursor', async () => {
    const request = {
      limit: 7,
      q: 'MEMBRE 0',
      structureStatus: 'OUTSIDE_STRUCTURE' as const,
    };
    const first = await listPersons(request, {
      id: 'reader',
      isProtected: false,
      permissions: null,
      role: 'ADMIN',
    });
    const next = await listPersons(
      {
        ...request,
        cursor: first.pagination.nextCursor ?? undefined,
      },
      { id: 'reader', isProtected: false, permissions: null, role: 'ADMIN' },
    );
    expect(first.pagination.total).toBe(20);
    expect(next.pagination.total).toBe(20);
    expect(
      next.items.every(
        (person) => person.structureStatus === 'OUTSIDE_STRUCTURE',
      ),
    ).toBe(true);
    expect(first.overview.total).toBe(60);
    const narrower = await listPersons(
      { ...request, q: 'membre 00' },
      { id: 'reader', isProtected: false, permissions: null, role: 'ADMIN' },
    );
    expect(narrower.pagination.total).toBe(3);
  });

  it('returns an empty list and zero when nothing matches', async () => {
    const page = await listPersons(
      { limit: 25, q: 'absent' },
      { id: 'reader', isProtected: false, permissions: null, role: 'ADMIN' },
    );
    expect(page.items).toEqual([]);
    expect(page.pagination).toMatchObject({
      hasMore: false,
      nextCursor: null,
      total: 0,
    });
  });

  it('finds contact matches without returning contact values and resolves the latest author stably', async () => {
    const email = 'private-contact@example.test';
    await db.$executeRaw`INSERT INTO "PersonEmail" VALUES ('e1', 'person-001', ${email})`;
    await db.$executeRaw`INSERT INTO "AuditLog" ("id", "entityType", "entityId", "createdAt", "actorDisplayNameSnapshot", "actorLoginNameSnapshot") VALUES
      ('audit-a', 'PERSON', 'person-001', timestamp '2026-01-02', 'Premier auteur', 'first.test'),
      ('audit-z', 'PERSON', 'person-001', timestamp '2026-01-02', 'Dernier auteur', 'last.test'),
      ('audit-other', 'USER', 'person-001', timestamp '2026-02-01', 'Autre ressource', 'other.test')`;

    const page = await listPersons(
      { limit: 25, q: email },
      { id: 'reader', isProtected: false, permissions: null, role: 'ADMIN' },
    );
    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toMatchObject({
      contactCounts: { emails: 1, phones: 0, socialProfiles: 0 },
      id: 'person-001',
      lastModifiedBy: { displayName: 'Dernier auteur', loginName: 'last.test' },
      matchedByContact: true,
    });
    expect(JSON.stringify(page)).not.toContain(email);
    for (const key of [
      'emails',
      'phones',
      'socialProfiles',
      'birthDate',
      'normalizedNickname',
      'sortName',
    ]) {
      expect(page.items[0]).not.toHaveProperty(key);
    }
    expect(
      (
        await listPersons(
          { limit: 25, q: 'Membre 002' },
          {
            id: 'reader',
            isProtected: false,
            permissions: null,
            role: 'ADMIN',
          },
        )
      ).items[0]?.lastModifiedBy,
    ).toBeNull();
  });

  it('preserves the remaining filtered total even if the cursor page becomes empty', async () => {
    const first = await listPersons(
      { limit: 25, q: '' },
      { id: 'reader', isProtected: false, permissions: null, role: 'ADMIN' },
    );
    await db.$executeRaw`DELETE FROM "Person" WHERE "id" > 'person-025'`;
    const next = await listPersons(
      {
        cursor: first.pagination.nextCursor ?? undefined,
        limit: 25,
        q: '',
      },
      { id: 'reader', isProtected: false, permissions: null, role: 'ADMIN' },
    );
    expect(next.items).toEqual([]);
    expect(next.pagination).toMatchObject({
      hasMore: false,
      nextCursor: null,
      total: 25,
    });
  });
});
