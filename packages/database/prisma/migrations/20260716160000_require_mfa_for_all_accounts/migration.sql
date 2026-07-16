BEGIN;

-- Challenges and enrollments exist outside Session, so every persisted
-- session can now be guaranteed to represent a completed MFA authentication.
-- Legacy password-only sessions and any protected remembered session are
-- deliberately revoked during rollout.
DELETE FROM "public"."Session" AS session
USING "public"."User" AS app_user
WHERE session."userId" = app_user."id"
  AND (
    session."mfaVerifiedAt" IS NULL
    OR session."mfaMethod" IS NULL
    OR (app_user."isProtected" = TRUE AND session."rememberMe" = TRUE)
  );

ALTER TABLE "public"."Session"
DROP CONSTRAINT IF EXISTS "Session_mfa_state_check",
ALTER COLUMN "mfaVerifiedAt" SET NOT NULL,
ALTER COLUMN "mfaMethod" SET NOT NULL;

COMMIT;
