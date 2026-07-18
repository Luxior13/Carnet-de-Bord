BEGIN;

-- Deployment contract: every web/worker process that still interprets
-- users:delete as the former users:archive alias must be stopped first.
--
-- Deletion is now irreversible and therefore strictly more destructive than
-- the former reversible archive. Never upgrade a historical positive grant.
-- Only an ADMIN's explicit denial is carried forward to the brand-new
-- users:delete_account capability because it is enabled by that role preset;
-- USER=false is already the role default.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "public"."User"
    WHERE jsonb_typeof("permissions") = 'object'
      AND (
        "permissions" ? 'users:delete'
        OR "permissions" ? 'users:delete_account'
      )
  ) THEN
    RAISE EXCEPTION
      'Ambiguous delete override detected; deploy all earlier permission migrations before this cutover';
  END IF;
END
$$;

WITH
"source_permissions" AS (
  SELECT
    "id",
    "role"::text AS "role",
    "permissions",
    CASE
      WHEN jsonb_typeof("permissions" -> 'users:archive') = 'boolean'
        THEN "permissions" -> 'users:archive'
      ELSE NULL
    END AS "former_archive_value"
  FROM "public"."User"
  WHERE jsonb_typeof("permissions") = 'object'
    AND (
      "permissions" ? 'users:archive'
    )
),
"updates" AS (
  SELECT
    "id",
    NULLIF(
      (
        "permissions"
          - 'users:archive'
          - 'users:delete'
          - 'users:delete_account'
      )
      || CASE
        WHEN "role" = 'ADMIN'
          AND "former_archive_value" = 'false'::jsonb
          THEN jsonb_build_object('users:delete_account', false)
        ELSE '{}'::jsonb
      END,
      '{}'::jsonb
    ) AS "permissions"
  FROM "source_permissions"
)
UPDATE "public"."User" AS "user"
SET "permissions" = "updates"."permissions"
FROM "updates"
WHERE "user"."id" = "updates"."id"
  AND "user"."permissions" IS DISTINCT FROM "updates"."permissions";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "public"."User"
    WHERE jsonb_typeof("permissions") = 'object'
      AND "permissions" ? 'users:archive'
  ) THEN
    RAISE EXCEPTION 'users:archive overrides remain after permission cutover';
  END IF;
END
$$;

-- Every legacy archived account becomes an irreversible, anonymous technical
-- tombstone. Identity reservations and durable audit snapshots are retained;
-- authentication secrets, personal inbox rows and the legacy staff profile
-- are removed.
DELETE FROM "public"."Session"
WHERE "userId" IN (
  SELECT "id" FROM "public"."User" WHERE "deletedAt" IS NOT NULL
);

DELETE FROM "public"."TotpCredential"
WHERE "userId" IN (
  SELECT "id" FROM "public"."User" WHERE "deletedAt" IS NOT NULL
);

DELETE FROM "public"."TotpEnrollment"
WHERE "userId" IN (
  SELECT "id" FROM "public"."User" WHERE "deletedAt" IS NOT NULL
);

DELETE FROM "public"."MfaRecoveryCode"
WHERE "userId" IN (
  SELECT "id" FROM "public"."User" WHERE "deletedAt" IS NOT NULL
);

DELETE FROM "public"."MfaLoginChallenge"
WHERE "userId" IN (
  SELECT "id" FROM "public"."User" WHERE "deletedAt" IS NOT NULL
);

DELETE FROM "public"."NotificationRecipient"
WHERE "userId" IN (
  SELECT "id" FROM "public"."User" WHERE "deletedAt" IS NOT NULL
);

DELETE FROM "public"."ArchivedStaffProfile"
WHERE "userId" IN (
  SELECT "id" FROM "public"."User" WHERE "deletedAt" IS NOT NULL
);

-- Live authentication identifiers keep the strict public 3-32 character
-- format. Deleted tombstones move into a separate colon-prefixed namespace
-- that no public API or LoginNameReservation row can use.
ALTER TABLE "public"."User"
DROP CONSTRAINT "User_loginName_format_check";

UPDATE "public"."User"
SET
  "contactEmail" = NULL,
  "contactEmailVerifiedAt" = NULL,
  "failedLoginAttempts" = 0,
  "firstName" = 'Compte',
  "isActive" = false,
  "isProtected" = false,
  "lastLoginAt" = NULL,
  "lastName" = 'supprimé',
  "lockedUntil" = NULL,
  "loginName" = 'deleted:' || md5("id"),
  "mfaEnabledAt" = NULL,
  "mustChangePassword" = false,
  "passwordChangedAt" = NULL,
  "passwordHash" = '!deleted:' || md5("id"),
  "permissions" = NULL,
  "role" = 'USER',
  "securityVersion" = "securityVersion" + 1,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "deletedAt" IS NOT NULL;

ALTER TABLE "public"."User"
ADD CONSTRAINT "User_loginName_format_check"
CHECK (
  (
    "deletedAt" IS NULL
    AND "loginName" ~ '^[a-z0-9][a-z0-9._-]{1,30}[a-z0-9]$'
  )
  OR (
    "deletedAt" IS NOT NULL
    AND "loginName" ~ '^deleted:[a-f0-9]{32}$'
  )
),
ADD CONSTRAINT "User_deleted_tombstone_check"
CHECK (
  "deletedAt" IS NULL
  OR (
    "contactEmail" IS NULL
    AND "contactEmailVerifiedAt" IS NULL
    AND "failedLoginAttempts" = 0
    AND "firstName" = 'Compte'
    AND "isActive" = false
    AND "isProtected" = false
    AND "lastLoginAt" IS NULL
    AND "lastName" = 'supprimé'
    AND "lockedUntil" IS NULL
    AND "loginName" ~ '^deleted:[a-f0-9]{32}$'
    AND "mfaEnabledAt" IS NULL
    AND "mustChangePassword" = false
    AND "passwordChangedAt" IS NULL
    AND "passwordHash" = '!' || "loginName"
    AND "permissions" IS NULL
    AND "role" = 'USER'
  )
);

CREATE OR REPLACE FUNCTION "prevent_deleted_user_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Deleted user tombstones are immutable';
END;
$$;

CREATE TRIGGER "User_prevent_deleted_tombstone_mutation"
BEFORE UPDATE OR DELETE ON "public"."User"
FOR EACH ROW
WHEN (OLD."deletedAt" IS NOT NULL)
EXECUTE FUNCTION "prevent_deleted_user_mutation"();

-- The application already blocks root lifecycle mutations. Keep the same
-- invariant at the database boundary without preventing ordinary root profile
-- or credential updates.
CREATE OR REPLACE FUNCTION "prevent_protected_root_lifecycle_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'The protected root account cannot be deleted';
  END IF;

  IF NEW."isProtected" IS DISTINCT FROM true
    OR NEW."role" <> 'ADMIN'
    OR NEW."isActive" IS DISTINCT FROM true
    OR NEW."deletedAt" IS NOT NULL
  THEN
    RAISE EXCEPTION 'The protected root lifecycle state is immutable';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "User_protect_root_lifecycle"
BEFORE UPDATE OR DELETE ON "public"."User"
FOR EACH ROW
WHEN (OLD."isProtected" = true)
EXECUTE FUNCTION "prevent_protected_root_lifecycle_mutation"();

COMMIT;
