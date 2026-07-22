import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import {
  chmod,
  type FileHandle,
  mkdir,
  open,
  rename,
  rm,
} from 'node:fs/promises';
import { resolve } from 'node:path';

import type { PrismaClient } from '@prisma/client';

import {
  type BackupManifest,
  type BackupTableDefinition,
  type BackupTableProperty,
  DATABASE_BACKUP_BATCH_SIZE,
  DATABASE_BACKUP_FORMAT_VERSION,
  DATABASE_BACKUP_TABLES,
  MAX_BACKUP_LINE_BYTES,
  MAX_DATABASE_BACKUP_BYTES,
  stringifyBackupRecord,
} from './database-backup-format.ts';
import {
  canonicalDatabaseBackupSignatureJson,
  createDatabaseBackupSignature,
} from './database-backup-signature.ts';
import { getPublicTables } from './database-tools.ts';

export { DATABASE_BACKUP_FORMAT_VERSION } from './database-backup-format.ts';

type BackupResult = {
  backupId: string;
  checksumPath: string;
  counts: Record<string, number>;
  filePath: string;
  sha256: string;
  signaturePath: string;
};

type CursorRow = {
  cursor: string;
};

type AuditEncryptionKeyVersionRow = {
  version: number;
};

type TableSnapshot = BackupTableDefinition & {
  sourceTableName: string | null;
  upperCursor: string | null;
};

type BackupQueryClient = Pick<PrismaClient, '$queryRaw' | '$queryRawUnsafe'>;

const hashFile = async (filePath: string): Promise<string> => {
  const hash = createHash('sha256');
  // The path is generated internally and never comes from user input.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  for await (const chunk of createReadStream(filePath)) {
    hash.update(chunk as Buffer);
  }

  return hash.digest('hex');
};

const quoteIdentifier = (identifier: string): string => {
  if (!/^[A-Za-z][A-Za-z0-9]*$/u.test(identifier)) {
    throw new Error(`Invalid database identifier: ${identifier}`);
  }

  return `"${identifier}"`;
};

const getUpperCursor = async (
  prisma: BackupQueryClient,
  tableName: string,
  cursorColumn: string,
): Promise<string | null> => {
  const quotedTable = quoteIdentifier(tableName);
  const quotedCursor = quoteIdentifier(cursorColumn);
  const rows = await prisma.$queryRawUnsafe<CursorRow[]>(
    `SELECT ${quotedCursor}::text AS "cursor"
     FROM "public".${quotedTable}
     ORDER BY ${quotedCursor} DESC
     LIMIT 1`,
  );

  return rows[0]?.cursor ?? null;
};

const resolveSourceTable = (
  tables: ReadonlySet<string>,
  definition: BackupTableDefinition,
): string | null => {
  if (tables.has(definition.tableName)) return definition.tableName;
  if (
    definition.legacySourceTableName &&
    tables.has(definition.legacySourceTableName)
  ) {
    return definition.legacySourceTableName;
  }

  return null;
};

const getTableSnapshot = async (
  prisma: BackupQueryClient,
  tables: ReadonlySet<string>,
  definition: BackupTableDefinition,
): Promise<TableSnapshot> => {
  const sourceTableName = resolveSourceTable(tables, definition);

  return {
    ...definition,
    sourceTableName,
    upperCursor:
      sourceTableName === null
        ? null
        : await getUpperCursor(
            prisma,
            sourceTableName,
            definition.cursorColumn,
          ),
  };
};

const getRequiredAuditEncryptionKeyVersions = async (
  prisma: BackupQueryClient,
  tables: ReadonlySet<string>,
): Promise<number[]> => {
  if (!tables.has('AuditEncryptionKeyVersion')) return [];

  const rows = await prisma.$queryRaw<AuditEncryptionKeyVersionRow[]>`
    SELECT "version"
    FROM "public"."AuditEncryptionKeyVersion"
    ORDER BY "version" ASC
  `;

  return rows.map(({ version }) => version);
};

const writeChunk = async (
  fileHandle: FileHandle,
  value: string,
): Promise<void> => {
  const buffer = Buffer.from(value, 'utf8');
  let offset = 0;

  while (offset < buffer.length) {
    const { bytesWritten } = await fileHandle.write(
      buffer,
      offset,
      buffer.length - offset,
      null,
    );

    if (bytesWritten === 0) {
      throw new Error('Unable to continue writing the database backup');
    }

    offset += bytesWritten;
  }
};

const writeRecord = async (
  fileHandle: FileHandle,
  value: unknown,
): Promise<void> => {
  const serialized = stringifyBackupRecord(value);
  if (Buffer.byteLength(serialized, 'utf8') > MAX_BACKUP_LINE_BYTES) {
    throw new Error('A database row exceeds the safe backup line limit');
  }
  await writeChunk(fileHandle, `${serialized}\n`);
};

const writeSecureSidecar = async (
  filePath: string,
  content: string,
): Promise<void> => {
  let handle: FileHandle | null = null;
  try {
    // Every sidecar path is derived from the random internal backup path.
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    handle = await open(filePath, 'wx', 0o600);
    await writeChunk(handle, content);
    await handle.sync();
    await handle.chmod(0o600);
    await handle.close();
    handle = null;
  } finally {
    await handle?.close().catch(() => undefined);
  }
};

const syncBackupDirectory = async (directoryPath: string): Promise<void> => {
  let handle: FileHandle | null = null;
  try {
    // The directory is the fixed internal backup directory resolved above.
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    handle = await open(directoryPath, 'r');
    await handle.sync();
  } catch (error) {
    // Windows does not expose directory fsync (EPERM). File contents are still
    // synced and the main JSONL remains the last published entry there. POSIX
    // deployments must durably order both directory-entry barriers.
    if (
      process.platform !== 'win32' ||
      (error as NodeJS.ErrnoException).code !== 'EPERM'
    ) {
      throw error;
    }
  } finally {
    await handle?.close().catch(() => undefined);
  }
};

const getCursorParameterCast = (snapshot: TableSnapshot): string =>
  snapshot.cursorKind === 'integer' ? '::integer' : '';

const writeTableRows = async (
  prisma: BackupQueryClient,
  fileHandle: FileHandle,
  snapshot: TableSnapshot,
): Promise<number> => {
  if (snapshot.sourceTableName === null || snapshot.upperCursor === null) {
    return 0;
  }

  const quotedTable = quoteIdentifier(snapshot.sourceTableName);
  const quotedCursor = quoteIdentifier(snapshot.cursorColumn);
  const parameterCast = getCursorParameterCast(snapshot);
  let cursor: string | null = null;
  let rowCount = 0;

  while (true) {
    // Identifiers and casts come only from DATABASE_BACKUP_TABLES. Values stay
    // parameterized and each page is bounded independently of total file size.
    const rows: Record<string, unknown>[] =
      cursor === null
        ? await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
            `SELECT *
             FROM "public".${quotedTable}
             WHERE ${quotedCursor} <= $1${parameterCast}
             ORDER BY ${quotedCursor} ASC
             LIMIT $2`,
            snapshot.upperCursor,
            DATABASE_BACKUP_BATCH_SIZE,
          )
        : await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
            `SELECT *
             FROM "public".${quotedTable}
             WHERE ${quotedCursor} > $1${parameterCast}
               AND ${quotedCursor} <= $2${parameterCast}
             ORDER BY ${quotedCursor} ASC
             LIMIT $3`,
            cursor,
            snapshot.upperCursor,
            DATABASE_BACKUP_BATCH_SIZE,
          );

    if (rows.length === 0) break;

    for (const row of rows) {
      await writeRecord(fileHandle, {
        property: snapshot.property,
        type: 'row',
        value: row,
      });
      rowCount += 1;
    }

    const rawNextCursor = rows.at(-1)?.[snapshot.cursorColumn];
    if (
      typeof rawNextCursor !== 'string' &&
      typeof rawNextCursor !== 'number'
    ) {
      throw new Error(
        `Invalid cursor in ${snapshot.sourceTableName}.${snapshot.cursorColumn}`,
      );
    }
    cursor = String(rawNextCursor);
    if (
      rows.length < DATABASE_BACKUP_BATCH_SIZE ||
      cursor === snapshot.upperCursor
    ) {
      break;
    }
  }

  return rowCount;
};

async function writeDatabaseBackup(
  prisma: BackupQueryClient,
  environment: NodeJS.ProcessEnv,
): Promise<BackupResult> {
  const tables = await getPublicTables(prisma);
  const [snapshots, requiredAuditEncryptionKeyVersions] = await Promise.all([
    Promise.all(
      DATABASE_BACKUP_TABLES.map((definition) =>
        getTableSnapshot(prisma, tables, definition),
      ),
    ),
    getRequiredAuditEncryptionKeyVersions(prisma, tables),
  ]);
  const createdAt = new Date().toISOString();
  const backupId = randomUUID();
  const manifest: BackupManifest = {
    backupId,
    createdAt,
    formatVersion: DATABASE_BACKUP_FORMAT_VERSION,
    requiredAuditEncryptionKeyVersions,
    tables: DATABASE_BACKUP_TABLES.map(({ property, tableName }) => ({
      property,
      tableName,
    })),
    type: 'manifest',
  };

  const workspaceRoot = resolve(import.meta.dirname, '..', '..', '..');
  const backupDirectory = resolve(
    workspaceRoot,
    '.codex-tmp',
    'database-backups',
  );
  const timestamp = createdAt.replace(/[:.]/g, '-');
  const filePath = resolve(
    backupDirectory,
    `carnet-pro-${timestamp}-${backupId}.jsonl`,
  );
  const temporaryFilePath = `${filePath}.tmp`;
  const checksumPath = `${filePath}.sha256`;
  const temporaryChecksumPath = `${checksumPath}.tmp`;
  const signaturePath = `${filePath}.signature.json`;
  const temporarySignaturePath = `${signaturePath}.tmp`;
  const propertyCounts = Object.fromEntries(
    DATABASE_BACKUP_TABLES.map(({ property }) => [property, 0]),
  ) as Record<BackupTableProperty, number>;
  let fileHandle: FileHandle | null = null;
  let backupPublished = false;
  let checksumPublished = false;
  let signaturePublished = false;

  // Paths are generated exclusively from the repository root, an ISO
  // timestamp and a random UUID.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  await mkdir(backupDirectory, { mode: 0o700, recursive: true });

  try {
    // Exclusive creation prevents accidentally reusing a stale temporary file.
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    fileHandle = await open(temporaryFilePath, 'wx', 0o600);
    await writeRecord(fileHandle, manifest);

    for (const snapshot of snapshots) {
      await writeRecord(fileHandle, {
        property: snapshot.property,
        type: 'tableStart',
      });
      propertyCounts[snapshot.property as BackupTableProperty] =
        await writeTableRows(prisma, fileHandle, snapshot);
      await writeRecord(fileHandle, {
        count: propertyCounts[snapshot.property as BackupTableProperty],
        property: snapshot.property,
        type: 'tableEnd',
      });
    }
    await writeRecord(fileHandle, { counts: propertyCounts, type: 'footer' });

    const temporaryStats = await fileHandle.stat();
    if (temporaryStats.size > MAX_DATABASE_BACKUP_BYTES) {
      throw new Error('Database backup exceeds the supported 2 GiB limit');
    }

    // Flush and lock down the temporary file before publishing it atomically.
    await fileHandle.sync();
    await fileHandle.chmod(0o600);
    await fileHandle.close();
    fileHandle = null;
    const sha256 = await hashFile(temporaryFilePath);
    const signature = createDatabaseBackupSignature(
      {
        backupSizeBytes: temporaryStats.size,
        counts: propertyCounts,
        manifest,
        sha256,
      },
      environment,
    );
    await writeSecureSidecar(temporaryChecksumPath, `${sha256}  ${filePath}\n`);
    await writeSecureSidecar(
      temporarySignaturePath,
      `${canonicalDatabaseBackupSignatureJson(signature)}\n`,
    );

    // Publish sidecars first, and the discoverable JSONL last. An operator or
    // scheduler can never observe a main backup path without both companions.
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    await rename(temporaryChecksumPath, checksumPath);
    checksumPublished = true;
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    await rename(temporarySignaturePath, signaturePath);
    signaturePublished = true;
    // Make both companions durable before the discoverable main entry can be
    // durable on filesystems that reorder directory metadata across crashes.
    await syncBackupDirectory(backupDirectory);
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    await rename(temporaryFilePath, filePath);
    backupPublished = true;
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    await chmod(filePath, 0o600);
    await syncBackupDirectory(backupDirectory);
    const counts = Object.fromEntries(
      DATABASE_BACKUP_TABLES.map(({ property, tableName }) => [
        tableName,
        // Property names come from the closed static table contract.
        // eslint-disable-next-line security/detect-object-injection
        propertyCounts[property],
      ]),
    );

    return {
      backupId,
      checksumPath,
      counts,
      filePath,
      sha256,
      signaturePath,
    };
  } catch (error) {
    if (fileHandle !== null) {
      await fileHandle.close().catch(() => undefined);
    }

    await rm(temporaryFilePath, { force: true }).catch(() => undefined);
    await rm(temporaryChecksumPath, { force: true }).catch(() => undefined);
    await rm(temporarySignaturePath, { force: true }).catch(() => undefined);

    if (backupPublished) {
      await rm(filePath, { force: true }).catch(() => undefined);
    }
    if (checksumPublished) {
      await rm(checksumPath, { force: true }).catch(() => undefined);
    }
    if (signaturePublished) {
      await rm(signaturePath, { force: true }).catch(() => undefined);
    }

    throw error;
  }
}

export async function createDatabaseBackup(
  prisma: PrismaClient,
  environment: NodeJS.ProcessEnv = process.env,
): Promise<BackupResult> {
  // One repeatable-read snapshot keeps relations, rows and the encryption-key
  // inventory coherent while writes continue.
  return prisma.$transaction(
    (transaction) => writeDatabaseBackup(transaction, environment),
    {
      isolationLevel: 'RepeatableRead',
      maxWait: 10_000,
      timeout: 6 * 60 * 60 * 1_000,
    },
  );
}
