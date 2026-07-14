BEGIN;

-- Separate the stable authentication identifier from the optional contact
-- address. Existing email addresses are retained as unverified contact data.
ALTER TABLE "public"."User"
ADD COLUMN "loginName" TEXT,
ADD COLUMN "contactEmail" TEXT,
ADD COLUMN "contactEmailVerifiedAt" TIMESTAMP(3),
ADD COLUMN "securityVersion" INTEGER NOT NULL DEFAULT 0;

-- A session records the security state under which it was issued. Existing
-- rows receive version zero temporarily; all legacy sessions are purged below
-- as part of the identity cut-over.
ALTER TABLE "public"."Session"
ADD COLUMN "securityVersion" INTEGER NOT NULL DEFAULT 0;

-- Current user identifiers are lowercase CUIDs. Prefixing the immutable id
-- produces a unique login name without deriving identity from an email address.
UPDATE "public"."User"
SET
  "loginName" = 'user-' || lower("id"),
  "contactEmail" = "email",
  "contactEmailVerifiedAt" = NULL;

-- Login-name changes are no longer delegable. Remove the obsolete override
-- from legacy JSON objects so it cannot reappear if an older snapshot is read.
UPDATE "public"."User"
SET "permissions" = "permissions" - 'users:update_login'
WHERE jsonb_typeof("permissions") = 'object'
  AND "permissions" ? 'users:update_login';

-- Refuse to continue instead of truncating or silently merging unexpected
-- legacy identifiers that cannot satisfy the login-name contract.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "public"."User"
    WHERE "loginName" !~ '^[a-z0-9][a-z0-9._-]{1,30}[a-z0-9]$'
  ) THEN
    RAISE EXCEPTION 'Unable to derive a valid loginName from one or more User ids';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "public"."User"
    GROUP BY "loginName"
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Unable to derive unique loginName values from User ids';
  END IF;
END
$$;

ALTER TABLE "public"."User"
ALTER COLUMN "loginName" SET NOT NULL;

-- Remove every invariant and index tied to the former authentication email
-- before dropping the column itself.
ALTER TABLE "public"."User"
DROP CONSTRAINT IF EXISTS "User_email_normalized_check";

DROP INDEX IF EXISTS "public"."User_email_key";
DROP INDEX IF EXISTS "public"."User_email_idx";
DROP INDEX IF EXISTS "public"."User_email_lower_key";
DROP INDEX IF EXISTS "public"."User_email_trgm_idx";

ALTER TABLE "public"."User"
DROP COLUMN "email";

-- Authentication state derived from the former email identifier must not
-- survive the identity cut-over. Every member signs in again using loginName.
DELETE FROM "public"."Session";
DELETE FROM "public"."RateLimit";

-- Enforce the same canonical form at the database boundary as in the API.
ALTER TABLE "public"."User"
ADD CONSTRAINT "User_loginName_format_check"
CHECK ("loginName" ~ '^[a-z0-9][a-z0-9._-]{1,30}[a-z0-9]$'),
ADD CONSTRAINT "User_contactEmail_normalized_check"
CHECK (
  "contactEmail" IS NULL
  OR "contactEmail" = lower(btrim("contactEmail"))
),
ADD CONSTRAINT "User_contactEmail_verification_check"
CHECK (
  "contactEmail" IS NOT NULL
  OR "contactEmailVerifiedAt" IS NULL
);

CREATE UNIQUE INDEX "User_loginName_key"
ON "public"."User"("loginName");

-- Keep a permanent ownership history for every authentication identifier.
-- Reservations deliberately survive login-name changes and soft deletion.
CREATE TABLE "public"."LoginNameReservation" (
  "loginName" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "LoginNameReservation_pkey" PRIMARY KEY ("loginName"),
  CONSTRAINT "LoginNameReservation_loginName_format_check"
    CHECK ("loginName" ~ '^[a-z0-9][a-z0-9._-]{1,30}[a-z0-9]$'),
  CONSTRAINT "LoginNameReservation_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "public"."User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "public"."LoginNameReservation" ("loginName", "userId")
SELECT "loginName", "id"
FROM "public"."User";

CREATE INDEX "LoginNameReservation_userId_idx"
ON "public"."LoginNameReservation"("userId");

CREATE INDEX "User_contactEmail_idx"
ON "public"."User"("contactEmail");

CREATE INDEX "User_loginName_trgm_idx"
ON "public"."User"
USING GIN ("loginName" gin_trgm_ops);

CREATE INDEX "User_contactEmail_trgm_idx"
ON "public"."User"
USING GIN ("contactEmail" gin_trgm_ops);

COMMIT;
