import { PrismaClient } from '@prisma/client';

import { createDatabaseBackup } from './database-backup';

const prisma = new PrismaClient();

try {
  const backup = await createDatabaseBackup(prisma);

  process.stdout.write(
    `Database backup created at ${backup.filePath}\nChecksum: ${backup.sha256}\nChecksum file: ${backup.checksumPath}\n${JSON.stringify(backup.counts)}\n`,
  );
} finally {
  await prisma.$disconnect();
}
