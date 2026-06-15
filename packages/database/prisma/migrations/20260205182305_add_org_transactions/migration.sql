-- CreateEnum
CREATE TYPE "public"."TransactionCategory" AS ENUM ('MEMBER_PAYMENT', 'REVENUE', 'EXPENSE', 'TRANSFER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."AuditAction" ADD VALUE 'FISCAL_YEAR_CREATE';
ALTER TYPE "public"."AuditAction" ADD VALUE 'FISCAL_YEAR_UPDATE';
ALTER TYPE "public"."AuditAction" ADD VALUE 'FISCAL_YEAR_CLOSE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."TransactionType" ADD VALUE 'STREAMING_REVENUE';
ALTER TYPE "public"."TransactionType" ADD VALUE 'DONATION';
ALTER TYPE "public"."TransactionType" ADD VALUE 'MERCH_SALE';
ALTER TYPE "public"."TransactionType" ADD VALUE 'GRANT';
ALTER TYPE "public"."TransactionType" ADD VALUE 'AD_REVENUE';
ALTER TYPE "public"."TransactionType" ADD VALUE 'EVENT_REVENUE';
ALTER TYPE "public"."TransactionType" ADD VALUE 'MEDIA_RIGHTS';
ALTER TYPE "public"."TransactionType" ADD VALUE 'SPONSORSHIP_INCOME';
ALTER TYPE "public"."TransactionType" ADD VALUE 'RENT';
ALTER TYPE "public"."TransactionType" ADD VALUE 'UTILITIES';
ALTER TYPE "public"."TransactionType" ADD VALUE 'EQUIPMENT';
ALTER TYPE "public"."TransactionType" ADD VALUE 'SOFTWARE';
ALTER TYPE "public"."TransactionType" ADD VALUE 'INSURANCE';
ALTER TYPE "public"."TransactionType" ADD VALUE 'BANK_FEE';
ALTER TYPE "public"."TransactionType" ADD VALUE 'MARKETING';
ALTER TYPE "public"."TransactionType" ADD VALUE 'EVENT_EXPENSE';
ALTER TYPE "public"."TransactionType" ADD VALUE 'TRAVEL_EXPENSE';
ALTER TYPE "public"."TransactionType" ADD VALUE 'HOSTING';
ALTER TYPE "public"."TransactionType" ADD VALUE 'LEGAL_FEE';
ALTER TYPE "public"."TransactionType" ADD VALUE 'ACCOUNTING_FEE';

-- AlterTable
ALTER TABLE "public"."Transaction" ADD COLUMN     "category" "public"."TransactionCategory" NOT NULL DEFAULT 'MEMBER_PAYMENT',
ADD COLUMN     "source" TEXT,
ALTER COLUMN "memberId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Transaction_category_idx" ON "public"."Transaction"("category");
