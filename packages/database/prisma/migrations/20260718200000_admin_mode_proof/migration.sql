BEGIN;

-- A normal MFA-bound session and an explicitly unlocked administration mode
-- are different assurances. Existing sessions stay connected but start
-- locked, while newly authenticated sessions receive a fresh proof.
ALTER TABLE "public"."Session"
ADD COLUMN "passwordReauthenticatedAt" TIMESTAMP(3),
ADD COLUMN "criticalMfaVerifiedAt" TIMESTAMP(3);

COMMIT;
