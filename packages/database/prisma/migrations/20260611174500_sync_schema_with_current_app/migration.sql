-- CreateEnum
CREATE TYPE "public"."TeamCategory" AS ENUM ('GAME', 'STAFF', 'BUREAU');

-- CreateEnum
CREATE TYPE "public"."MembershipStatus" AS ENUM ('PENDING', 'OVERDUE', 'PAID');

-- CreateEnum
CREATE TYPE "public"."PaymentMethod" AS ENUM ('CASH', 'TRANSFER', 'CHECK', 'CARD', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."SponsorTier" AS ENUM ('PLATINUM', 'GOLD', 'SILVER', 'BRONZE');

-- AlterEnum
BEGIN;
CREATE TYPE "public"."AuditAction_new" AS ENUM ('LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'PASSWORD_CHANGE', 'PASSWORD_RESET', 'ACCOUNT_LOCKED', 'SESSION_INVALIDATE', 'USER_CREATE', 'USER_UPDATE', 'USER_DELETE', 'USER_ACTIVATE', 'USER_DEACTIVATE', 'PERMISSION_UPDATE', 'BANK_ACCOUNT_CREATE', 'BANK_ACCOUNT_UPDATE', 'BANK_ACCOUNT_DELETE', 'MEMBER_CREATE', 'MEMBER_UPDATE', 'MEMBER_DELETE', 'GAME_CREATE', 'GAME_UPDATE', 'GAME_DELETE', 'GAME_MEMBER_ROLE_CHANGE', 'MEMBERSHIP_TYPE_CREATE', 'MEMBERSHIP_TYPE_UPDATE', 'MEMBERSHIP_TYPE_DELETE', 'MEMBERSHIP_CREATE', 'MEMBERSHIP_UPDATE', 'MEMBERSHIP_DELETE');
ALTER TABLE "public"."AuditLog" ALTER COLUMN "action" TYPE "public"."AuditAction_new" USING ("action"::text::"public"."AuditAction_new");
ALTER TYPE "public"."AuditAction" RENAME TO "AuditAction_old";
ALTER TYPE "public"."AuditAction_new" RENAME TO "AuditAction";
DROP TYPE "public"."AuditAction_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "public"."AuditCategory_new" AS ENUM ('AUTH', 'USER', 'PERMISSION', 'FINANCE', 'MEMBER', 'GAME', 'MEMBERSHIP', 'SYSTEM');
ALTER TABLE "public"."AuditLog" ALTER COLUMN "category" TYPE "public"."AuditCategory_new" USING ("category"::text::"public"."AuditCategory_new");
ALTER TYPE "public"."AuditCategory" RENAME TO "AuditCategory_old";
ALTER TYPE "public"."AuditCategory_new" RENAME TO "AuditCategory";
DROP TYPE "public"."AuditCategory_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "public"."MemberStatus_new" AS ENUM ('ACTIVE', 'INACTIVE', 'SUBSTITUTE');
ALTER TABLE "public"."Member" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."Member" ALTER COLUMN "status" TYPE "public"."MemberStatus_new" USING ("status"::text::"public"."MemberStatus_new");
ALTER TYPE "public"."MemberStatus" RENAME TO "MemberStatus_old";
ALTER TYPE "public"."MemberStatus_new" RENAME TO "MemberStatus";
DROP TYPE "public"."MemberStatus_old";
ALTER TABLE "public"."Member" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."ExpenseReport" DROP CONSTRAINT "ExpenseReport_bankAccountId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ExpenseReport" DROP CONSTRAINT "ExpenseReport_memberId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Membership" DROP CONSTRAINT "Membership_bankAccountId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Membership" DROP CONSTRAINT "Membership_membershipTypeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."SponsorContract" DROP CONSTRAINT "SponsorContract_sponsorId_fkey";

-- DropForeignKey
ALTER TABLE "public"."SponsorContractNote" DROP CONSTRAINT "SponsorContractNote_authorId_fkey";

-- DropForeignKey
ALTER TABLE "public"."SponsorContractNote" DROP CONSTRAINT "SponsorContractNote_contractId_fkey";

-- DropForeignKey
ALTER TABLE "public"."SponsorNote" DROP CONSTRAINT "SponsorNote_authorId_fkey";

-- DropForeignKey
ALTER TABLE "public"."SponsorNote" DROP CONSTRAINT "SponsorNote_sponsorId_fkey";

-- DropForeignKey
ALTER TABLE "public"."SponsorObligation" DROP CONSTRAINT "SponsorObligation_contractId_fkey";

-- DropForeignKey
ALTER TABLE "public"."SponsorPayment" DROP CONSTRAINT "SponsorPayment_bankAccountId_fkey";

-- DropForeignKey
ALTER TABLE "public"."SponsorPayment" DROP CONSTRAINT "SponsorPayment_contractId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Transaction" DROP CONSTRAINT "Transaction_bankAccountId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Transaction" DROP CONSTRAINT "Transaction_memberId_fkey";

-- DropIndex
DROP INDEX "public"."Member_email_idx";

-- DropIndex
DROP INDEX "public"."Member_email_key";

-- DropIndex
DROP INDEX "public"."Membership_bankAccountId_idx";

-- DropIndex
DROP INDEX "public"."Membership_memberId_startDate_key";

-- DropIndex
DROP INDEX "public"."Membership_memberId_status_idx";

-- DropIndex
DROP INDEX "public"."Membership_startDate_idx";

-- DropIndex
DROP INDEX "public"."Sponsor_level_idx";

-- DropIndex
DROP INDEX "public"."Sponsor_name_idx";

-- DropIndex
DROP INDEX "public"."Sponsor_status_idx";

-- DropIndex
DROP INDEX "public"."Sponsor_type_idx";

-- AlterTable
ALTER TABLE "public"."Member" DROP COLUMN "address",
DROP COLUMN "addressComplement",
DROP COLUMN "avatarUrl",
DROP COLUMN "bankAccountHolder",
DROP COLUMN "bankBic",
DROP COLUMN "bankIban",
DROP COLUMN "battlenetId",
DROP COLUMN "city",
DROP COLUMN "country",
DROP COLUMN "departureDate",
DROP COLUMN "departureReason",
DROP COLUMN "discordId",
DROP COLUMN "eaId",
DROP COLUMN "epicGamesId",
DROP COLUMN "instagramId",
DROP COLUMN "joinDate",
DROP COLUMN "notes",
DROP COLUMN "postalCode",
DROP COLUMN "pseudo",
DROP COLUMN "steamId",
DROP COLUMN "tiktokId",
DROP COLUMN "twitchId",
DROP COLUMN "twitterHandle",
DROP COLUMN "youtubeId",
ADD COLUMN     "avatar" TEXT,
ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "discord" TEXT,
ADD COLUMN     "facebook" TEXT,
ADD COLUMN     "instagram" TEXT,
ADD COLUMN     "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "kick" TEXT,
ADD COLUMN     "nickname" TEXT,
ADD COLUMN     "tiktok" TEXT,
ADD COLUMN     "twitch" TEXT,
ADD COLUMN     "twitter" TEXT,
ADD COLUMN     "youtube" TEXT;

-- AlterTable
ALTER TABLE "public"."Membership" DROP COLUMN "amountPaid",
DROP COLUMN "bankAccountId",
DROP COLUMN "dueDate",
DROP COLUMN "isExternalPayment",
DROP COLUMN "membershipTypeId",
DROP COLUMN "paymentDate",
DROP COLUMN "paymentReference",
ADD COLUMN     "accountId" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "expectedPaymentDate" TIMESTAMP(3),
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentMethod" "public"."PaymentMethod",
ADD COLUMN     "typeId" TEXT NOT NULL,
ALTER COLUMN "startDate" SET DEFAULT CURRENT_TIMESTAMP,
DROP COLUMN "status",
ADD COLUMN     "status" "public"."MembershipStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "public"."MembershipType" ADD COLUMN     "duration" INTEGER NOT NULL DEFAULT 12,
ALTER COLUMN "amount" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."Sponsor" DROP COLUMN "address",
DROP COLUMN "city",
DROP COLUMN "contactEmail",
DROP COLUMN "contactName",
DROP COLUMN "contactPhone",
DROP COLUMN "contactRole",
DROP COLUMN "country",
DROP COLUMN "level",
DROP COLUMN "postalCode",
DROP COLUMN "shortName",
DROP COLUMN "status",
DROP COLUMN "type",
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tier" "public"."SponsorTier" NOT NULL DEFAULT 'BRONZE',
ALTER COLUMN "color" SET DEFAULT '#698cdd';

-- DropTable
DROP TABLE "public"."ExpenseReport";

-- DropTable
DROP TABLE "public"."FiscalYear";

-- DropTable
DROP TABLE "public"."SponsorContract";

-- DropTable
DROP TABLE "public"."SponsorContractNote";

-- DropTable
DROP TABLE "public"."SponsorNote";

-- DropTable
DROP TABLE "public"."SponsorObligation";

-- DropTable
DROP TABLE "public"."SponsorPayment";

-- DropTable
DROP TABLE "public"."Transaction";

-- DropEnum
DROP TYPE "public"."ExpenseCategory";

-- DropEnum
DROP TYPE "public"."ExpenseReportStatus";

-- DropEnum
DROP TYPE "public"."MembershipPaymentStatus";

-- DropEnum
DROP TYPE "public"."ObligationStatus";

-- DropEnum
DROP TYPE "public"."ObligationType";

-- DropEnum
DROP TYPE "public"."SponsorContractStatus";

-- DropEnum
DROP TYPE "public"."SponsorLevel";

-- DropEnum
DROP TYPE "public"."SponsorStatus";

-- DropEnum
DROP TYPE "public"."SponsorType";

-- DropEnum
DROP TYPE "public"."TransactionCategory";

-- DropEnum
DROP TYPE "public"."TransactionStatus";

-- DropEnum
DROP TYPE "public"."TransactionType";

-- CreateTable
CREATE TABLE "public"."Game" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "logo" TEXT,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#698cdd',
    "category" "public"."TeamCategory" NOT NULL DEFAULT 'GAME',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GameMember" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Game_isActive_idx" ON "public"."Game"("isActive");

-- CreateIndex
CREATE INDEX "Game_category_idx" ON "public"."Game"("category");

-- CreateIndex
CREATE INDEX "GameMember_gameId_idx" ON "public"."GameMember"("gameId");

-- CreateIndex
CREATE INDEX "GameMember_memberId_idx" ON "public"."GameMember"("memberId");

-- CreateIndex
CREATE INDEX "GameMember_isActive_idx" ON "public"."GameMember"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "GameMember_gameId_memberId_key" ON "public"."GameMember"("gameId", "memberId");

-- CreateIndex
CREATE INDEX "Member_nickname_idx" ON "public"."Member"("nickname");

-- CreateIndex
CREATE INDEX "Member_status_lastName_firstName_idx" ON "public"."Member"("status", "lastName", "firstName");

-- CreateIndex
CREATE INDEX "Membership_typeId_idx" ON "public"."Membership"("typeId");

-- CreateIndex
CREATE INDEX "Membership_accountId_idx" ON "public"."Membership"("accountId");

-- CreateIndex
CREATE INDEX "Membership_status_idx" ON "public"."Membership"("status");

-- CreateIndex
CREATE INDEX "Membership_deletedAt_idx" ON "public"."Membership"("deletedAt");

-- CreateIndex
CREATE INDEX "Membership_memberId_status_deletedAt_idx" ON "public"."Membership"("memberId", "status", "deletedAt");

-- CreateIndex
CREATE INDEX "Membership_accountId_status_deletedAt_idx" ON "public"."Membership"("accountId", "status", "deletedAt");

-- CreateIndex
CREATE INDEX "Membership_status_deletedAt_idx" ON "public"."Membership"("status", "deletedAt");

-- CreateIndex
CREATE INDEX "Sponsor_isActive_idx" ON "public"."Sponsor"("isActive");

-- CreateIndex
CREATE INDEX "Sponsor_tier_idx" ON "public"."Sponsor"("tier");

-- CreateIndex
CREATE INDEX "Sponsor_sortOrder_idx" ON "public"."Sponsor"("sortOrder");

-- AddForeignKey
ALTER TABLE "public"."GameMember" ADD CONSTRAINT "GameMember_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "public"."Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GameMember" ADD CONSTRAINT "GameMember_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "public"."Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Membership" ADD CONSTRAINT "Membership_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "public"."MembershipType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Membership" ADD CONSTRAINT "Membership_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
