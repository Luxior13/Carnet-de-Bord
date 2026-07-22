import { constants } from 'node:fs';
import { type FileHandle, lstat, open } from 'node:fs/promises';
import { resolve } from 'node:path';

import { PrismaClient } from '@prisma/client';

import {
  type BackupFormatExpectation,
  type BackupManifest,
  type BackupStreamSummary,
  type BackupTableProperty,
  DATABASE_BACKUP_BATCH_SIZE,
  DATABASE_BACKUP_TABLES,
  MAX_DATABASE_BACKUP_BYTES,
  MAX_RESTORE_BATCH_BYTES,
  tableDefinitionByProperty,
} from './database-backup-format';
import {
  type DatabaseBackupSignatureEnvelope,
  MAX_DATABASE_BACKUP_SIGNATURE_BYTES,
  verifyDatabaseBackupSignature,
} from './database-backup-signature';
import {
  type BackupStreamDigest,
  readAndValidateBackupStreamWithDigest,
  validateRestoreEnvironment,
} from './database-restore-support';
import { getPublicTables } from './database-tools';

const RESTORE_CONFIRMATION = 'RESTORE-INTO-EMPTY-DATABASE';
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const READ_ONLY_NOFOLLOW_FLAGS =
  constants.O_RDONLY |
  (typeof constants.O_NOFOLLOW === 'number' ? constants.O_NOFOLLOW : 0);

type RestoreQueryClient = Pick<
  PrismaClient,
  '$executeRawUnsafe' | '$queryRaw' | '$queryRawUnsafe'
>;

const quoteIdentifier = (identifier: string): string => {
  if (!/^[A-Za-z][A-Za-z0-9]*$/u.test(identifier)) {
    throw new Error(`Invalid database identifier: ${identifier}`);
  }

  return `"${identifier}"`;
};

const getArgument = (name: string): string | null => {
  const prefix = `--${name}=`;
  const argumentsForName = process.argv
    .slice(2)
    .filter((value) => value.startsWith(prefix));
  if (argumentsForName.length > 1) {
    throw new Error(`--${name} must not be provided more than once`);
  }
  const argument = argumentsForName[0];

  return argument?.slice(prefix.length) ?? null;
};

const openBoundedRegularFile = async (
  filePath: string,
  maximumBytes: number,
  context: string,
): Promise<FileHandle> => {
  let pathStats;
  try {
    // Administrative paths and their derived sidecars are checked without
    // following a final symbolic link.
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    pathStats = await lstat(filePath);
  } catch {
    throw new Error(`${context} path does not exist`);
  }
  if (
    !pathStats.isFile() ||
    pathStats.size <= 0 ||
    pathStats.size > maximumBytes
  ) {
    throw new Error(`${context} path must be a bounded regular file`);
  }

  let handle: FileHandle | null = null;
  try {
    // O_NOFOLLOW closes the lstat/open race on platforms that expose it. The
    // fstat identity check also rejects ordinary replacement races.
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    handle = await open(filePath, READ_ONLY_NOFOLLOW_FLAGS);
    const openedStats = await handle.stat();
    if (
      !openedStats.isFile() ||
      openedStats.size <= 0 ||
      openedStats.size > maximumBytes ||
      openedStats.dev !== pathStats.dev ||
      openedStats.ino !== pathStats.ino
    ) {
      throw new Error(`${context} changed while it was being opened`);
    }

    return handle;
  } catch (error) {
    await handle?.close().catch(() => undefined);
    throw error;
  }
};

const readOptionalSignatureDocument = async (
  signaturePath: string,
): Promise<unknown | null> => {
  try {
    // Distinguish an absent sidecar for a precise refusal message. A symlink,
    // directory, oversized file or invalid document still fails immediately.
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    await lstat(signaturePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }

  const handle = await openBoundedRegularFile(
    signaturePath,
    MAX_DATABASE_BACKUP_SIGNATURE_BYTES,
    'Backup signature',
  );
  try {
    return JSON.parse(await handle.readFile({ encoding: 'utf8' })) as unknown;
  } catch (error) {
    throw new Error('Backup signature file is not valid JSON', {
      cause: error,
    });
  } finally {
    await handle.close();
  }
};

const getTableCount = async (
  prisma: RestoreQueryClient,
  tableName: string,
): Promise<bigint> => {
  const table = quoteIdentifier(tableName);
  const rows = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*)::bigint AS "count" FROM "public".${table}`,
  );

  return rows[0]?.count ?? 0n;
};

const assertRestoreTargetIsEmpty = async (
  prisma: RestoreQueryClient,
): Promise<void> => {
  const nonEmptyTables: string[] = [];
  for (const { tableName } of DATABASE_BACKUP_TABLES) {
    if ((await getTableCount(prisma, tableName)) > 0n) {
      nonEmptyTables.push(tableName);
    }
  }
  if (nonEmptyTables.length > 0) {
    throw new Error(
      `Restore target is not empty: ${nonEmptyTables.join(', ')}`,
    );
  }
};

const lockRestoreTables = async (prisma: RestoreQueryClient): Promise<void> => {
  const tables = DATABASE_BACKUP_TABLES.map(
    ({ tableName }) => `"public".${quoteIdentifier(tableName)}`,
  ).join(', ');

  // All identifiers come from the closed static manifest. ACCESS EXCLUSIVE
  // prevents a concurrent application write from racing the in-transaction
  // empty-target check or any subsequent batch.
  await prisma.$executeRawUnsafe(
    `LOCK TABLE ${tables} IN ACCESS EXCLUSIVE MODE`,
  );
};

const toTableCounts = (summary: BackupStreamSummary): Record<string, number> =>
  Object.fromEntries(
    DATABASE_BACKUP_TABLES.map(({ property, tableName }) => [
      tableName,
      // Property names come from the closed static table contract.
      // eslint-disable-next-line security/detect-object-injection
      summary.counts[property],
    ]),
  );

const insertBatch = async (
  prisma: RestoreQueryClient,
  property: BackupTableProperty,
  rows: readonly Record<string, unknown>[],
): Promise<void> => {
  if (rows.length === 0) return;
  const definition = tableDefinitionByProperty(property);
  const table = quoteIdentifier(definition.tableName);

  await prisma.$executeRawUnsafe(
    `INSERT INTO "public".${table}
     SELECT * FROM jsonb_populate_recordset(NULL::"public".${table}, $1::jsonb)`,
    JSON.stringify(rows),
  );
};

const restoreStream = async (
  prisma: RestoreQueryClient,
  backupFile: FileHandle,
  formatExpectation: BackupFormatExpectation,
): Promise<BackupStreamDigest> => {
  let bufferedProperty: BackupTableProperty | null = null;
  let bufferedRows: Record<string, unknown>[] = [];
  let bufferedBytes = 2;

  const flush = async (): Promise<void> => {
    if (bufferedProperty === null || bufferedRows.length === 0) return;
    await insertBatch(prisma, bufferedProperty, bufferedRows);
    bufferedRows = [];
    bufferedBytes = 2;
  };

  const artifact = await readAndValidateBackupStreamWithDigest(
    backupFile,
    async (record) => {
      if (record.type === 'row') {
        if (bufferedProperty !== null && bufferedProperty !== record.property) {
          throw new Error('Restore batch crossed a table boundary');
        }
        bufferedProperty = record.property;
        const rowBytes =
          Buffer.byteLength(JSON.stringify(record.value), 'utf8') + 1;
        if (
          bufferedRows.length > 0 &&
          (bufferedRows.length === DATABASE_BACKUP_BATCH_SIZE ||
            bufferedBytes + rowBytes > MAX_RESTORE_BATCH_BYTES)
        ) {
          await flush();
        }
        bufferedRows.push(record.value);
        bufferedBytes += rowBytes;
      } else if (record.type === 'tableEnd') {
        if (bufferedProperty !== null && bufferedProperty !== record.property) {
          throw new Error('Restore table boundary does not match its batch');
        }
        await flush();
        bufferedProperty = null;
      }
    },
    formatExpectation,
  );
  await flush();

  return artifact;
};

const assertRestoredCounts = async (
  prisma: RestoreQueryClient,
  summary: BackupStreamSummary,
): Promise<void> => {
  for (const { property, tableName } of DATABASE_BACKUP_TABLES) {
    const actual = await getTableCount(prisma, tableName);
    // Property names come from the closed static table contract.
    // eslint-disable-next-line security/detect-object-injection
    const expected = BigInt(summary.counts[property]);
    if (actual !== expected) {
      throw new Error(
        `Restored row count mismatch for ${tableName}: expected ${String(expected)}, received ${String(actual)}`,
      );
    }
  }
};

const requestedPath = getArgument('file');
if (!requestedPath) throw new Error('--file=<backup.jsonl> is required');
// This administrative path is explicitly provided by the operator and is
// validated as a regular bounded file before any content is consumed.
const filePath = resolve(requestedPath);
const backupFile = await openBoundedRegularFile(
  filePath,
  MAX_DATABASE_BACKUP_BYTES,
  'Backup',
);

try {
  const checksumPath = `${filePath}.sha256`;
  const checksumFile = await openBoundedRegularFile(
    checksumPath,
    4_096,
    'Backup checksum',
  );
  let checksumDocument: string;
  try {
    checksumDocument = await checksumFile.readFile({ encoding: 'utf8' });
  } finally {
    await checksumFile.close();
  }
  const expectedChecksum = checksumDocument.trim().split(/\s+/u)[0];
  if (!expectedChecksum || !SHA256_PATTERN.test(expectedChecksum)) {
    throw new Error('Backup checksum file is invalid');
  }

  const requestedExpectedChecksum = getArgument('expected-sha256');
  if (
    requestedExpectedChecksum !== null &&
    !SHA256_PATTERN.test(requestedExpectedChecksum)
  ) {
    throw new Error('--expected-sha256 must be lowercase SHA-256 hexadecimal');
  }
  const signaturePath = `${filePath}.signature.json`;
  const signatureDocument = await readOptionalSignatureDocument(signaturePath);
  if (signatureDocument === null) {
    throw new Error('Backup signature is missing');
  }
  const formatExpectation: BackupFormatExpectation = 'current-signed';

  // Pass one validates the complete closed stream, its authenticated sidecar and
  // all required external secrets before Prisma is instantiated. It performs no
  // database connection or write.
  const verifiedArtifact = await readAndValidateBackupStreamWithDigest(
    backupFile,
    undefined,
    formatExpectation,
  );
  const { sha256: actualChecksum, sizeBytes: backupSizeBytes } =
    verifiedArtifact;
  const verifiedSummary = verifiedArtifact.summary;
  if (actualChecksum !== expectedChecksum) {
    throw new Error('Backup checksum mismatch');
  }
  if (
    requestedExpectedChecksum !== null &&
    requestedExpectedChecksum !== actualChecksum
  ) {
    throw new Error('Backup does not match --expected-sha256');
  }
  const signedManifest: BackupManifest = verifiedSummary.manifest;
  const verifiedSignature: DatabaseBackupSignatureEnvelope =
    verifyDatabaseBackupSignature(
      signatureDocument,
      {
        backupSizeBytes,
        counts: verifiedSummary.counts,
        manifest: signedManifest,
        sha256: actualChecksum,
      },
      process.env,
    );

  const requestedExpectedBackupId = getArgument('expected-backup-id');
  if (
    requestedExpectedBackupId !== null &&
    !UUID_V4_PATTERN.test(requestedExpectedBackupId)
  ) {
    throw new Error('--expected-backup-id must be a lowercase UUID v4');
  }
  if (requestedExpectedBackupId !== null) {
    if (verifiedSignature.backupId !== requestedExpectedBackupId) {
      throw new Error('Backup does not match --expected-backup-id');
    }
  }

  validateRestoreEnvironment(verifiedSummary.manifest);
  const prisma = new PrismaClient();

  try {
    const publicTables = await getPublicTables(prisma);
    for (const { tableName } of DATABASE_BACKUP_TABLES) {
      if (!publicTables.has(tableName)) {
        throw new Error(`Target schema is missing table ${tableName}`);
      }
    }
    await assertRestoreTargetIsEmpty(prisma);

    const counts = toTableCounts(verifiedSummary);
    if (process.argv.includes('--dry-run')) {
      process.stdout.write(
        `Backup verified; required keys present; empty target confirmed.\n${JSON.stringify(
          {
            authenticatedBackupSigningKeyVersion:
              verifiedSignature.signingKeyVersion,
            backupId: verifiedSignature.backupId,
            counts,
          },
        )}\n`,
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
          await lockRestoreTables(transaction);
          await assertRestoreTargetIsEmpty(transaction);
          const restoredArtifact = await restoreStream(
            transaction,
            backupFile,
            formatExpectation,
          );
          const restoredSummary = restoredArtifact.summary;
          if (
            JSON.stringify(restoredSummary) !== JSON.stringify(verifiedSummary)
          ) {
            throw new Error(
              'Backup changed between validation and restoration',
            );
          }
          // This digest covers the exact bytes parsed into the rows above, rather
          // than a later re-open of a path an attacker could swap back.
          if (
            restoredArtifact.sha256 !== actualChecksum ||
            restoredArtifact.sizeBytes !== backupSizeBytes
          ) {
            throw new Error('Backup changed during restoration');
          }
          await assertRestoredCounts(transaction, restoredSummary);

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
        `Database restored and verified. Keep traffic disabled until the application readiness endpoint reports healthy.\n${JSON.stringify(counts)}\n`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
} finally {
  await backupFile.close();
}
