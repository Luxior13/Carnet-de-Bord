-- CreateEnum
CREATE TYPE "public"."BureauRole" AS ENUM ('PRESIDENT', 'VICE_PRESIDENT', 'TREASURER', 'ASSISTANT_TREASURER', 'SECRETARY', 'ASSISTANT_SECRETARY', 'MEMBER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."AuditAction" ADD VALUE 'STRUCTURE_UPDATE';
ALTER TYPE "public"."AuditAction" ADD VALUE 'BUREAU_MEMBER_ADD';
ALTER TYPE "public"."AuditAction" ADD VALUE 'BUREAU_MEMBER_UPDATE';
ALTER TYPE "public"."AuditAction" ADD VALUE 'BUREAU_MEMBER_REMOVE';

-- AlterEnum
ALTER TYPE "public"."AuditCategory" ADD VALUE 'STRUCTURE';

-- CreateTable
CREATE TABLE "public"."Structure" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "type" TEXT,
    "siret" TEXT,
    "rna" TEXT,
    "description" TEXT,
    "logo" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "address" TEXT,
    "addressComplement" TEXT,
    "postalCode" TEXT,
    "city" TEXT,
    "country" TEXT DEFAULT 'France',
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "foundedAt" TIMESTAMP(3),
    "dissolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Structure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BureauMember" (
    "id" TEXT NOT NULL,
    "structureId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "role" "public"."BureauRole" NOT NULL,
    "title" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BureauMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BureauMember_structureId_idx" ON "public"."BureauMember"("structureId");

-- CreateIndex
CREATE INDEX "BureauMember_memberId_idx" ON "public"."BureauMember"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "BureauMember_structureId_memberId_role_key" ON "public"."BureauMember"("structureId", "memberId", "role");

-- AddForeignKey
ALTER TABLE "public"."BureauMember" ADD CONSTRAINT "BureauMember_structureId_fkey" FOREIGN KEY ("structureId") REFERENCES "public"."Structure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BureauMember" ADD CONSTRAINT "BureauMember_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "public"."Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
