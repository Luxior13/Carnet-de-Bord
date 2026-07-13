-- Session expiration now has two independent limits:
-- - expiresAt remains the absolute lifetime (1 or 30 days at creation);
-- - idleExpiresAt is renewed only after authenticated server activity.
BEGIN;

ALTER TABLE "Session"
ADD COLUMN "idleExpiresAt" TIMESTAMP(3) NOT NULL
  DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 minutes'),
ADD COLUMN "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Session"
SET "idleExpiresAt" = LEAST(
  "expiresAt",
  CURRENT_TIMESTAMP + CASE
    WHEN "rememberMe" THEN INTERVAL '7 days'
    ELSE INTERVAL '30 minutes'
  END
);

CREATE INDEX "Session_userId_idleExpiresAt_idx"
ON "Session"("userId", "idleExpiresAt");

COMMIT;
