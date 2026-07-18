import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const migrationUrl = new URL(
  '../../../../packages/database/prisma/migrations/20260719120000_irreversible_user_deletion/migration.sql',
  import.meta.url,
);
// Fixed, test-owned path; no external input reaches the file system.
// eslint-disable-next-line security/detect-non-literal-fs-filename
const migrationSql = readFileSync(migrationUrl, 'utf8');

const compactSql = migrationSql.replaceAll(/\s+/g, ' ').trim();

describe('irreversible user deletion migration', () => {
  it('never upgrades a historical archive or delete grant to permanent deletion', () => {
    const sourcePermissionsCte = compactSql.match(
      /"source_permissions" AS \( (.*?) \), "updates" AS/s,
    )?.[1];
    const deleteAccountAssignments = [
      ...migrationSql.matchAll(
        /jsonb_build_object\(\s*'users:delete_account'\s*,\s*(true|false)\s*\)/g,
      ),
    ].map((match) => match[1]?.trim());

    expect(sourcePermissionsCte).toBeDefined();
    expect(sourcePermissionsCte).toContain(
      '"permissions" -> \'users:archive\'',
    );
    expect(sourcePermissionsCte).not.toContain(
      '"permissions" -> \'users:delete\'',
    );
    expect(deleteAccountAssignments).toEqual(['false']);
    expect(compactSql).not.toMatch(
      /"former_archive_value"\s*=\s*'true'::jsonb/,
    );
  });

  it('carries forward only an ADMIN explicit denial', () => {
    expect(compactSql).toContain(
      "WHEN \"role\" = 'ADMIN' AND \"former_archive_value\" = 'false'::jsonb THEN jsonb_build_object('users:delete_account', false)",
    );
    expect(compactSql).toContain(
      "\"permissions\" - 'users:archive' - 'users:delete' - 'users:delete_account'",
    );
    expect(compactSql).toContain(
      '"permissions" ? \'users:delete\' OR "permissions" ? \'users:delete_account\'',
    );
  });

  it('anonymizes every legacy deleted account as a non-authenticating tombstone', () => {
    const tombstoneUpdate = compactSql.match(
      /UPDATE "public"\."User" SET (.*?) WHERE "deletedAt" IS NOT NULL;/s,
    )?.[1];

    expect(tombstoneUpdate).toBeDefined();
    expect(tombstoneUpdate).toContain('"contactEmail" = NULL');
    expect(tombstoneUpdate).toContain('"contactEmailVerifiedAt" = NULL');
    expect(tombstoneUpdate).toContain('"firstName" = \'Compte\'');
    expect(tombstoneUpdate).toContain('"lastName" = \'supprimé\'');
    expect(tombstoneUpdate).toContain('"isActive" = false');
    expect(tombstoneUpdate).toContain('"isProtected" = false');
    expect(tombstoneUpdate).toContain('"lastLoginAt" = NULL');
    expect(tombstoneUpdate).toContain('"lockedUntil" = NULL');
    expect(tombstoneUpdate).toContain('"mfaEnabledAt" = NULL');
    expect(tombstoneUpdate).toContain('"passwordChangedAt" = NULL');
    expect(tombstoneUpdate).toContain('"permissions" = NULL');
    expect(tombstoneUpdate).toContain('"role" = \'USER\'');
    expect(tombstoneUpdate).toContain(
      '"securityVersion" = "securityVersion" + 1',
    );
  });

  it('uses a deterministic login in a namespace unavailable to live accounts', () => {
    expect(compactSql).toContain(
      'DROP CONSTRAINT "User_loginName_format_check"',
    );
    expect(compactSql).toContain('"loginName" = \'deleted:\' || md5("id")');
    expect(compactSql).toContain('"passwordHash" = \'!deleted:\' || md5("id")');
    expect(compactSql).toContain(
      '"deletedAt" IS NULL AND "loginName" ~ \'^[a-z0-9][a-z0-9._-]{1,30}[a-z0-9]$\'',
    );
    expect(compactSql).toContain(
      '"deletedAt" IS NOT NULL AND "loginName" ~ \'^deleted:[a-f0-9]{32}$\'',
    );
    expect(compactSql).toContain('"passwordHash" = \'!\' || "loginName"');
  });

  it('removes every sensitive user-owned relation while preserving durable evidence', () => {
    const cleanedRelations = [
      ...compactSql.matchAll(
        /DELETE FROM "public"\."([^"]+)" WHERE "userId" IN \( SELECT "id" FROM "public"\."User" WHERE "deletedAt" IS NOT NULL \);/g,
      ),
    ].map((match) => match[1]);

    expect(cleanedRelations).toEqual([
      'Session',
      'TotpCredential',
      'TotpEnrollment',
      'MfaRecoveryCode',
      'MfaLoginChallenge',
      'NotificationRecipient',
      'ArchivedStaffProfile',
    ]);

    expect(compactSql).not.toContain('DELETE FROM "public"."AuditLog"');
    expect(compactSql).not.toContain(
      'DELETE FROM "public"."LoginNameReservation"',
    );
  });

  it('enforces tombstone shape and immutability at the database boundary', () => {
    expect(compactSql).toContain(
      'ADD CONSTRAINT "User_deleted_tombstone_check" CHECK ( "deletedAt" IS NULL OR (',
    );
    expect(compactSql).toContain(
      'CREATE OR REPLACE FUNCTION "prevent_deleted_user_mutation"()',
    );
    expect(compactSql).toContain(
      "RAISE EXCEPTION 'Deleted user tombstones are immutable'",
    );
    expect(compactSql).toContain(
      'CREATE TRIGGER "User_prevent_deleted_tombstone_mutation" BEFORE UPDATE OR DELETE ON "public"."User"',
    );
    expect(compactSql).toContain('WHEN (OLD."deletedAt" IS NOT NULL)');
    expect(compactSql).toContain(
      'EXECUTE FUNCTION "prevent_deleted_user_mutation"()',
    );
  });

  it('keeps the protected root lifecycle immutable at the database boundary', () => {
    expect(compactSql).toContain(
      'CREATE OR REPLACE FUNCTION "prevent_protected_root_lifecycle_mutation"()',
    );
    expect(compactSql).toContain(
      "IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'The protected root account cannot be deleted'",
    );
    expect(compactSql).toContain(
      'IF NEW."isProtected" IS DISTINCT FROM true OR NEW."role" <> \'ADMIN\' OR NEW."isActive" IS DISTINCT FROM true OR NEW."deletedAt" IS NOT NULL',
    );
    expect(compactSql).toContain(
      'CREATE TRIGGER "User_protect_root_lifecycle" BEFORE UPDATE OR DELETE ON "public"."User"',
    );
    expect(compactSql).toContain('WHEN (OLD."isProtected" = true)');
  });
});
