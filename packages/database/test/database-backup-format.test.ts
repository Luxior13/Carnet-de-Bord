import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import test from 'node:test';

import {
  type BackupManifest,
  BackupStreamValidator,
  DATABASE_BACKUP_FORMAT_VERSION,
  DATABASE_BACKUP_TABLES,
  stringifyBackupRecord,
} from '../scripts/database-backup-format.ts';
import { validateRestoreEnvironment } from '../scripts/database-restore-support.ts';

const createManifest = (): BackupManifest => ({
  backupId: '123e4567-e89b-42d3-a456-426614174000',
  createdAt: '2026-07-22T12:00:00.000Z',
  formatVersion: DATABASE_BACKUP_FORMAT_VERSION,
  requiredAuditEncryptionKeyVersions: [1, 2],
  tables: DATABASE_BACKUP_TABLES.map(({ property, tableName }) => ({
    property,
    tableName,
  })),
  type: 'manifest',
});

const createBackupLines = (
  rowsByProperty: Readonly<
    Record<string, readonly Record<string, unknown>[]>
  > = {},
): string[] => {
  const lines = [stringifyBackupRecord(createManifest())];
  const counts: Record<string, number> = {};
  for (const { property } of DATABASE_BACKUP_TABLES) {
    // Properties come from the closed backup contract.
    // eslint-disable-next-line security/detect-object-injection
    const rows = rowsByProperty[property] ?? [];
    counts[property] = rows.length;
    lines.push(stringifyBackupRecord({ property, type: 'tableStart' }));
    for (const value of rows) {
      lines.push(stringifyBackupRecord({ property, type: 'row', value }));
    }
    lines.push(
      stringifyBackupRecord({ count: rows.length, property, type: 'tableEnd' }),
    );
  }
  lines.push(stringifyBackupRecord({ counts, type: 'footer' }));

  return lines;
};

const validateLines = (
  lines: readonly string[],
): ReturnType<BackupStreamValidator['finish']> => {
  const validator = new BackupStreamValidator();
  lines.forEach((line, index) => validator.consume(line, index + 1));

  return validator.finish();
};

test('validates the signed v5 format, ordered tables and exact counts', () => {
  const summary = validateLines(
    createBackupLines({ users: [{ id: 'user-1' }, { id: 'user-2' }] }),
  );

  assert.equal(summary.manifest.formatVersion, 5);
  assert.equal(summary.counts.users, 2);
  const tableNames: readonly string[] = DATABASE_BACKUP_TABLES.map(
    ({ tableName }) => tableName,
  );
  assert.equal(tableNames.includes('BackgroundJob'), false);
  assert.equal(tableNames.includes('PersonDeletionRequest'), false);
});

test('serializes bigint and bytea without loss', () => {
  assert.deepEqual(
    JSON.parse(
      stringifyBackupRecord({
        bigint: 9_007_199_254_740_993n,
        bytes: Buffer.from([0, 1, 254, 255]),
      }),
    ),
    { bigint: '9007199254740993', bytes: '\\x0001feff' },
  );
});

test('rejects truncated, reordered and count-divergent streams', () => {
  const lines = createBackupLines();
  assert.throws(() => validateLines(lines.slice(0, -1)), /truncated/u);

  const reordered = [...lines];
  reordered[1] = stringifyBackupRecord({
    property: DATABASE_BACKUP_TABLES[1]?.property,
    type: 'tableStart',
  });
  assert.throws(() => validateLines(reordered), /missing or out of order/u);

  const divergent = [...lines];
  divergent[2] = stringifyBackupRecord({
    count: 1,
    property: DATABASE_BACKUP_TABLES[0]?.property,
    type: 'tableEnd',
  });
  assert.throws(() => validateLines(divergent), /count or section boundary/u);
});

test('rejects old manifests and unknown properties', () => {
  const oldManifest = { ...createManifest(), formatVersion: 4 };
  assert.throws(
    () =>
      new BackupStreamValidator().consume(
        stringifyBackupRecord(oldManifest),
        1,
      ),
    /Unsupported backup format/u,
  );

  const unknownManifest = { ...createManifest(), unexpected: true };
  assert.throws(
    () =>
      new BackupStreamValidator().consume(
        stringifyBackupRecord(unknownManifest),
        1,
      ),
    /unknown or missing properties/u,
  );
});

test('restore requires all referenced audit AES keys and no deletion ledger secret', () => {
  const environment = {
    AUDIT_ENCRYPTION_CURRENT_VERSION: '2',
    AUDIT_ENCRYPTION_KEY_V1: Buffer.alloc(32, 1).toString('base64'),
    AUDIT_ENCRYPTION_KEY_V2: Buffer.alloc(32, 2).toString('base64'),
  };

  assert.doesNotThrow(() =>
    validateRestoreEnvironment(createManifest(), environment),
  );
  assert.throws(
    () =>
      validateRestoreEnvironment(createManifest(), {
        ...environment,
        AUDIT_ENCRYPTION_KEY_V1: undefined,
      }),
    /AUDIT_ENCRYPTION_KEY_V1/u,
  );
});
