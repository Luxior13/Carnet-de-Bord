import { readFileSync } from 'node:fs';
import { Prisma, PrismaClient } from '@prisma/client';
import { describe, expect, it } from 'vitest';

const target = process.env.PERSON_DETAIL_TEST_DATABASE_URL;
describe.skipIf(!target)(
  'current permissions data migration on PostgreSQL',
  () => {
    it('preserves effective rights, explicit choices and root/deleted rows, and is idempotent', async () => {
      if (!target) throw new Error('Isolated test database required');
      const url = new URL(target);
      if (
        !['127.0.0.1', 'localhost'].includes(url.hostname) ||
        url.pathname !== '/person_detail_service_test'
      )
        throw new Error('Isolated test database required');
      const db = new PrismaClient({ datasourceUrl: url.toString() });
      const sql = readFileSync(
        '../../packages/database/prisma/migrations/20261015190000_current_site_permissions/migration.sql',
        'utf8',
      );
      const update = sql.slice(
        sql.indexOf('WITH current_access'),
        sql.indexOf('COMMIT;'),
      );
      try {
        await db.$transaction(async (tx) => {
          // A transaction-local shadow table protects the actual application tables.
          await tx.$executeRaw`CREATE TEMP TABLE "User" ("id" text PRIMARY KEY, "role" text, "permissions" jsonb, "updatedAt" timestamp, "isProtected" boolean DEFAULT false, "deletedAt" timestamp) ON COMMIT DROP`;
          const cases = [
            {
              id: 'admin',
              role: 'ADMIN',
              permissions: null,
              view: true,
              update: true,
            },
            {
              id: 'user',
              role: 'USER',
              permissions: null,
              view: false,
              update: false,
            },
            {
              id: 'reader',
              role: 'USER',
              permissions: { 'persons:view': true },
              view: true,
              update: false,
            },
            {
              id: 'editor',
              role: 'USER',
              permissions: {
                'persons:view': true,
                'persons:update': true,
                'audit:view': true,
              },
              view: true,
              update: true,
            },
            {
              id: 'denied-admin',
              role: 'ADMIN',
              permissions: { 'persons:update': false },
              view: true,
              update: false,
            },
            {
              id: 'no-view',
              role: 'ADMIN',
              permissions: { 'persons:view': false },
              view: false,
              update: false,
            },
            {
              id: 'explicit',
              role: 'ADMIN',
              permissions: {
                'persons:view_contact': false,
                'persons:update_contact': false,
              },
              view: false,
              update: false,
            },
            {
              id: 'invalid-json',
              role: 'USER',
              permissions: [],
              view: false,
              update: false,
            },
          ];
          for (const row of cases)
            await tx.$executeRaw(
              Prisma.sql`INSERT INTO "User" ("id", "role", "permissions") VALUES (${row.id}, ${row.role}, ${JSON.stringify(row.permissions)}::jsonb)`,
            );
          await tx.$executeRaw`INSERT INTO "User" ("id", "role", "permissions", "isProtected", "deletedAt") VALUES ('root', 'ADMIN', NULL, true, NULL), ('deleted', 'USER', NULL, false, CURRENT_TIMESTAMP)`;
          await tx.$executeRawUnsafe(update);
          const first = await tx.$queryRaw<
            Array<{
              id: string;
              permissions: Record<string, boolean> | null;
              updatedAt: Date | null;
            }>
          >`SELECT "id", "permissions", "updatedAt" FROM "User" ORDER BY "id"`;
          for (const row of cases) {
            const actual = first.find(
              (entry) => entry.id === row.id,
            )?.permissions;
            expect(actual?.['persons:view_contact'], row.id).toBe(row.view);
            expect(actual?.['persons:update_contact'], row.id).toBe(row.update);
            expect(actual).not.toHaveProperty('audit:view');
          }
          expect(
            first.find((entry) => entry.id === 'root')?.permissions,
          ).toBeNull();
          expect(
            first.find((entry) => entry.id === 'deleted')?.permissions,
          ).toBeNull();
          await tx.$executeRawUnsafe(update);
          expect(
            await tx.$queryRaw`SELECT "id", "permissions", "updatedAt" FROM "User" ORDER BY "id"`,
          ).toEqual(first);
        });
      } finally {
        await db.$disconnect();
      }
    });
  },
);
