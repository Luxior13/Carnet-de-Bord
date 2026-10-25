import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const readMigration = (name: string): string =>
  // Fixed, test-owned paths; no external input reaches the file system.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  readFileSync(
    new URL(
      `../../../../packages/database/prisma/migrations/${name}/migration.sql`,
      import.meta.url,
    ),
    'utf8',
  )
    .replaceAll(/\s+/g, ' ')
    .trim();

const removal = readMigration('20261024120000_remove_account_lockout');
const original = readMigration('20260719120000_irreversible_user_deletion');

const tombstoneCheck = (sql: string): string[] =>
  (
    sql.match(
      /ADD CONSTRAINT "User_deleted_tombstone_check" CHECK \( "deletedAt" IS NULL OR \( (.*?) \) \);/,
    )?.[1] ?? ''
  )
    .split(' AND ')
    .map((condition) => condition.trim());

describe('account lockout removal migration', () => {
  it('drops the tombstone check before the columns, then recreates it', () => {
    const dropCheck = removal.indexOf(
      'DROP CONSTRAINT "User_deleted_tombstone_check"',
    );
    const dropColumns = removal.indexOf('DROP COLUMN "failedLoginAttempts"');
    const addCheck = removal.indexOf(
      'ADD CONSTRAINT "User_deleted_tombstone_check"',
    );

    expect(dropCheck).toBeGreaterThanOrEqual(0);
    expect(dropColumns).toBeGreaterThan(dropCheck);
    expect(addCheck).toBeGreaterThan(dropColumns);
    expect(removal).toContain('DROP COLUMN "lockedUntil"');
    expect(removal).toContain(
      'ALTER TABLE "public"."MfaLoginChallenge" DROP COLUMN "attempts"',
    );
  });

  it('keeps every other tombstone condition unchanged', () => {
    const expected = tombstoneCheck(original).filter(
      (condition) =>
        !condition.includes('"failedLoginAttempts"') &&
        !condition.includes('"lockedUntil"'),
    );

    expect(expected.length).toBeGreaterThan(10);
    expect(tombstoneCheck(removal)).toEqual(expected);
  });
});
