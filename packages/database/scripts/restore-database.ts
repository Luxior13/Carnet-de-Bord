import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, realpath, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

import { PrismaClient } from '@prisma/client';

import { DATABASE_BACKUP_FORMAT_VERSION } from './database-backup';
import { getPublicTables } from './database-tools';

const RESTORE_CONFIRMATION = 'RESTORE-INTO-EMPTY-DATABASE';
const MAX_BACKUP_BYTES = 2 * 1024 * 1024 * 1024;

type BackupDocument = Record<string, unknown> & {
  formatVersion: number;
};

const RESTORE_TABLES = [
  ['users', 'User'],
  ['loginNameReservations', 'LoginNameReservation'],
  ['sessions', 'Session'],
  ['totpCredentials', 'TotpCredential'],
  ['totpEnrollments', 'TotpEnrollment'],
  ['mfaRecoveryCodes', 'MfaRecoveryCode'],
  ['mfaLoginChallenges', 'MfaLoginChallenge'],
  ['notifications', 'Notification'],
  ['notificationRecipients', 'NotificationRecipient'],
  ['systemSettings', 'SystemSetting'],
  ['auditLogs', 'AuditLog'],
  ['backgroundJobs', 'BackgroundJob'],
  ['rateLimits', 'RateLimit'],
  ['staffProfiles', 'ArchivedStaffProfile'],
] as const;

const quoteIdentifier = (identifier: string): string => {
  if (!/^[A-Za-z][A-Za-z0-9]*$/u.test(identifier)) {
    throw new Error(`Invalid database identifier: ${identifier}`);
  }

  return `"${identifier}"`;
};

const getArgument = (name: string): string | null => {
  const prefix = `--${name}=`;
  const argument = process.argv
    .slice(2)
    .find((value) => value.startsWith(prefix));

  return argument?.slice(prefix.length) ?? null;
};

const hashFile = async (filePath: string): Promise<string> => {
  const hash = createHash('sha256');
  // The path was resolved and validated before this function is called.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  for await (const chunk of createReadStream(filePath)) {
    hash.update(chunk as Buffer);
  }

  return hash.digest('hex');
};

const validateBackup = (value: unknown): BackupDocument => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Backup root must be a JSON object');
  }
  const backup = value as BackupDocument;
  if (backup.formatVersion !== DATABASE_BACKUP_FORMAT_VERSION) {
    throw new Error(
      `Unsupported backup format ${String(backup.formatVersion)}; expected ${DATABASE_BACKUP_FORMAT_VERSION}`,
    );
  }
  for (const [property] of RESTORE_TABLES) {
    // Property names come from the closed static restore manifest.
    // eslint-disable-next-line security/detect-object-injection
    if (!Array.isArray(backup[property])) {
      throw new Error(`Backup property ${property} must be an array`);
    }
  }

  return backup;
};

const requestedPath = getArgument('file');
if (!requestedPath) throw new Error('--file=<backup.json> is required');
// This administrative path is explicitly provided by the operator and is
// validated as a regular bounded file before any content is consumed.
// eslint-disable-next-line security/detect-non-literal-fs-filename
const filePath = await realpath(resolve(requestedPath));
// eslint-disable-next-line security/detect-non-literal-fs-filename
const fileStats = await stat(filePath);
if (!fileStats.isFile() || fileStats.size <= 0) {
  throw new Error('Backup path must reference a non-empty regular file');
}
if (fileStats.size > MAX_BACKUP_BYTES) {
  throw new Error('Backup exceeds the safe restore size limit');
}

const checksumPath = `${filePath}.sha256`;
// The checksum path is derived from the validated backup path.
// eslint-disable-next-line security/detect-non-literal-fs-filename
const checksumDocument = await readFile(checksumPath, 'utf8');
const expectedChecksum = checksumDocument.trim().split(/\s+/u)[0];
if (!expectedChecksum || !/^[a-f0-9]{64}$/u.test(expectedChecksum)) {
  throw new Error('Backup checksum file is invalid');
}
const actualChecksum = await hashFile(filePath);
if (actualChecksum !== expectedChecksum) {
  throw new Error('Backup checksum mismatch');
}

// Restore is an offline maintenance operation. A bounded document size and a
// verified checksum are required before parsing the snapshot.
// eslint-disable-next-line security/detect-non-literal-fs-filename
const backup = validateBackup(JSON.parse(await readFile(filePath, 'utf8')));
const prisma = new PrismaClient();

try {
  const publicTables = await getPublicTables(prisma);
  for (const [, tableName] of RESTORE_TABLES) {
    if (!publicTables.has(tableName)) {
      throw new Error(`Target schema is missing table ${tableName}`);
    }
  }

  const nonEmptyTables: string[] = [];
  for (const [, tableName] of RESTORE_TABLES) {
    const table = quoteIdentifier(tableName);
    const rows = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
      `SELECT COUNT(*)::bigint AS "count" FROM "public".${table}`,
    );
    if ((rows[0]?.count ?? 0n) > 0n) nonEmptyTables.push(tableName);
  }
  if (nonEmptyTables.length > 0) {
    throw new Error(
      `Restore target is not empty: ${nonEmptyTables.join(', ')}`,
    );
  }

  const counts = Object.fromEntries(
    RESTORE_TABLES.map(([property, tableName]) => [
      tableName,
      // Property names come from the closed static restore manifest.
      // eslint-disable-next-line security/detect-object-injection
      (backup[property] as unknown[]).length,
    ]),
  );
  if (process.argv.includes('--dry-run')) {
    process.stdout.write(
      `Backup verified; empty target confirmed.\n${JSON.stringify(counts)}\n`,
    );
    process.exitCode = 0;
  } else {
    if (getArgument('confirm-empty-restore') !== RESTORE_CONFIRMATION) {
      throw new Error(
        `Refusing restore without --confirm-empty-restore=${RESTORE_CONFIRMATION}`,
      );
    }

    await prisma.$transaction(
      async (transaction) => {
        for (const [property, tableName] of RESTORE_TABLES) {
          // Property names and SQL identifiers come from the closed manifest.
          // eslint-disable-next-line security/detect-object-injection
          const rows = backup[property] as unknown[];
          if (rows.length === 0) continue;
          const table = quoteIdentifier(tableName);
          await transaction.$executeRawUnsafe(
            `INSERT INTO "public".${table}
             SELECT * FROM jsonb_populate_recordset(NULL::"public".${table}, $1::jsonb)`,
            JSON.stringify(rows),
          );
        }

        const rootRows = await transaction.$queryRaw<
          { count: bigint }[]
        >`SELECT COUNT(*)::bigint AS "count"
          FROM "User"
          WHERE "isProtected" = true
            AND "role" = 'ADMIN'::"UserRole"
            AND "isActive" = true
            AND "deletedAt" IS NULL`;
        if (rootRows[0]?.count !== 1n) {
          throw new Error(
            'Restored data does not contain exactly one valid root',
          );
        }
      },
      { isolationLevel: 'Serializable', timeout: 6 * 60 * 60 * 1_000 },
    );
    process.stdout.write(
      `Database restored and verified.\n${JSON.stringify(counts)}\n`,
    );
  }
} finally {
  await prisma.$disconnect();
}
