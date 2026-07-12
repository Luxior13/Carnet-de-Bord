-- Reconcile databases that were historically managed with `prisma db push`
-- after the legacy migrations have been baselined with `prisma migrate resolve`.
-- Every operation is idempotent so the same migration also works on a fresh DB.

BEGIN;

-- Preserve the removed StaffProfile data instead of dropping it.
CREATE TABLE IF NOT EXISTS "public"."ArchivedStaffProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "displayName" TEXT,
    "jobTitle" TEXT,
    "department" TEXT,
    "discordId" TEXT,
    "phone" TEXT,
    "timezone" TEXT,
    "joinedAt" TIMESTAMP(3),
    "internalNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArchivedStaffProfile_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
    IF to_regclass('public."StaffProfile"') IS NOT NULL THEN
        EXECUTE $copy$
            INSERT INTO "public"."ArchivedStaffProfile" (
                "id", "userId", "displayName", "jobTitle", "department",
                "discordId", "phone", "timezone", "joinedAt", "internalNote",
                "createdAt", "updatedAt"
            )
            SELECT
                "id", "userId", "displayName", "jobTitle", "department",
                "discordId", "phone", "timezone", "joinedAt", "internalNote",
                "createdAt", "updatedAt"
            FROM "public"."StaffProfile"
            ON CONFLICT ("id") DO UPDATE SET
                "userId" = EXCLUDED."userId",
                "displayName" = EXCLUDED."displayName",
                "jobTitle" = EXCLUDED."jobTitle",
                "department" = EXCLUDED."department",
                "discordId" = EXCLUDED."discordId",
                "phone" = EXCLUDED."phone",
                "timezone" = EXCLUDED."timezone",
                "joinedAt" = EXCLUDED."joinedAt",
                "internalNote" = EXCLUDED."internalNote",
                "createdAt" = EXCLUDED."createdAt",
                "updatedAt" = EXCLUDED."updatedAt"
        $copy$;

        DROP TABLE "public"."StaffProfile";
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "ArchivedStaffProfile_userId_key"
ON "public"."ArchivedStaffProfile"("userId");
CREATE INDEX IF NOT EXISTS "ArchivedStaffProfile_department_idx"
ON "public"."ArchivedStaffProfile"("department");
CREATE INDEX IF NOT EXISTS "ArchivedStaffProfile_discordId_idx"
ON "public"."ArchivedStaffProfile"("discordId");
CREATE INDEX IF NOT EXISTS "ArchivedStaffProfile_jobTitle_idx"
ON "public"."ArchivedStaffProfile"("jobTitle");
CREATE INDEX IF NOT EXISTS "ArchivedStaffProfile_joinedAt_idx"
ON "public"."ArchivedStaffProfile"("joinedAt");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ArchivedStaffProfile_userId_fkey'
          AND conrelid = '"ArchivedStaffProfile"'::regclass
    ) THEN
        ALTER TABLE "public"."ArchivedStaffProfile"
        ADD CONSTRAINT "ArchivedStaffProfile_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "public"."User"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Enforce the invariants already expected by the application layer.
UPDATE "public"."User"
SET "email" = lower(btrim("email"))
WHERE "email" <> lower(btrim("email"));

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_lower_key"
ON "public"."User"(lower("email"));

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'User_email_normalized_check'
          AND conrelid = '"User"'::regclass
    ) THEN
        ALTER TABLE "public"."User"
        ADD CONSTRAINT "User_email_normalized_check"
        CHECK ("email" = lower(btrim("email")));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'User_protected_account_check'
          AND conrelid = '"User"'::regclass
    ) THEN
        ALTER TABLE "public"."User"
        ADD CONSTRAINT "User_protected_account_check"
        CHECK (NOT "isProtected" OR ("role" = 'ADMIN' AND "isActive"));
    END IF;
END $$;

-- Expired sessions are unusable and should not accumulate indefinitely.
DELETE FROM "public"."Session"
WHERE "expiresAt" <= CURRENT_TIMESTAMP;

-- Normalize invalid audit targets before restoring the missing foreign key.
UPDATE "public"."AuditLog" AS audit
SET "targetUserId" = NULL
WHERE audit."targetUserId" IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM "public"."User" AS target
      WHERE target."id" = audit."targetUserId"
  );

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'AuditLog_targetUserId_fkey'
          AND conrelid = '"AuditLog"'::regclass
    ) THEN
        ALTER TABLE "public"."AuditLog"
        ADD CONSTRAINT "AuditLog_targetUserId_fkey"
        FOREIGN KEY ("targetUserId") REFERENCES "public"."User"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Indexes represented by schema.prisma.
CREATE INDEX IF NOT EXISTS "User_deletedAt_createdAt_idx"
ON "public"."User"("deletedAt", "createdAt");
CREATE INDEX IF NOT EXISTS "User_deletedAt_isActive_idx"
ON "public"."User"("deletedAt", "isActive");
CREATE INDEX IF NOT EXISTS "User_deletedAt_lastLoginAt_idx"
ON "public"."User"("deletedAt", "lastLoginAt");
CREATE INDEX IF NOT EXISTS "User_deletedAt_lockedUntil_idx"
ON "public"."User"("deletedAt", "lockedUntil");
CREATE INDEX IF NOT EXISTS "User_deletedAt_mustChangePassword_idx"
ON "public"."User"("deletedAt", "mustChangePassword");
CREATE INDEX IF NOT EXISTS "User_deletedAt_role_idx"
ON "public"."User"("deletedAt", "role");

CREATE INDEX IF NOT EXISTS "Session_userId_expiresAt_idx"
ON "public"."Session"("userId", "expiresAt");
CREATE INDEX IF NOT EXISTS "Session_userId_createdAt_idx"
ON "public"."Session"("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "AuditLog_userId_action_idx"
ON "public"."AuditLog"("userId", "action");
CREATE INDEX IF NOT EXISTS "AuditLog_userId_createdAt_idx"
ON "public"."AuditLog"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_userId_createdAt_id_idx"
ON "public"."AuditLog"("userId", "createdAt", "id");
CREATE INDEX IF NOT EXISTS "AuditLog_targetUserId_createdAt_idx"
ON "public"."AuditLog"("targetUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_targetUserId_createdAt_id_idx"
ON "public"."AuditLog"("targetUserId", "createdAt", "id");
CREATE INDEX IF NOT EXISTS "AuditLog_action_createdAt_id_idx"
ON "public"."AuditLog"("action", "createdAt", "id");
CREATE INDEX IF NOT EXISTS "AuditLog_category_createdAt_id_idx"
ON "public"."AuditLog"("category", "createdAt", "id");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_id_idx"
ON "public"."AuditLog"("createdAt", "id");
CREATE INDEX IF NOT EXISTS "AuditLog_poleKey_createdAt_id_idx"
ON "public"."AuditLog"("poleKey", "createdAt", "id");
CREATE INDEX IF NOT EXISTS "AuditLog_poleKey_pageKey_createdAt_id_idx"
ON "public"."AuditLog"("poleKey", "pageKey", "createdAt", "id");
CREATE INDEX IF NOT EXISTS "AuditLog_pageKey_createdAt_id_idx"
ON "public"."AuditLog"("pageKey", "createdAt", "id");

-- Trigram indexes accelerate the case-insensitive users search.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS "User_email_trgm_idx"
ON "public"."User" USING gin ("email" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "User_firstName_trgm_idx"
ON "public"."User" USING gin ("firstName" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "User_lastName_trgm_idx"
ON "public"."User" USING gin ("lastName" gin_trgm_ops);

COMMIT;
