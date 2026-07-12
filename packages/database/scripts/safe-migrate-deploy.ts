import { PrismaClient } from '@prisma/client';

import {
  getAppliedMigrations,
  getPublicTables,
  prismaSchemaPath,
  runPrisma,
} from './database-tools';

const prisma = new PrismaClient();

try {
  const tables = await getPublicTables(prisma);
  const appliedMigrations = await getAppliedMigrations(prisma);
  const applicationTables = ['AuditLog', 'RateLimit', 'Session', 'User'];
  const hasExistingApplicationSchema = applicationTables.some((table) =>
    tables.has(table),
  );

  if (hasExistingApplicationSchema && appliedMigrations.length === 0) {
    throw new Error(
      'Refusing prisma migrate deploy on an unmanaged existing database. Run db:migrate:baseline after creating and verifying a backup.',
    );
  }

  runPrisma(['migrate', 'deploy', '--schema', prismaSchemaPath]);
} finally {
  await prisma.$disconnect();
}
