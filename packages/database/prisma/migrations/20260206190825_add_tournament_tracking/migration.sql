-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TransactionType" ADD VALUE 'TOURNAMENT_ENTRY';
ALTER TYPE "TransactionType" ADD VALUE 'ACCOMMODATION';
ALTER TYPE "TransactionType" ADD VALUE 'PLAYER_BONUS';

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "tournamentName" TEXT;

-- CreateIndex
CREATE INDEX "Transaction_tournamentName_idx" ON "Transaction"("tournamentName");
