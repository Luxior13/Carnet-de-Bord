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
  '../prisma/migrations/20260724214500_partner_timeline_events/migration.sql',
);
const deletionProtectionMigration = readContractFile(
  '../prisma/migrations/20260724230000_protect_partner_timeline_event_deletion/migration.sql',
);
const readiness = readContractFile(
  '../../../apps/web/src/features/partners/server/partner-readiness.ts',
);

test('defines a durable and versioned partner business timeline', () => {
  for (const type of [
    'RELATIONSHIP_CREATED',
    'STATUS_CHANGED',
    'PERIOD_CORRECTED',
    'ACTION_COMPLETED',
    'ACTION_REOPENED',
    'ACTION_UPDATED',
  ]) {
    assert.equal(schema.includes(type), true);
    assert.equal(migration.includes(`'${type}'`), true);
  }

  assert.match(schema, /model PartnerTimelineEvent \{/u);
  assert.match(
    schema,
    /authorDisplayNameSnapshot\s+String\?\s+@db\.VarChar\(200\)/u,
  );
  assert.match(
    schema,
    /completedByDisplayNameSnapshot\s+String\?\s+@db\.VarChar\(200\)/u,
  );
  assert.match(schema, /operationId\s+String\s+@unique @db\.VarChar\(191\)/u);
  assert.match(schema, /formatVersion\s+Int\s+@default\(1\)/u);
  assert.match(schema, /payload\s+Json/u);
  assert.match(
    schema,
    /@@index\(\[organizationId, occurredAt\(sort: Desc\), id\(sort: Desc\)\]\)/u,
  );
});

test('keeps source links nullable, backfills existing fiches and prevents rewrites', () => {
  assert.match(
    migration,
    /PartnerTimelineEvent_values_check[\s\S]*jsonb_typeof\("payload"\) = 'object'/u,
  );
  assert.match(migration, /PartnerTimelineEvent_operationId_key/u);
  assert.match(
    migration,
    /PartnerTimelineEvent_organizationId_occurredAt_id_idx[\s\S]*"occurredAt" DESC, "id" DESC/u,
  );
  for (const foreignKey of [
    'PartnerTimelineEvent_actorId_fkey',
    'PartnerTimelineEvent_periodId_fkey',
    'PartnerTimelineEvent_actionId_fkey',
    'PartnerTimelineEvent_followUpEntryId_fkey',
  ]) {
    const constraintIndex = migration.indexOf(foreignKey);
    assert.notEqual(constraintIndex, -1);
    assert.match(
      migration.slice(constraintIndex, constraintIndex + 500),
      /ON DELETE SET NULL/u,
    );
  }
  assert.match(
    migration,
    /INSERT INTO "public"\."PartnerTimelineEvent"[\s\S]*'RELATIONSHIP_CREATED'/u,
  );
  assert.match(migration, /PartnerFollowUpEntry_author_snapshot_check/u);
  assert.match(migration, /PartnerFollowUpAction_completer_snapshot_check/u);
  assert.match(migration, /'Système'[\s\S]*CURRENT_TIMESTAMP/u);
  assert.match(
    migration,
    /ACTION_COMPLETED[\s\S]*migration:partner-action-completed:v1:/u,
  );
  assert.match(migration, /PartnerTimelineEvent_validate_scope/u);
  assert.match(migration, /PartnerTimelineEvent_prevent_update/u);
});

test('rejects direct timeline deletes while preserving the owning fiche cascade', () => {
  assert.match(
    migration,
    /PartnerTimelineEvent_organizationId_fkey[\s\S]*ON DELETE CASCADE/u,
  );
  assert.match(
    deletionProtectionMigration,
    /CREATE FUNCTION "public"\."prevent_partner_timeline_event_delete"/u,
  );
  assert.match(
    deletionProtectionMigration,
    /IF EXISTS \([\s\S]*FROM "public"\."PartnerOrganization"[\s\S]*OLD\."organizationId"[\s\S]*RAISE EXCEPTION/u,
  );
  assert.match(
    deletionProtectionMigration,
    /PartnerTimelineEvent_prevent_delete[\s\S]*BEFORE DELETE ON "public"\."PartnerTimelineEvent"/u,
  );
});

test('requires and restores the timeline table with backup format v8', () => {
  assert.equal(DATABASE_BACKUP_FORMAT_VERSION, 8);
  const actionIndex = DATABASE_BACKUP_TABLES.findIndex(
    ({ tableName }) => tableName === 'PartnerFollowUpAction',
  );
  const timelineIndex = DATABASE_BACKUP_TABLES.findIndex(
    ({ tableName }) => tableName === 'PartnerTimelineEvent',
  );
  assert.equal(timelineIndex, actionIndex + 1);
  assert.match(readiness, /\('PartnerTimelineEvent'\)/u);
});
