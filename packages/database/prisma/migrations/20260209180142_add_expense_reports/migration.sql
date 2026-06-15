-- CreateEnum
CREATE TYPE "public"."ExpenseReportStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'REIMBURSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."ExpenseCategory" AS ENUM ('TRANSPORT', 'ACCOMMODATION', 'MEALS', 'EQUIPMENT', 'SOFTWARE', 'COMMUNICATION', 'EVENT', 'OTHER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."AuditAction" ADD VALUE 'EXPENSE_REPORT_CREATE';
ALTER TYPE "public"."AuditAction" ADD VALUE 'EXPENSE_REPORT_UPDATE';
ALTER TYPE "public"."AuditAction" ADD VALUE 'EXPENSE_REPORT_DELETE';
ALTER TYPE "public"."AuditAction" ADD VALUE 'EXPENSE_REPORT_SUBMIT';
ALTER TYPE "public"."AuditAction" ADD VALUE 'EXPENSE_REPORT_APPROVE';
ALTER TYPE "public"."AuditAction" ADD VALUE 'EXPENSE_REPORT_REJECT';
ALTER TYPE "public"."AuditAction" ADD VALUE 'EXPENSE_REPORT_REIMBURSE';

-- CreateTable
CREATE TABLE "public"."ExpenseReport" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "public"."ExpenseCategory" NOT NULL DEFAULT 'OTHER',
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "expenseDate" TIMESTAMP(3) NOT NULL,
    "status" "public"."ExpenseReportStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedById" TEXT,
    "rejectionReason" TEXT,
    "reimbursedAt" TIMESTAMP(3),
    "bankAccountId" TEXT,
    "receiptUrl" TEXT,
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExpenseReport_memberId_idx" ON "public"."ExpenseReport"("memberId");

-- CreateIndex
CREATE INDEX "ExpenseReport_status_idx" ON "public"."ExpenseReport"("status");

-- CreateIndex
CREATE INDEX "ExpenseReport_category_idx" ON "public"."ExpenseReport"("category");

-- CreateIndex
CREATE INDEX "ExpenseReport_expenseDate_idx" ON "public"."ExpenseReport"("expenseDate");

-- CreateIndex
CREATE INDEX "ExpenseReport_memberId_status_idx" ON "public"."ExpenseReport"("memberId", "status");

-- AddForeignKey
ALTER TABLE "public"."ExpenseReport" ADD CONSTRAINT "ExpenseReport_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "public"."Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExpenseReport" ADD CONSTRAINT "ExpenseReport_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "public"."BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
