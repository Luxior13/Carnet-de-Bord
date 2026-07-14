BEGIN;

CREATE TYPE "public"."MfaChallengePurpose" AS ENUM ('LOGIN', 'SETUP');
CREATE TYPE "public"."MfaAuthenticationMethod" AS ENUM ('TOTP', 'RECOVERY_CODE');

ALTER TABLE "public"."User"
ADD COLUMN "mfaEnabledAt" TIMESTAMP(3);

ALTER TABLE "public"."Session"
ADD COLUMN "mfaVerifiedAt" TIMESTAMP(3),
ADD COLUMN "mfaMethod" "public"."MfaAuthenticationMethod",
ADD CONSTRAINT "Session_mfa_state_check" CHECK (
  ("mfaVerifiedAt" IS NULL AND "mfaMethod" IS NULL)
  OR ("mfaVerifiedAt" IS NOT NULL AND "mfaMethod" IS NOT NULL)
);

-- Existing root sessions were created without a second factor. Removing them
-- makes the next login use the controlled password -> enrollment -> TOTP
-- bootstrap instead of silently grandfathering a weaker session.
DELETE FROM "public"."Session" AS session
USING "public"."User" AS app_user
WHERE session."userId" = app_user."id"
  AND app_user."isProtected" = true;

CREATE TABLE "public"."TotpCredential" (
  "userId" TEXT NOT NULL,
  "secretCiphertext" TEXT NOT NULL,
  "secretIv" TEXT NOT NULL,
  "secretAuthTag" TEXT NOT NULL,
  "secretKeyVersion" INTEGER NOT NULL DEFAULT 1,
  "lastUsedTimeStep" BIGINT,
  "lastUsedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TotpCredential_pkey" PRIMARY KEY ("userId"),
  CONSTRAINT "TotpCredential_secret_material_check" CHECK (
    length("secretCiphertext") > 0
    AND length("secretIv") > 0
    AND length("secretAuthTag") > 0
  )
);

CREATE TABLE "public"."TotpEnrollment" (
  "userId" TEXT NOT NULL,
  "secretCiphertext" TEXT NOT NULL,
  "secretIv" TEXT NOT NULL,
  "secretAuthTag" TEXT NOT NULL,
  "secretKeyVersion" INTEGER NOT NULL DEFAULT 1,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TotpEnrollment_pkey" PRIMARY KEY ("userId"),
  CONSTRAINT "TotpEnrollment_secret_material_check" CHECK (
    length("secretCiphertext") > 0
    AND length("secretIv") > 0
    AND length("secretAuthTag") > 0
  )
);

CREATE TABLE "public"."MfaRecoveryCode" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "salt" TEXT NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MfaRecoveryCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."MfaLoginChallenge" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "purpose" "public"."MfaChallengePurpose" NOT NULL,
  "securityVersion" INTEGER NOT NULL,
  "credentialUpdatedAt" TIMESTAMP(3),
  "rememberMe" BOOLEAN NOT NULL DEFAULT false,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MfaLoginChallenge_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MfaLoginChallenge_attempts_check" CHECK ("attempts" >= 0)
);

CREATE INDEX "User_mfaEnabledAt_idx"
ON "public"."User"("mfaEnabledAt");

CREATE INDEX "TotpCredential_lastUsedAt_idx"
ON "public"."TotpCredential"("lastUsedAt");

CREATE INDEX "TotpEnrollment_expiresAt_idx"
ON "public"."TotpEnrollment"("expiresAt");

CREATE UNIQUE INDEX "MfaRecoveryCode_userId_codeHash_key"
ON "public"."MfaRecoveryCode"("userId", "codeHash");

CREATE INDEX "MfaRecoveryCode_userId_usedAt_idx"
ON "public"."MfaRecoveryCode"("userId", "usedAt");

CREATE UNIQUE INDEX "MfaLoginChallenge_userId_key"
ON "public"."MfaLoginChallenge"("userId");

CREATE UNIQUE INDEX "MfaLoginChallenge_tokenHash_key"
ON "public"."MfaLoginChallenge"("tokenHash");

CREATE INDEX "MfaLoginChallenge_expiresAt_idx"
ON "public"."MfaLoginChallenge"("expiresAt");

CREATE INDEX "MfaLoginChallenge_purpose_expiresAt_idx"
ON "public"."MfaLoginChallenge"("purpose", "expiresAt");

ALTER TABLE "public"."TotpCredential"
ADD CONSTRAINT "TotpCredential_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "public"."User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."TotpEnrollment"
ADD CONSTRAINT "TotpEnrollment_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "public"."User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."MfaRecoveryCode"
ADD CONSTRAINT "MfaRecoveryCode_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "public"."User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."MfaLoginChallenge"
ADD CONSTRAINT "MfaLoginChallenge_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "public"."User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
