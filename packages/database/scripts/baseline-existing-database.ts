import { resolve } from 'node:path';

import { PrismaClient } from '@prisma/client';

import { createDatabaseBackup } from './database-backup';
import {
  databaseRoot,
  getAppliedMigrations,
  getPublicTables,
  prismaSchemaPath,
  runPrisma,
} from './database-tools';
import {
  BASELINED_MIGRATIONS,
  DATABASE_BASELINE_CONFIRMATION,
  RECONCILIATION_MIGRATION,
} from './migration-baseline';

const prisma = new PrismaClient();
const confirmationArgument = process.argv
  .find((argument) => argument.startsWith('--confirm='))
  ?.slice('--confirm='.length);

try {
  if (
    (process.env.CONFIRM_DATABASE_BASELINE ?? confirmationArgument) !==
    DATABASE_BASELINE_CONFIRMATION
  ) {
    throw new Error(
      `Refusing to baseline. Set CONFIRM_DATABASE_BASELINE=${DATABASE_BASELINE_CONFIRMATION} after reviewing the target database.`,
    );
  }

  const tables = await getPublicTables(prisma);
  const requiredTables = ['AuditLog', 'RateLimit', 'Session', 'User'];
  const missingTables = requiredTables.filter((table) => !tables.has(table));

  if (missingTables.length > 0) {
    throw new Error(
      `This command only supports the existing users-only database. Missing tables: ${missingTables.join(', ')}`,
    );
  }

  const appliedMigrations = await getAppliedMigrations(prisma);
  const supportedNames = new Set<string>(BASELINED_MIGRATIONS);
  const unknownMigrations = appliedMigrations.filter(
    (migration) => !supportedNames.has(migration.migration_name),
  );
  const failedMigrations = appliedMigrations.filter(
    (migration) => !migration.finished_at && !migration.rolled_back_at,
  );

  if (unknownMigrations.length > 0) {
    throw new Error(
      `Unknown migration history detected: ${unknownMigrations.map((migration) => migration.migration_name).join(', ')}`,
    );
  }
  if (failedMigrations.length > 0) {
    throw new Error(
      `Failed migration records must be resolved first: ${failedMigrations.map((migration) => migration.migration_name).join(', ')}`,
    );
  }

  const backup = await createDatabaseBackup(prisma);
  process.stdout.write(`Verified backup: ${backup.filePath}\n`);

  const reconciliationSqlPath = resolve(
    databaseRoot,
    'prisma',
    'migrations',
    RECONCILIATION_MIGRATION,
    'migration.sql',
  );

  runPrisma([
    'db',
    'execute',
    '--file',
    reconciliationSqlPath,
    '--schema',
    prismaSchemaPath,
  ]);

  const appliedNames = new Set(
    appliedMigrations
      .filter((migration) => migration.finished_at)
      .map((migration) => migration.migration_name),
  );

  for (const migration of BASELINED_MIGRATIONS) {
    if (appliedNames.has(migration)) continue;

    runPrisma([
      'migrate',
      'resolve',
      '--applied',
      migration,
      '--schema',
      prismaSchemaPath,
    ]);
  }

  runPrisma(['migrate', 'status', '--schema', prismaSchemaPath]);
  process.stdout.write('Database migration baseline completed safely.\n');
} finally {
  await prisma.$disconnect();
}
