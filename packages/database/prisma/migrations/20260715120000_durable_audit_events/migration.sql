-- Extend the audit taxonomy without rewriting existing action values.
ALTER TYPE "public"."AuditAction" ADD VALUE IF NOT EXISTS 'MFA_RESET';
ALTER TYPE "public"."AuditAction" ADD VALUE IF NOT EXISTS 'AUDIT_EXPORT';
ALTER TYPE "public"."AuditAction" ADD VALUE IF NOT EXISTS 'STEP_UP_SUCCESS';
ALTER TYPE "public"."AuditAction" ADD VALUE IF NOT EXISTS 'STEP_UP_FAILED';

CREATE TYPE "public"."AuditEventKind" AS ENUM ('ACTIVITY', 'CONNECTION');
CREATE TYPE "public"."AuditStream" AS ENUM (
    'AUTHENTICATION',
    'SECURITY',
    'IDENTITY',
    'AUTHORIZATION',
    'SYSTEM'
);
CREATE TYPE "public"."AuditOutcome" AS ENUM ('SUCCESS', 'FAILURE', 'NEUTRAL');
CREATE TYPE "public"."AuditSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

ALTER TABLE "public"."AuditLog"
    ADD COLUMN "actorDisplayNameSnapshot" TEXT,
    ADD COLUMN "actorLoginNameSnapshot" TEXT,
    ADD COLUMN "actorRoleSnapshot" "public"."UserRole",
    ADD COLUMN "targetDisplayNameSnapshot" TEXT,
    ADD COLUMN "targetLoginNameSnapshot" TEXT,
    ADD COLUMN "targetRoleSnapshot" "public"."UserRole",
    ADD COLUMN "eventKind" "public"."AuditEventKind" NOT NULL DEFAULT 'ACTIVITY',
    ADD COLUMN "stream" "public"."AuditStream" NOT NULL DEFAULT 'SYSTEM',
    ADD COLUMN "outcome" "public"."AuditOutcome" NOT NULL DEFAULT 'SUCCESS',
    ADD COLUMN "severity" "public"."AuditSeverity" NOT NULL DEFAULT 'INFO',
    ADD COLUMN "eventVersion" INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN "requestId" TEXT,
    ADD CONSTRAINT "AuditLog_eventVersion_check" CHECK ("eventVersion" >= 1);

-- Preserve the server-generated request correlation identifier as a first-class
-- field. The metadata copy remains untouched for backward compatibility.
UPDATE "public"."AuditLog"
SET "requestId" = NULLIF(BTRIM("metadata" ->> 'requestId'), '')
WHERE "requestId" IS NULL
  AND jsonb_typeof("metadata") = 'object';

-- Snapshot the actor identity as it exists while this migration is applied.
-- Future writes populate the same fields in the transaction that creates the
-- audit event, so later profile changes cannot rewrite history.
UPDATE "public"."AuditLog" AS audit
SET
    "actorDisplayNameSnapshot" = COALESCE(
        NULLIF(
            BTRIM(CONCAT_WS(
                ' ',
                NULLIF(BTRIM(actor."firstName"), ''),
                NULLIF(BTRIM(actor."lastName"), '')
            )),
            ''
        ),
        actor."loginName"
    ),
    "actorLoginNameSnapshot" = actor."loginName",
    "actorRoleSnapshot" = actor."role"
FROM "public"."User" AS actor
WHERE audit."userId" = actor."id";

-- Prefer the historical target label already stored by mutation routes, then
-- fill the remaining fields from the current target record when it still
-- exists. No contact details or credentials are copied into the snapshots.
UPDATE "public"."AuditLog"
SET
    "targetDisplayNameSnapshot" = NULLIF(
        BTRIM("metadata" ->> 'targetName'),
        ''
    ),
    "targetLoginNameSnapshot" = NULLIF(
        BTRIM("metadata" ->> 'loginName'),
        ''
    ),
    "targetRoleSnapshot" = CASE
        WHEN "metadata" ->> 'role' IN ('ADMIN', 'USER')
            THEN ("metadata" ->> 'role')::"public"."UserRole"
        ELSE NULL
    END
WHERE jsonb_typeof("metadata") = 'object';

UPDATE "public"."AuditLog" AS audit
SET
    "targetDisplayNameSnapshot" = COALESCE(
        audit."targetDisplayNameSnapshot",
        NULLIF(
            BTRIM(CONCAT_WS(
                ' ',
                NULLIF(BTRIM(target."firstName"), ''),
                NULLIF(BTRIM(target."lastName"), '')
            )),
            ''
        ),
        target."loginName"
    ),
    "targetLoginNameSnapshot" = COALESCE(
        audit."targetLoginNameSnapshot",
        target."loginName"
    ),
    "targetRoleSnapshot" = COALESCE(
        audit."targetRoleSnapshot",
        target."role"
    )
FROM "public"."User" AS target
WHERE audit."targetUserId" = target."id";

-- Backfill the typed event classification from the stable AuditAction enum.
UPDATE "public"."AuditLog"
SET
    "eventKind" = (
        CASE
            WHEN "action" IN (
                'LOGIN_SUCCESS',
                'LOGIN_FAILED',
                'LOGOUT',
                'ACCOUNT_LOCKED'
            ) THEN 'CONNECTION'
            ELSE 'ACTIVITY'
        END
    )::"public"."AuditEventKind",
    "stream" = (
        CASE
            WHEN "action" IN (
                'LOGIN_SUCCESS',
                'LOGIN_FAILED',
                'LOGOUT',
                'ACCOUNT_LOCKED'
            ) THEN 'AUTHENTICATION'
            WHEN "action" IN (
                'PASSWORD_CHANGE',
                'PASSWORD_RESET',
                'SESSION_INVALIDATE',
                'MFA_ENABLED',
                'MFA_DISABLED',
                'MFA_RECOVERY_CODE_USED',
                'MFA_RECOVERY_CODES_REGENERATED'
            ) THEN 'SECURITY'
            WHEN "action" IN (
                'USER_CREATE',
                'USER_UPDATE',
                'USER_DELETE',
                'USER_ACTIVATE',
                'USER_DEACTIVATE'
            ) THEN 'IDENTITY'
            WHEN "action" = 'PERMISSION_UPDATE' THEN 'AUTHORIZATION'
            ELSE 'SYSTEM'
        END
    )::"public"."AuditStream",
    "outcome" = (
        CASE
            WHEN "action" IN ('LOGIN_FAILED', 'ACCOUNT_LOCKED') THEN 'FAILURE'
            WHEN "action" = 'LOGOUT' THEN 'NEUTRAL'
            ELSE 'SUCCESS'
        END
    )::"public"."AuditOutcome",
    "severity" = (
        CASE
            WHEN "action" IN (
                'USER_DELETE',
                'PERMISSION_UPDATE'
            ) THEN 'CRITICAL'
            WHEN "action" IN (
                'LOGIN_FAILED',
                'ACCOUNT_LOCKED',
                'PASSWORD_RESET',
                'SESSION_INVALIDATE',
                'MFA_DISABLED',
                'MFA_RECOVERY_CODE_USED',
                'MFA_RECOVERY_CODES_REGENERATED',
                'USER_DEACTIVATE'
            ) THEN 'WARNING'
            ELSE 'INFO'
        END
    )::"public"."AuditSeverity";

CREATE INDEX "AuditLog_eventKind_createdAt_id_idx"
ON "public"."AuditLog"("eventKind", "createdAt", "id");

CREATE INDEX "AuditLog_stream_createdAt_id_idx"
ON "public"."AuditLog"("stream", "createdAt", "id");

CREATE INDEX "AuditLog_outcome_createdAt_id_idx"
ON "public"."AuditLog"("outcome", "createdAt", "id");

CREATE INDEX "AuditLog_severity_createdAt_id_idx"
ON "public"."AuditLog"("severity", "createdAt", "id");

CREATE INDEX "AuditLog_requestId_idx"
ON "public"."AuditLog"("requestId");

-- Identity snapshots are evidence captured at event time. They may be read or
-- retained according to policy, but never rewritten after insertion.
CREATE FUNCTION "public"."prevent_audit_snapshot_mutation"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD."actorDisplayNameSnapshot" IS DISTINCT FROM NEW."actorDisplayNameSnapshot"
        OR OLD."actorLoginNameSnapshot" IS DISTINCT FROM NEW."actorLoginNameSnapshot"
        OR OLD."actorRoleSnapshot" IS DISTINCT FROM NEW."actorRoleSnapshot"
        OR OLD."targetDisplayNameSnapshot" IS DISTINCT FROM NEW."targetDisplayNameSnapshot"
        OR OLD."targetLoginNameSnapshot" IS DISTINCT FROM NEW."targetLoginNameSnapshot"
        OR OLD."targetRoleSnapshot" IS DISTINCT FROM NEW."targetRoleSnapshot"
    THEN
        RAISE EXCEPTION 'Audit identity snapshots are immutable';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER "AuditLog_immutable_identity_snapshots"
BEFORE UPDATE OF
    "actorDisplayNameSnapshot",
    "actorLoginNameSnapshot",
    "actorRoleSnapshot",
    "targetDisplayNameSnapshot",
    "targetLoginNameSnapshot",
    "targetRoleSnapshot"
ON "public"."AuditLog"
FOR EACH ROW
EXECUTE FUNCTION "public"."prevent_audit_snapshot_mutation"();
