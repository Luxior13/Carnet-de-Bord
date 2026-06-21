DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'StaffProfile'
          AND column_name = 'discordUsername'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'StaffProfile'
          AND column_name = 'discordId'
    ) THEN
        ALTER TABLE "StaffProfile" RENAME COLUMN "discordUsername" TO "discordId";
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "StaffProfile_discordId_idx" ON "StaffProfile"("discordId");
