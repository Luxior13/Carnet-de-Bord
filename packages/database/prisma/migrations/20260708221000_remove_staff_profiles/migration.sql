-- The application no longer uses StaffProfile, but historical values must not
-- be destroyed. Copy them to an explicit read-only archive first.
BEGIN;

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

COMMIT;
