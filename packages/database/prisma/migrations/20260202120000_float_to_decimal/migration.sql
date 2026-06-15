-- AlterTable: Convert Float (DoublePrecision) columns to Decimal for financial precision

-- BankAccount
ALTER TABLE "BankAccount" ALTER COLUMN "balance" SET DATA TYPE DECIMAL(12,2);

-- Membership
ALTER TABLE "Membership" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(10,2);
ALTER TABLE "Membership" ALTER COLUMN "amountPaid" SET DATA TYPE DECIMAL(10,2);

-- MembershipType
ALTER TABLE "MembershipType" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(10,2);

-- Transaction
ALTER TABLE "Transaction" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(10,2);

-- SponsorContract
ALTER TABLE "SponsorContract" ALTER COLUMN "totalAmount" SET DATA TYPE DECIMAL(10,2);

-- SponsorPayment
ALTER TABLE "SponsorPayment" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(10,2);
