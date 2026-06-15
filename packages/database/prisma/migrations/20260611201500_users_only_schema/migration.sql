-- Normalize legacy audit entries before shrinking enum values.
UPDATE "public"."AuditLog"
SET "action" = 'USER_UPDATE'
WHERE "action"::text NOT IN (
  'LOGIN_SUCCESS',
  'LOGIN_FAILED',
  'LOGOUT',
  'PASSWORD_CHANGE',
  'PASSWORD_RESET',
  'ACCOUNT_LOCKED',
  'SESSION_INVALIDATE',
  'USER_CREATE',
  'USER_UPDATE',
  'USER_DELETE',
  'USER_ACTIVATE',
  'USER_DEACTIVATE',
  'PERMISSION_UPDATE'
);

UPDATE "public"."AuditLog"
SET "category" = 'SYSTEM'
WHERE "category"::text NOT IN ('AUTH', 'USER', 'PERMISSION', 'SYSTEM');

-- AlterEnum
BEGIN;
CREATE TYPE "public"."AuditAction_new" AS ENUM ('LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'PASSWORD_CHANGE', 'PASSWORD_RESET', 'ACCOUNT_LOCKED', 'SESSION_INVALIDATE', 'USER_CREATE', 'USER_UPDATE', 'USER_DELETE', 'USER_ACTIVATE', 'USER_DEACTIVATE', 'PERMISSION_UPDATE');
ALTER TABLE "public"."AuditLog" ALTER COLUMN "action" TYPE "public"."AuditAction_new" USING ("action"::text::"public"."AuditAction_new");
ALTER TYPE "public"."AuditAction" RENAME TO "AuditAction_old";
ALTER TYPE "public"."AuditAction_new" RENAME TO "AuditAction";
DROP TYPE "public"."AuditAction_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "public"."AuditCategory_new" AS ENUM ('AUTH', 'USER', 'PERMISSION', 'SYSTEM');
ALTER TABLE "public"."AuditLog" ALTER COLUMN "category" TYPE "public"."AuditCategory_new" USING ("category"::text::"public"."AuditCategory_new");
ALTER TYPE "public"."AuditCategory" RENAME TO "AuditCategory_old";
ALTER TYPE "public"."AuditCategory_new" RENAME TO "AuditCategory";
DROP TYPE "public"."AuditCategory_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."GameMember" DROP CONSTRAINT "GameMember_gameId_fkey";

-- DropForeignKey
ALTER TABLE "public"."GameMember" DROP CONSTRAINT "GameMember_memberId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Membership" DROP CONSTRAINT "Membership_accountId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Membership" DROP CONSTRAINT "Membership_memberId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Membership" DROP CONSTRAINT "Membership_typeId_fkey";

-- DropTable
DROP TABLE "public"."BankAccount";

-- DropTable
DROP TABLE "public"."Game";

-- DropTable
DROP TABLE "public"."GameMember";

-- DropTable
DROP TABLE "public"."Member";

-- DropTable
DROP TABLE "public"."Membership";

-- DropTable
DROP TABLE "public"."MembershipType";

-- DropTable
DROP TABLE "public"."Sponsor";

-- DropEnum
DROP TYPE "public"."AccountType";

-- DropEnum
DROP TYPE "public"."Gender";

-- DropEnum
DROP TYPE "public"."MemberStatus";

-- DropEnum
DROP TYPE "public"."MembershipStatus";

-- DropEnum
DROP TYPE "public"."PaymentMethod";

-- DropEnum
DROP TYPE "public"."SponsorTier";

-- DropEnum
DROP TYPE "public"."TeamCategory";
