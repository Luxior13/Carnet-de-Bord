import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const migrationUrl = new URL(
  '../../../../packages/database/prisma/migrations/20260721120000_person_identity_foundation/migration.sql',
  import.meta.url,
);
const maintenanceCommandUrl = new URL(
  '../../scripts/run-maintenance.ts',
  import.meta.url,
);
const personDeletionUrl = new URL(
  '../features/persons/server/person-deletion.ts',
  import.meta.url,
);

// Every URL above is a fixed, test-owned path; no external input reaches fs.
// eslint-disable-next-line security/detect-non-literal-fs-filename
const migrationSql = readFileSync(migrationUrl, 'utf8');
// eslint-disable-next-line security/detect-non-literal-fs-filename
const maintenanceCommandSource = readFileSync(maintenanceCommandUrl, 'utf8');
// eslint-disable-next-line security/detect-non-literal-fs-filename
const personDeletionSource = readFileSync(personDeletionUrl, 'utf8');
const compactSql = migrationSql.replaceAll(/\s+/gu, ' ').trim();

describe('controlled audit deletion boundary', () => {
  it('makes both audit tables append-only outside controlled procedures', () => {
    expect(compactSql).toContain(
      'CREATE TRIGGER "AuditLog_guard_mutation" BEFORE UPDATE OR DELETE ON "public"."AuditLog"',
    );
    expect(compactSql).toContain(
      'CREATE TRIGGER "AuditFieldChange_guard_mutation" BEFORE UPDATE OR DELETE ON "public"."AuditFieldChange"',
    );
    expect(compactSql).toContain('GET DIAGNOSTICS call_context = PG_CONTEXT');
    expect(compactSql).toContain(
      "strpos(call_context, 'purge_expired_audit_logs(integer)') > 0",
    );
    expect(compactSql).toContain("'purge_person_audit_field_changes(text)'");
  });

  it('locks and validates the configured retention before deleting', () => {
    expect(compactSql).toContain(
      'CREATE OR REPLACE FUNCTION "purge_expired_audit_logs"( expected_retention_days INTEGER ) RETURNS BIGINT LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public',
    );
    expect(compactSql).toContain(
      "pg_catalog.pg_advisory_xact_lock( pg_catalog.hashtextextended('system-setting:audit.retentionDays', 0) )",
    );
    expect(compactSql).toContain(
      'WHERE setting."key" = \'audit.retentionDays\' FOR SHARE',
    );
    expect(compactSql).toContain(
      'configured_retention_days < 365 OR configured_retention_days > 3650',
    );
    expect(compactSql).toContain(
      'expected_retention_days IS DISTINCT FROM configured_retention_days',
    );
    expect(compactSql).toContain(
      'DELETE FROM "public"."AuditLog" WHERE "createdAt" < (CURRENT_TIMESTAMP AT TIME ZONE \'UTC\') - make_interval(days => configured_retention_days)',
    );
  });

  it('locks the Person row before purging its field values', () => {
    expect(compactSql).toContain(
      'CREATE OR REPLACE FUNCTION "purge_person_audit_field_changes"( target_person_id TEXT ) RETURNS BIGINT LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public',
    );
    expect(compactSql).toContain(
      'FROM "public"."Person" person WHERE person."id" = target_person_id FOR UPDATE',
    );
    expect(compactSql).toContain(
      'DELETE FROM "public"."AuditFieldChange" WHERE "entityType" = \'PERSON\' AND "entityId" = target_person_id',
    );
    expect(compactSql).toContain(
      'REVOKE ALL ON FUNCTION "purge_expired_audit_logs"(INTEGER) FROM PUBLIC',
    );
    expect(compactSql).toContain(
      'REVOKE ALL ON FUNCTION "purge_person_audit_field_changes"(TEXT) FROM PUBLIC',
    );
  });

  it('keeps application code on the two reviewed procedures', () => {
    expect(maintenanceCommandSource).toContain(
      'SELECT "public"."purge_expired_audit_logs"',
    );
    expect(maintenanceCommandSource).not.toContain('auditLog.deleteMany');
    expect(personDeletionSource).toContain(
      'SELECT "public"."purge_person_audit_field_changes"',
    );
    expect(personDeletionSource).not.toContain('auditFieldChange.deleteMany');
  });
});
