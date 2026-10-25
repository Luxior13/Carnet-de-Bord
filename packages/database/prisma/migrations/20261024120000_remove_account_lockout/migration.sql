-- Revue complète du 23 octobre 2026 (REV-01, REV-03).
-- The per-account lock let anyone who knows a login name keep that account
-- blocked; the shared login rate limiter replaces it. The MFA challenge attempt
-- counter was written but never read: the challenge rate-limit bucket enforces
-- that budget.

-- PostgreSQL silently drops every table constraint that involves a dropped
-- column, including this multi-column check. Recreate it without the two
-- removed columns so deleted-account tombstones stay fully constrained.
ALTER TABLE "public"."User"
DROP CONSTRAINT "User_deleted_tombstone_check";

DROP INDEX IF EXISTS "public"."User_deletedAt_lockedUntil_idx";

ALTER TABLE "public"."User"
DROP COLUMN "failedLoginAttempts",
DROP COLUMN "lockedUntil";

ALTER TABLE "public"."User"
ADD CONSTRAINT "User_deleted_tombstone_check"
CHECK (
  "deletedAt" IS NULL
  OR (
    "contactEmail" IS NULL
    AND "contactEmailVerifiedAt" IS NULL
    AND "firstName" = 'Compte'
    AND "isActive" = false
    AND "isProtected" = false
    AND "lastLoginAt" IS NULL
    AND "lastName" = 'supprimé'
    AND "loginName" ~ '^deleted:[a-f0-9]{32}$'
    AND "mfaEnabledAt" IS NULL
    AND "mustChangePassword" = false
    AND "passwordChangedAt" IS NULL
    AND "passwordHash" = '!' || "loginName"
    AND "permissions" IS NULL
    AND "role" = 'USER'
  )
);

ALTER TABLE "public"."MfaLoginChallenge"
DROP COLUMN "attempts";
