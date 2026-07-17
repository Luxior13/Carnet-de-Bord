import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import {
  chmod,
  type FileHandle,
  mkdir,
  open,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { resolve } from 'node:path';

import type { PrismaClient } from '@prisma/client';

import { getPublicTables } from './database-tools';

type BackupResult = {
  checksumPath: string;
  counts: Record<string, number>;
  filePath: string;
  sha256: string;
};

type CursorRow = {
  cursor: string;
};

type TableSnapshot = {
  cursorColumn: string;
  tableName: string;
  upperCursor: string | null;
};

type BackupQueryClient = Pick<PrismaClient, '$queryRaw' | '$queryRawUnsafe'>;

const BACKUP_PAGE_SIZE = 500;
export const DATABASE_BACKUP_FORMAT_VERSION = 2;

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

const getTableSnapshot = async (
  prisma: BackupQueryClient,
  tables: ReadonlySet<string>,
  tableName: string,
  cursorColumn: string,
): Promise<TableSnapshot> => ({
  cursorColumn,
  tableName,
  upperCursor: tables.has(tableName)
    ? await getUpperCursor(prisma, tableName, cursorColumn)
    : null,
});

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

const stringifyJson = (value: unknown, indentation = 0): string => {
  const json = JSON.stringify(
    value,
    (_key, nestedValue: unknown) =>
      typeof nestedValue === 'bigint' ? nestedValue.toString() : nestedValue,
    indentation,
  );

  if (json === undefined) {
    throw new Error('Unable to serialize a database backup value');
  }

  return json;
};

const writeJsonArray = async (
  prisma: BackupQueryClient,
  fileHandle: FileHandle,
  snapshot: TableSnapshot,
): Promise<number> => {
  if (snapshot.upperCursor === null) {
    await writeChunk(fileHandle, '[]');

    return 0;
  }

  const quotedTable = quoteIdentifier(snapshot.tableName);
  const quotedCursor = quoteIdentifier(snapshot.cursorColumn);
  let cursor: string | null = null;
  let rowCount = 0;
  let isFirstRow = true;

  await writeChunk(fileHandle, '[\n');

  while (true) {
    // The table and cursor identifiers come exclusively from the static table
    // definitions below. Cursor values remain parameterized.
    const rows: Record<string, unknown>[] =
      cursor === null
        ? await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
            `SELECT *
             FROM "public".${quotedTable}
             WHERE ${quotedCursor} <= $1
             ORDER BY ${quotedCursor} ASC
             LIMIT $2`,
            snapshot.upperCursor,
            BACKUP_PAGE_SIZE,
          )
        : await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
            `SELECT *
             FROM "public".${quotedTable}
             WHERE ${quotedCursor} > $1
               AND ${quotedCursor} <= $2
             ORDER BY ${quotedCursor} ASC
             LIMIT $3`,
            cursor,
            snapshot.upperCursor,
            BACKUP_PAGE_SIZE,
          );

    if (rows.length === 0) break;

    for (const row of rows) {
      const serializedRow = stringifyJson(row, 2).replaceAll('\n', '\n    ');

      await writeChunk(
        fileHandle,
        `${isFirstRow ? '' : ',\n'}    ${serializedRow}`,
      );
      isFirstRow = false;
      rowCount += 1;
    }

    const nextCursor = rows.at(-1)?.[snapshot.cursorColumn];

    if (typeof nextCursor !== 'string') {
      throw new Error(
        `Invalid cursor in ${snapshot.tableName}.${snapshot.cursorColumn}`,
      );
    }

    cursor = nextCursor;
    if (rows.length < BACKUP_PAGE_SIZE || cursor === snapshot.upperCursor) {
      break;
    }
  }

  await writeChunk(fileHandle, '\n  ]');

  return rowCount;
};

async function writeDatabaseBackup(
  prisma: BackupQueryClient,
): Promise<BackupResult> {
  const tables = await getPublicTables(prisma);
  let staffProfileSource: 'ArchivedStaffProfile' | 'StaffProfile' | null = null;

  if (tables.has('ArchivedStaffProfile')) {
    staffProfileSource = 'ArchivedStaffProfile';
  } else if (tables.has('StaffProfile')) {
    staffProfileSource = 'StaffProfile';
  }

  // Capture small high-water marks before reading any rows. Every scan is then
  // finite even when the application keeps inserting audit events during a
  // long-running backup.
  const [
    auditLogs,
    backgroundJobs,
    loginNameReservations,
    mfaLoginChallenges,
    mfaRecoveryCodes,
    notificationRecipients,
    notifications,
    rateLimits,
    sessions,
    staffProfiles,
    systemSettings,
    totpCredentials,
    totpEnrollments,
    users,
  ] = await Promise.all([
    getTableSnapshot(prisma, tables, 'AuditLog', 'id'),
    getTableSnapshot(prisma, tables, 'BackgroundJob', 'id'),
    getTableSnapshot(prisma, tables, 'LoginNameReservation', 'loginName'),
    getTableSnapshot(prisma, tables, 'MfaLoginChallenge', 'id'),
    getTableSnapshot(prisma, tables, 'MfaRecoveryCode', 'id'),
    getTableSnapshot(prisma, tables, 'NotificationRecipient', 'id'),
    getTableSnapshot(prisma, tables, 'Notification', 'id'),
    getTableSnapshot(prisma, tables, 'RateLimit', 'id'),
    getTableSnapshot(prisma, tables, 'Session', 'id'),
    staffProfileSource === null
      ? Promise.resolve<TableSnapshot>({
          cursorColumn: 'id',
          tableName: 'StaffProfile',
          upperCursor: null,
        })
      : getTableSnapshot(prisma, tables, staffProfileSource, 'id'),
    getTableSnapshot(prisma, tables, 'SystemSetting', 'key'),
    getTableSnapshot(prisma, tables, 'TotpCredential', 'userId'),
    getTableSnapshot(prisma, tables, 'TotpEnrollment', 'userId'),
    getTableSnapshot(prisma, tables, 'User', 'id'),
  ]);

  const workspaceRoot = resolve(import.meta.dirname, '..', '..', '..');
  const backupDirectory = resolve(
    workspaceRoot,
    '.codex-tmp',
    'database-backups',
  );
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = resolve(
    backupDirectory,
    `carnet-pro-${timestamp}-${randomUUID()}.json`,
  );
  const temporaryFilePath = `${filePath}.tmp`;
  const checksumPath = `${filePath}.sha256`;
  const createdAt = new Date().toISOString();
  const counts: Record<string, number> = {
    AuditLog: 0,
    BackgroundJob: 0,
    LoginNameReservation: 0,
    MfaLoginChallenge: 0,
    MfaRecoveryCode: 0,
    Notification: 0,
    NotificationRecipient: 0,
    RateLimit: 0,
    Session: 0,
    StaffProfile: 0,
    SystemSetting: 0,
    TotpCredential: 0,
    TotpEnrollment: 0,
    User: 0,
  };
  let fileHandle: FileHandle | null = null;
  let published = false;

  // Paths are generated exclusively from the repository root, an ISO
  // timestamp and a random UUID.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  await mkdir(backupDirectory, { mode: 0o700, recursive: true });

  try {
    // Exclusive creation prevents accidentally reusing a stale temporary file.
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    fileHandle = await open(temporaryFilePath, 'wx', 0o600);

    await writeChunk(
      fileHandle,
      `{\n  "formatVersion": ${DATABASE_BACKUP_FORMAT_VERSION},\n  "auditLogs": `,
    );
    counts.AuditLog = await writeJsonArray(prisma, fileHandle, auditLogs);
    await writeChunk(fileHandle, ',\n  "backgroundJobs": ');
    counts.BackgroundJob = await writeJsonArray(
      prisma,
      fileHandle,
      backgroundJobs,
    );
    await writeChunk(
      fileHandle,
      `,\n  "createdAt": ${stringifyJson(createdAt)},\n  "loginNameReservations": `,
    );
    counts.LoginNameReservation = await writeJsonArray(
      prisma,
      fileHandle,
      loginNameReservations,
    );
    await writeChunk(fileHandle, ',\n  "mfaLoginChallenges": ');
    counts.MfaLoginChallenge = await writeJsonArray(
      prisma,
      fileHandle,
      mfaLoginChallenges,
    );
    await writeChunk(fileHandle, ',\n  "mfaRecoveryCodes": ');
    counts.MfaRecoveryCode = await writeJsonArray(
      prisma,
      fileHandle,
      mfaRecoveryCodes,
    );
    await writeChunk(fileHandle, ',\n  "notifications": ');
    counts.Notification = await writeJsonArray(
      prisma,
      fileHandle,
      notifications,
    );
    await writeChunk(fileHandle, ',\n  "notificationRecipients": ');
    counts.NotificationRecipient = await writeJsonArray(
      prisma,
      fileHandle,
      notificationRecipients,
    );
    await writeChunk(fileHandle, ',\n  "rateLimits": ');
    counts.RateLimit = await writeJsonArray(prisma, fileHandle, rateLimits);
    await writeChunk(fileHandle, ',\n  "sessions": ');
    counts.Session = await writeJsonArray(prisma, fileHandle, sessions);
    await writeChunk(fileHandle, ',\n  "staffProfiles": ');
    counts.StaffProfile = await writeJsonArray(
      prisma,
      fileHandle,
      staffProfiles,
    );
    await writeChunk(fileHandle, ',\n  "systemSettings": ');
    counts.SystemSetting = await writeJsonArray(
      prisma,
      fileHandle,
      systemSettings,
    );
    await writeChunk(
      fileHandle,
      `,\n  "staffProfileSource": ${stringifyJson(staffProfileSource)},\n  "totpCredentials": `,
    );
    counts.TotpCredential = await writeJsonArray(
      prisma,
      fileHandle,
      totpCredentials,
    );
    await writeChunk(fileHandle, ',\n  "totpEnrollments": ');
    counts.TotpEnrollment = await writeJsonArray(
      prisma,
      fileHandle,
      totpEnrollments,
    );
    await writeChunk(fileHandle, ',\n  "users": ');
    counts.User = await writeJsonArray(prisma, fileHandle, users);
    await writeChunk(fileHandle, '\n}\n');

    // Flush and lock down the temporary file before publishing it atomically.
    await fileHandle.sync();
    await fileHandle.chmod(0o600);
    await fileHandle.close();
    fileHandle = null;
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    await rename(temporaryFilePath, filePath);
    published = true;
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    await chmod(filePath, 0o600);
    const sha256 = await hashFile(filePath);
    // The checksum path is derived from the internally generated backup path.
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    await writeFile(checksumPath, `${sha256}  ${filePath}\n`, {
      encoding: 'utf8',
      flag: 'wx',
      mode: 0o600,
    });

    return { checksumPath, counts, filePath, sha256 };
  } catch (error) {
    if (fileHandle !== null) {
      await fileHandle.close().catch(() => undefined);
    }

    await rm(temporaryFilePath, { force: true }).catch(() => undefined);

    if (published) {
      await rm(filePath, { force: true }).catch(() => undefined);
      await rm(checksumPath, { force: true }).catch(() => undefined);
    }

    throw error;
  }
}

export async function createDatabaseBackup(
  prisma: PrismaClient,
): Promise<BackupResult> {
  // One repeatable-read snapshot keeps relations between users, sessions and
  // audit entries coherent while the application continues accepting writes.
  // The generous timeout is intentional: a streamed production backup can
  // legitimately run for much longer than a regular interactive transaction.
  return prisma.$transaction(
    (transaction) => writeDatabaseBackup(transaction),
    {
      isolationLevel: 'RepeatableRead',
      maxWait: 10_000,
      timeout: 6 * 60 * 60 * 1_000,
    },
  );
}
