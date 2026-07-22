-- Person identity foundation: canonical people, field-level audit details and
-- synchronous deletion safeguards. All additions are nullable or isolated from
-- existing rows so the migration remains deployable without a data rewrite.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TYPE "PersonStructureStatus" AS ENUM ('IN_STRUCTURE', 'OUTSIDE_STRUCTURE');
CREATE TYPE "AuditFieldChangeType" AS ENUM ('CREATE', 'UPDATE', 'DELETE');
CREATE TYPE "AuditValueStorageMode" AS ENUM ('PLAIN', 'ENCRYPTED', 'NONE');

ALTER TYPE "AuditAction" ADD VALUE 'PERSON_CREATE';
ALTER TYPE "AuditAction" ADD VALUE 'PERSON_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE 'PERSON_DELETE';
ALTER TYPE "AuditCategory" ADD VALUE 'PERSON';

ALTER TABLE "public"."AuditLog"
ADD COLUMN "entityType" VARCHAR(40),
ADD COLUMN "entityId" VARCHAR(128);

ALTER TABLE "public"."AuditLog"
ADD CONSTRAINT "AuditLog_entity_subject_pair_check"
CHECK (("entityType" IS NULL) = ("entityId" IS NULL));

ALTER TABLE "public"."AuditLog"
ADD CONSTRAINT "AuditLog_person_event_shape_check"
CHECK (
    (
        "action"::text IN ('PERSON_CREATE', 'PERSON_UPDATE', 'PERSON_DELETE')
        AND "category"::text = 'PERSON'
        AND "stream"::text = 'IDENTITY'
        AND "entityType" = 'PERSON'
        AND "entityId" IS NOT NULL
    )
    OR (
        "action"::text NOT IN ('PERSON_CREATE', 'PERSON_UPDATE', 'PERSON_DELETE')
        AND "category"::text <> 'PERSON'
    )
);

CREATE UNIQUE INDEX "AuditLog_id_entityType_entityId_key"
ON "public"."AuditLog"("id", "entityType", "entityId");

CREATE INDEX "AuditLog_entityType_entityId_createdAt_id_idx"
ON "public"."AuditLog"("entityType", "entityId", "createdAt", "id");

-- Audit actors are retained as anonymous User tombstones. RESTRICT therefore
-- preserves immutable technical references instead of relying on a later
-- SET NULL update to an audit event.
ALTER TABLE "public"."AuditLog"
DROP CONSTRAINT "AuditLog_userId_fkey",
ADD CONSTRAINT "AuditLog_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "public"."User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."AuditLog"
DROP CONSTRAINT "AuditLog_targetUserId_fkey",
ADD CONSTRAINT "AuditLog_targetUserId_fkey"
FOREIGN KEY ("targetUserId") REFERENCES "public"."User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "public"."AuditEncryptionKeyVersion" (
    "version" INTEGER NOT NULL,
    "algorithm" VARCHAR(32) NOT NULL DEFAULT 'AES-256-GCM',
    "firstUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditEncryptionKeyVersion_pkey" PRIMARY KEY ("version"),
    CONSTRAINT "AuditEncryptionKeyVersion_version_check" CHECK ("version" >= 1),
    CONSTRAINT "AuditEncryptionKeyVersion_algorithm_check" CHECK ("algorithm" = 'AES-256-GCM')
);

CREATE TABLE "public"."Person" (
    "id" TEXT NOT NULL,
    "nickname" VARCHAR(80),
    "normalizedNickname" VARCHAR(160),
    "firstName" VARCHAR(100),
    "normalizedFirstName" VARCHAR(200),
    "lastName" VARCHAR(100),
    "normalizedLastName" VARCHAR(200),
    "birthDate" DATE,
    "structureStatus" "PersonStructureStatus" NOT NULL DEFAULT 'OUTSIDE_STRUCTURE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Person_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Person_version_check" CHECK ("version" >= 1),
    CONSTRAINT "Person_nickname_pair_check" CHECK (
        ("nickname" IS NULL AND "normalizedNickname" IS NULL)
        OR (
            "nickname" IS NOT NULL
            AND "normalizedNickname" IS NOT NULL
            AND "nickname" = btrim("nickname")
            AND "nickname" <> ''
            AND "normalizedNickname" = btrim("normalizedNickname")
            AND "normalizedNickname" <> ''
        )
    ),
    CONSTRAINT "Person_first_name_pair_check" CHECK (
        ("firstName" IS NULL AND "normalizedFirstName" IS NULL)
        OR (
            "firstName" IS NOT NULL
            AND "normalizedFirstName" IS NOT NULL
            AND "firstName" = btrim("firstName")
            AND "firstName" <> ''
            AND "normalizedFirstName" = btrim("normalizedFirstName")
            AND "normalizedFirstName" <> ''
        )
    ),
    CONSTRAINT "Person_last_name_pair_check" CHECK (
        ("lastName" IS NULL AND "normalizedLastName" IS NULL)
        OR (
            "lastName" IS NOT NULL
            AND "normalizedLastName" IS NOT NULL
            AND "lastName" = btrim("lastName")
            AND "lastName" <> ''
            AND "normalizedLastName" = btrim("normalizedLastName")
            AND "normalizedLastName" <> ''
        )
    ),
    CONSTRAINT "Person_minimum_identity_check" CHECK (
        "nickname" IS NOT NULL
        OR ("firstName" IS NOT NULL AND "lastName" IS NOT NULL)
    )
);

CREATE TABLE "public"."PersonEmail" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "normalizedEmail" VARCHAR(320) NOT NULL,
    "label" VARCHAR(40) NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PersonEmail_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PersonEmail_version_check" CHECK ("version" >= 1),
    CONSTRAINT "PersonEmail_values_check" CHECK (
        "email" = btrim("email") AND "email" <> ''
        AND "normalizedEmail" = btrim("normalizedEmail") AND "normalizedEmail" <> ''
        AND "label" = btrim("label") AND "label" <> ''
    )
);

CREATE TABLE "public"."PersonPhone" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "phone" VARCHAR(40) NOT NULL,
    "normalizedPhone" VARCHAR(16) NOT NULL,
    "label" VARCHAR(40) NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PersonPhone_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PersonPhone_version_check" CHECK ("version" >= 1),
    CONSTRAINT "PersonPhone_values_check" CHECK (
        "phone" = btrim("phone") AND "phone" <> ''
        AND "normalizedPhone" ~ '^\+[1-9][0-9]{1,14}$'
        AND "label" = btrim("label") AND "label" <> ''
    )
);

CREATE TABLE "public"."PersonSocialProfile" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "networkKey" VARCHAR(40) NOT NULL,
    "identifier" VARCHAR(100),
    "normalizedIdentifier" VARCHAR(100),
    "profileUrl" VARCHAR(2048),
    "normalizedProfileUrl" VARCHAR(2048),
    "normalizedProfileUrlHash" CHAR(64),
    "label" VARCHAR(40) NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PersonSocialProfile_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PersonSocialProfile_version_check" CHECK ("version" >= 1),
    CONSTRAINT "PersonSocialProfile_network_key_check" CHECK (
        "networkKey" ~ '^[a-z0-9][a-z0-9_-]{0,39}$'
    ),
    CONSTRAINT "PersonSocialProfile_label_check" CHECK (
        "label" = btrim("label") AND "label" <> ''
    ),
    CONSTRAINT "PersonSocialProfile_identifier_pair_check" CHECK (
        ("identifier" IS NULL AND "normalizedIdentifier" IS NULL)
        OR (
            "identifier" IS NOT NULL
            AND "normalizedIdentifier" IS NOT NULL
            AND "identifier" = btrim("identifier")
            AND "identifier" <> ''
            AND "normalizedIdentifier" = btrim("normalizedIdentifier")
            AND "normalizedIdentifier" <> ''
        )
    ),
    CONSTRAINT "PersonSocialProfile_url_set_check" CHECK (
        ("profileUrl" IS NULL AND "normalizedProfileUrl" IS NULL AND "normalizedProfileUrlHash" IS NULL)
        OR (
            "profileUrl" IS NOT NULL
            AND "normalizedProfileUrl" IS NOT NULL
            AND "normalizedProfileUrlHash" IS NOT NULL
            AND "profileUrl" = btrim("profileUrl")
            AND "profileUrl" <> ''
            AND "normalizedProfileUrl" = btrim("normalizedProfileUrl")
            AND "normalizedProfileUrl" <> ''
            AND "normalizedProfileUrlHash" ~ '^[0-9a-f]{64}$'
        )
    ),
    CONSTRAINT "PersonSocialProfile_identifier_or_url_check" CHECK (
        "identifier" IS NOT NULL OR "profileUrl" IS NOT NULL
    )
);

CREATE TABLE "public"."PersonDeletionTombstone" (
    "personId" VARCHAR(128) NOT NULL,
    "deletionOperationId" VARCHAR(191) NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PersonDeletionTombstone_pkey" PRIMARY KEY ("personId"),
    CONSTRAINT "PersonDeletionTombstone_values_check" CHECK (
        "personId" = btrim("personId") AND "personId" <> ''
        AND "deletionOperationId" = btrim("deletionOperationId")
        AND "deletionOperationId" <> ''
    )
);

CREATE TABLE "public"."AuditFieldChange" (
    "id" TEXT NOT NULL,
    "auditLogId" TEXT NOT NULL,
    "entityType" VARCHAR(40) NOT NULL,
    "entityId" VARCHAR(128) NOT NULL,
    "sectionKey" VARCHAR(64) NOT NULL,
    "fieldKey" VARCHAR(100) NOT NULL,
    "recordId" VARCHAR(128),
    "changeType" "AuditFieldChangeType" NOT NULL,
    "valueMode" "AuditValueStorageMode" NOT NULL,
    "beforeValue" VARCHAR(512),
    "afterValue" VARCHAR(512),
    "valuesCiphertext" BYTEA,
    "valuesIv" BYTEA,
    "valuesAuthTag" BYTEA,
    "valueKeyVersion" INTEGER,
    "beforeHash" CHAR(64),
    "afterHash" CHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AuditFieldChange_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AuditFieldChange_keys_check" CHECK (
        "entityType" ~ '^[A-Z][A-Z0-9_]{0,39}$'
        AND "entityId" = btrim("entityId") AND "entityId" <> ''
        AND "sectionKey" ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$'
        AND "fieldKey" ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$'
        AND ("recordId" IS NULL OR ("recordId" = btrim("recordId") AND "recordId" <> ''))
    ),
    CONSTRAINT "AuditFieldChange_hashes_check" CHECK (
        ("beforeHash" IS NULL OR "beforeHash" ~ '^[0-9a-f]{64}$')
        AND ("afterHash" IS NULL OR "afterHash" ~ '^[0-9a-f]{64}$')
    ),
    CONSTRAINT "AuditFieldChange_storage_check" CHECK (
        (
            "valueMode" = 'PLAIN'
            AND ("beforeValue" IS NOT NULL OR "afterValue" IS NOT NULL)
            AND "valuesCiphertext" IS NULL
            AND "valuesIv" IS NULL
            AND "valuesAuthTag" IS NULL
            AND "valueKeyVersion" IS NULL
            AND "beforeHash" IS NULL
            AND "afterHash" IS NULL
        )
        OR (
            "valueMode" = 'ENCRYPTED'
            AND "beforeValue" IS NULL
            AND "afterValue" IS NULL
            AND "valuesCiphertext" IS NOT NULL
            AND octet_length("valuesCiphertext") BETWEEN 1 AND 8192
            AND "valuesIv" IS NOT NULL
            AND octet_length("valuesIv") = 12
            AND "valuesAuthTag" IS NOT NULL
            AND octet_length("valuesAuthTag") = 16
            AND "valueKeyVersion" IS NOT NULL
            AND "beforeHash" IS NULL
            AND "afterHash" IS NULL
        )
        OR (
            "valueMode" = 'NONE'
            AND "beforeValue" IS NULL
            AND "afterValue" IS NULL
            AND "valuesCiphertext" IS NULL
            AND "valuesIv" IS NULL
            AND "valuesAuthTag" IS NULL
            AND "valueKeyVersion" IS NULL
        )
    )
);

CREATE UNIQUE INDEX "PersonEmail_personId_normalizedEmail_key"
ON "public"."PersonEmail"("personId", "normalizedEmail");
CREATE INDEX "PersonEmail_normalizedEmail_idx"
ON "public"."PersonEmail"("normalizedEmail");
CREATE INDEX "PersonEmail_normalizedEmail_prefix_idx"
ON "public"."PersonEmail"("normalizedEmail" varchar_pattern_ops);
CREATE UNIQUE INDEX "PersonEmail_one_primary_per_person_idx"
ON "public"."PersonEmail"("personId") WHERE "isPrimary" = true;

CREATE UNIQUE INDEX "PersonPhone_personId_normalizedPhone_key"
ON "public"."PersonPhone"("personId", "normalizedPhone");
CREATE INDEX "PersonPhone_normalizedPhone_idx"
ON "public"."PersonPhone"("normalizedPhone");
CREATE INDEX "PersonPhone_normalizedPhone_prefix_idx"
ON "public"."PersonPhone"("normalizedPhone" varchar_pattern_ops);
CREATE UNIQUE INDEX "PersonPhone_one_primary_per_person_idx"
ON "public"."PersonPhone"("personId") WHERE "isPrimary" = true;

CREATE UNIQUE INDEX "PersonSocialProfile_personId_networkKey_normalizedIdentifier_key"
ON "public"."PersonSocialProfile"("personId", "networkKey", "normalizedIdentifier");
CREATE UNIQUE INDEX "PersonSocialProfile_personId_networkKey_normalizedProfileUrlHash_key"
ON "public"."PersonSocialProfile"("personId", "networkKey", "normalizedProfileUrlHash");
CREATE INDEX "PersonSocialProfile_normalizedIdentifier_idx"
ON "public"."PersonSocialProfile"("normalizedIdentifier");
CREATE INDEX "PersonSocialProfile_normalizedIdentifier_prefix_idx"
ON "public"."PersonSocialProfile"("normalizedIdentifier" varchar_pattern_ops);
CREATE INDEX "PersonSocialProfile_normalizedProfileUrlHash_idx"
ON "public"."PersonSocialProfile"("normalizedProfileUrlHash");
CREATE UNIQUE INDEX "PersonSocialProfile_one_primary_per_network_idx"
ON "public"."PersonSocialProfile"("personId", "networkKey") WHERE "isPrimary" = true;

CREATE INDEX "Person_createdAt_id_idx" ON "public"."Person"("createdAt", "id");
CREATE INDEX "Person_structureStatus_createdAt_id_idx"
ON "public"."Person"("structureStatus", "createdAt", "id");
CREATE INDEX "Person_normalizedNickname_trgm_idx"
ON "public"."Person" USING GIN ("normalizedNickname" gin_trgm_ops);
CREATE INDEX "Person_normalizedFirstName_trgm_idx"
ON "public"."Person" USING GIN ("normalizedFirstName" gin_trgm_ops);
CREATE INDEX "Person_normalizedLastName_trgm_idx"
ON "public"."Person" USING GIN ("normalizedLastName" gin_trgm_ops);
CREATE INDEX "Person_normalizedNickname_prefix_idx"
ON "public"."Person"("normalizedNickname" varchar_pattern_ops);
CREATE INDEX "Person_normalizedFirstName_prefix_idx"
ON "public"."Person"("normalizedFirstName" varchar_pattern_ops);
CREATE INDEX "Person_normalizedLastName_prefix_idx"
ON "public"."Person"("normalizedLastName" varchar_pattern_ops);

CREATE UNIQUE INDEX "PersonDeletionTombstone_deletionOperationId_key"
ON "public"."PersonDeletionTombstone"("deletionOperationId");

CREATE INDEX "AuditFieldChange_auditLogId_idx"
ON "public"."AuditFieldChange"("auditLogId");
CREATE INDEX "AuditFieldChange_entityType_entityId_sectionKey_fieldKey_recordId_createdAt_id_idx"
ON "public"."AuditFieldChange"(
    "entityType", "entityId", "sectionKey", "fieldKey", "recordId", "createdAt", "id"
);
CREATE INDEX "AuditFieldChange_valueKeyVersion_idx"
ON "public"."AuditFieldChange"("valueKeyVersion");

ALTER TABLE "public"."PersonEmail"
ADD CONSTRAINT "PersonEmail_personId_fkey"
FOREIGN KEY ("personId") REFERENCES "public"."Person"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."PersonPhone"
ADD CONSTRAINT "PersonPhone_personId_fkey"
FOREIGN KEY ("personId") REFERENCES "public"."Person"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."PersonSocialProfile"
ADD CONSTRAINT "PersonSocialProfile_personId_fkey"
FOREIGN KEY ("personId") REFERENCES "public"."Person"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."AuditFieldChange"
ADD CONSTRAINT "AuditFieldChange_auditLogId_entityType_entityId_fkey"
FOREIGN KEY ("auditLogId", "entityType", "entityId")
REFERENCES "public"."AuditLog"("id", "entityType", "entityId")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."AuditFieldChange"
ADD CONSTRAINT "AuditFieldChange_valueKeyVersion_fkey"
FOREIGN KEY ("valueKeyVersion") REFERENCES "public"."AuditEncryptionKeyVersion"("version")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION "guard_audit_log_mutation"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
    call_context TEXT;
    delete_context TEXT;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION 'Audit events are append-only';
    END IF;

    delete_context := current_setting('app.audit_delete_context', true);
    GET DIAGNOSTICS call_context = PG_CONTEXT;
    IF TG_OP = 'DELETE'
       AND delete_context = 'retention'
       AND strpos(call_context, 'purge_expired_audit_logs(integer)') > 0 THEN
        RETURN OLD;
    END IF;

    RAISE EXCEPTION 'Audit events can only be deleted by the retention procedure';
END;
$$;

CREATE TRIGGER "AuditLog_guard_mutation"
BEFORE UPDATE OR DELETE ON "public"."AuditLog"
FOR EACH ROW
EXECUTE FUNCTION "guard_audit_log_mutation"();

CREATE OR REPLACE FUNCTION "validate_audit_field_change_parent"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    parent_created_at TIMESTAMP(3);
BEGIN
    SELECT "createdAt"
    INTO parent_created_at
    FROM "public"."AuditLog"
    WHERE "id" = NEW."auditLogId"
      AND "entityType" = NEW."entityType"
      AND "entityId" = NEW."entityId";

    IF parent_created_at IS NULL OR parent_created_at IS DISTINCT FROM NEW."createdAt" THEN
        RAISE EXCEPTION 'Audit field change timestamp must match its parent event';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER "AuditFieldChange_validate_parent"
BEFORE INSERT ON "public"."AuditFieldChange"
FOR EACH ROW
EXECUTE FUNCTION "validate_audit_field_change_parent"();

CREATE OR REPLACE FUNCTION "guard_audit_field_change_mutation"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
    call_context TEXT;
    delete_context TEXT;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION 'Audit field changes are append-only';
    END IF;

    delete_context := current_setting('app.audit_delete_context', true);
    GET DIAGNOSTICS call_context = PG_CONTEXT;
    IF TG_OP = 'DELETE'
       AND delete_context = 'retention'
       AND strpos(call_context, 'purge_expired_audit_logs(integer)') > 0 THEN
        RETURN OLD;
    END IF;
    IF TG_OP = 'DELETE'
       AND OLD."entityType" = 'PERSON'
       AND delete_context = 'person:' || OLD."entityId"
       AND strpos(
           call_context,
           'purge_person_audit_field_changes(text)'
       ) > 0 THEN
        RETURN OLD;
    END IF;

    RAISE EXCEPTION 'Audit field changes can only be deleted by a controlled purge procedure';
END;
$$;

CREATE TRIGGER "AuditFieldChange_guard_mutation"
BEFORE UPDATE OR DELETE ON "public"."AuditFieldChange"
FOR EACH ROW
EXECUTE FUNCTION "guard_audit_field_change_mutation"();

-- Audit deletion is deliberately exposed through two narrow, reviewed paths.
-- The expected duration prevents a stale maintenance invocation from applying
-- a shorter value after an administrator has increased retention.
CREATE OR REPLACE FUNCTION "purge_expired_audit_logs"(
    expected_retention_days INTEGER
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    configured_retention_days INTEGER;
    deleted_count BIGINT;
    previous_context TEXT;
BEGIN
    previous_context := current_setting('app.audit_delete_context', true);
    -- The matching setting mutation takes the same transaction-level lock,
    -- including while the first row is being inserted.
    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended('system-setting:audit.retentionDays', 0)
    );
    SELECT CASE
        WHEN jsonb_typeof(setting."value") = 'number'
            THEN (setting."value" #>> '{}')::INTEGER
        ELSE NULL
    END
    INTO configured_retention_days
    FROM "public"."SystemSetting" setting
    WHERE setting."key" = 'audit.retentionDays'
    FOR SHARE;

    IF NOT FOUND THEN
        configured_retention_days := 1095;
    END IF;

    IF configured_retention_days IS NULL
       OR configured_retention_days < 365
       OR configured_retention_days > 3650 THEN
        RAISE EXCEPTION 'Stored audit retention is invalid';
    END IF;
    IF expected_retention_days IS DISTINCT FROM configured_retention_days THEN
        RAISE EXCEPTION 'Audit retention changed while cleanup was being prepared';
    END IF;

    PERFORM set_config('app.audit_delete_context', 'retention', true);
    DELETE FROM "public"."AuditLog"
    WHERE "createdAt" < (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
      - make_interval(days => configured_retention_days);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    PERFORM set_config(
        'app.audit_delete_context',
        COALESCE(previous_context, ''),
        true
    );

    RETURN deleted_count;
EXCEPTION WHEN OTHERS THEN
    PERFORM set_config(
        'app.audit_delete_context',
        COALESCE(previous_context, ''),
        true
    );
    RAISE;
END;
$$;

CREATE OR REPLACE FUNCTION "purge_person_audit_field_changes"(
    target_person_id TEXT
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    deleted_count BIGINT;
    previous_context TEXT;
BEGIN
    previous_context := current_setting('app.audit_delete_context', true);
    IF target_person_id IS NULL
       OR target_person_id = ''
       OR target_person_id <> btrim(target_person_id) THEN
        RAISE EXCEPTION 'A canonical person identifier is required';
    END IF;
    PERFORM 1
    FROM "public"."Person" person
    WHERE person."id" = target_person_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'The person must exist and be locked for deletion';
    END IF;

    PERFORM set_config(
        'app.audit_delete_context',
        'person:' || target_person_id,
        true
    );
    DELETE FROM "public"."AuditFieldChange"
    WHERE "entityType" = 'PERSON'
      AND "entityId" = target_person_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    PERFORM set_config(
        'app.audit_delete_context',
        COALESCE(previous_context, ''),
        true
    );

    RETURN deleted_count;
EXCEPTION WHEN OTHERS THEN
    PERFORM set_config(
        'app.audit_delete_context',
        COALESCE(previous_context, ''),
        true
    );
    RAISE;
END;
$$;

-- PostgreSQL grants EXECUTE on new functions to PUBLIC by default. Keep these
-- SECURITY DEFINER entry points private to the migration owner; deployments
-- using a distinct runtime role must grant that role explicitly.
REVOKE ALL ON FUNCTION "purge_expired_audit_logs"(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION "purge_person_audit_field_changes"(TEXT) FROM PUBLIC;

CREATE OR REPLACE FUNCTION "prevent_audit_key_version_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Audit encryption key inventory is append-only';
END;
$$;

CREATE TRIGGER "AuditEncryptionKeyVersion_prevent_mutation"
BEFORE UPDATE OR DELETE ON "public"."AuditEncryptionKeyVersion"
FOR EACH ROW
EXECUTE FUNCTION "prevent_audit_key_version_mutation"();

CREATE OR REPLACE FUNCTION "prevent_person_tombstone_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Person deletion tombstones are immutable';
END;
$$;

CREATE TRIGGER "PersonDeletionTombstone_prevent_mutation"
BEFORE UPDATE OR DELETE ON "public"."PersonDeletionTombstone"
FOR EACH ROW
EXECUTE FUNCTION "prevent_person_tombstone_mutation"();

-- Rollout A deliberately preserves superseded permission overrides for old
-- binaries that may still be draining. Rollout B is an explicit operator
-- action after every legacy web instance has stopped; see OPERATIONS.md.

COMMIT;
