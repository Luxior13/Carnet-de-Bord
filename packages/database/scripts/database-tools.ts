import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

import type { PrismaClient } from '@prisma/client';

type DatabaseQueryClient = Pick<PrismaClient, '$queryRaw' | '$queryRawUnsafe'>;

export const databaseRoot = resolve(import.meta.dirname, '..');
export const prismaSchemaPath = resolve(
  databaseRoot,
  'prisma',
  'schema.prisma',
);

type MigrationRecord = {
  finished_at: Date | null;
  migration_name: string;
  rolled_back_at: Date | null;
};

type RelationName = {
  relation_name: string | null;
};

type TableName = {
  table_name: string;
};

export async function getPublicTables(
  prisma: DatabaseQueryClient,
): Promise<Set<string>> {
  const rows = await prisma.$queryRaw<TableName[]>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
  `;

  return new Set(rows.map((row) => row.table_name));
}

export async function getAppliedMigrations(
  prisma: DatabaseQueryClient,
): Promise<MigrationRecord[]> {
  const relation = await prisma.$queryRaw<RelationName[]>`
    SELECT to_regclass('public."_prisma_migrations"')::text AS relation_name
  `;

  if (!relation[0]?.relation_name) return [];

  return prisma.$queryRawUnsafe<MigrationRecord[]>(
    `SELECT "migration_name", "finished_at", "rolled_back_at"
     FROM "public"."_prisma_migrations"
     ORDER BY "started_at" ASC`,
  );
}

export function runPrisma(args: readonly string[]): void {
  const result = spawnSync(process.execPath, ['x', 'prisma', ...args], {
    cwd: databaseRoot,
    env: process.env,
    stdio: 'inherit',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `Prisma command failed with exit code ${String(result.status)}`,
    );
  }
}
