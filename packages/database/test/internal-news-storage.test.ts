import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  DATABASE_BACKUP_FORMAT_VERSION,
  DATABASE_BACKUP_TABLES,
} from '../scripts/database-backup-format.ts';

const readContractFile = (relativePath: string): string =>
  // Static paths owned by this contract test.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  readFileSync(new URL(relativePath, import.meta.url), 'utf8');

const schema = readContractFile('../prisma/schema.prisma');
const migration = readContractFile(
  '../prisma/migrations/20260726160000_internal_news/migration.sql',
);

test('persists internal announcements with durable author snapshots', () => {
  assert.match(schema, /model InternalAnnouncement \{/u);
  assert.match(schema, /authorDisplayNameSnapshot\s+String/u);
  assert.match(schema, /authorLoginNameSnapshot\s+String/u);
  assert.match(migration, /CREATE TABLE "InternalAnnouncement"/u);
  assert.match(
    migration,
    /InternalAnnouncement_createdById_fkey[\s\S]*ON DELETE SET NULL/u,
  );
});

test('backs up announcements after their parent user in format v8', () => {
  assert.equal(DATABASE_BACKUP_FORMAT_VERSION, 8);
  const userIndex = DATABASE_BACKUP_TABLES.findIndex(
    ({ tableName }) => tableName === 'User',
  );
  const announcementIndex = DATABASE_BACKUP_TABLES.findIndex(
    ({ tableName }) => tableName === 'InternalAnnouncement',
  );

  assert.notEqual(announcementIndex, -1);
  assert.equal(announcementIndex > userIndex, true);
});
