/*
  Warnings:

  - You are about to drop the `Guilds` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Sessions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Ticket` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TicketEmbed` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TicketEmbedField` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TicketPanelButton` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TicketPanelSelectMenu` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TicketPanelSelectOption` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TicketPanels` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Users` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "public"."AuditAction" AS ENUM ('LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'PASSWORD_CHANGE', 'PASSWORD_RESET', 'ACCOUNT_LOCKED', 'SESSION_INVALIDATE', 'USER_CREATE', 'USER_UPDATE', 'USER_DELETE', 'USER_ACTIVATE', 'USER_DEACTIVATE', 'PERMISSION_UPDATE', 'MEMBER_CREATE', 'MEMBER_UPDATE', 'MEMBER_DELETE', 'MEMBER_ROLE_ASSIGN', 'MEMBER_ROLE_UPDATE', 'MEMBER_ROLE_END', 'MEMBER_ROLE_REMOVE', 'MEMBERSHIP_CREATE', 'MEMBERSHIP_UPDATE', 'MEMBERSHIP_DELETE', 'TRANSACTION_CREATE', 'TRANSACTION_UPDATE', 'TRANSACTION_DELETE', 'BANK_ACCOUNT_CREATE', 'BANK_ACCOUNT_UPDATE', 'BANK_ACCOUNT_DELETE', 'GAME_CREATE', 'GAME_UPDATE', 'GAME_DELETE', 'ROLE_TYPE_CREATE', 'ROLE_TYPE_UPDATE', 'ROLE_TYPE_DELETE', 'MEMBERSHIP_TYPE_CREATE', 'MEMBERSHIP_TYPE_UPDATE', 'MEMBERSHIP_TYPE_DELETE', 'CONTRACT_CREATE', 'CONTRACT_UPDATE', 'CONTRACT_DELETE', 'DOCUMENT_UPLOAD', 'DOCUMENT_UPDATE', 'DOCUMENT_DELETE', 'MEMBER_NOTE_CREATE', 'MEMBER_NOTE_UPDATE', 'MEMBER_NOTE_DELETE', 'MEETING_CREATE', 'MEETING_UPDATE', 'MEETING_DELETE', 'SPONSOR_CREATE', 'SPONSOR_UPDATE', 'SPONSOR_DELETE', 'SPONSOR_CONTRACT_CREATE', 'SPONSOR_CONTRACT_UPDATE', 'SPONSOR_CONTRACT_DELETE', 'SPONSOR_OBLIGATION_CREATE', 'SPONSOR_OBLIGATION_UPDATE', 'SPONSOR_OBLIGATION_DELETE', 'SPONSOR_PAYMENT_CREATE', 'SPONSOR_PAYMENT_UPDATE', 'SPONSOR_PAYMENT_DELETE', 'SPONSOR_NOTE_CREATE', 'SPONSOR_NOTE_UPDATE', 'SPONSOR_NOTE_DELETE');

-- CreateEnum
CREATE TYPE "public"."AuditCategory" AS ENUM ('AUTH', 'USER', 'PERMISSION', 'MEMBER', 'FINANCE', 'SETTINGS', 'CONTRACT', 'DOCUMENT', 'MEETING', 'SPONSOR', 'SYSTEM');

-- CreateEnum
CREATE TYPE "public"."RoleCategory" AS ENUM ('ESPORT', 'ASSOCIATIF', 'STAFF');

-- CreateEnum
CREATE TYPE "public"."MembershipPaymentStatus" AS ENUM ('PAID', 'PENDING', 'PARTIAL', 'OVERDUE', 'EXEMPT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."TransactionType" AS ENUM ('SALARY', 'BONUS', 'CASHPRIZE', 'REIMBURSEMENT', 'ADVANCE', 'FINE', 'PURCHASE', 'OTHER_IN', 'OTHER_OUT');

-- CreateEnum
CREATE TYPE "public"."TransactionStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."ContractType" AS ENUM ('EMPLOYMENT', 'VOLUNTEER', 'SPONSORSHIP', 'SERVICE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."ContractStatus" AS ENUM ('DRAFT', 'PENDING_SIGNATURE', 'ACTIVE', 'EXPIRED', 'TERMINATED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."DocumentType" AS ENUM ('ID_CARD', 'PASSPORT', 'STUDENT_CARD', 'RIB', 'CERTIFICATE', 'INSURANCE', 'PHOTO', 'SIGNED_CONTRACT', 'INVOICE', 'RECEIPT', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."MemberStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'ALUMNI');

-- CreateEnum
CREATE TYPE "public"."Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."AccountType" AS ENUM ('BANK', 'SAVINGS', 'PAYPAL', 'CASH', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."MeetingType" AS ENUM ('BUREAU', 'GENERAL_ASSEMBLY', 'STAFF', 'TEAM', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."MeetingStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."VoteType" AS ENUM ('POUR', 'CONTRE');

-- CreateEnum
CREATE TYPE "public"."SponsorType" AS ENUM ('ENTERPRISE', 'INDIVIDUAL', 'INSTITUTION', 'MEDIA', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."SponsorLevel" AS ENUM ('MAIN', 'GOLD', 'SILVER', 'BRONZE', 'SUPPORTER');

-- CreateEnum
CREATE TYPE "public"."SponsorStatus" AS ENUM ('PROSPECT', 'CONTACTED', 'NEGOTIATING', 'ACTIVE', 'PAUSED', 'ENDED', 'LOST');

-- CreateEnum
CREATE TYPE "public"."SponsorContractStatus" AS ENUM ('DRAFT', 'PENDING_SIGNATURE', 'ACTIVE', 'EXPIRED', 'TERMINATED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."ObligationStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."ObligationType" AS ENUM ('LOGO_DISPLAY', 'SOCIAL_POST', 'STREAM_MENTION', 'JERSEY_LOGO', 'EVENT_PRESENCE', 'PRODUCT_MENTION', 'VIDEO_CONTENT', 'NEWSLETTER', 'CUSTOM');

-- DropForeignKey
ALTER TABLE "public"."Sessions" DROP CONSTRAINT "Sessions_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Ticket" DROP CONSTRAINT "Ticket_panelId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TicketEmbed" DROP CONSTRAINT "TicketEmbed_closePanelId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TicketEmbed" DROP CONSTRAINT "TicketEmbed_openPanelId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TicketEmbed" DROP CONSTRAINT "TicketEmbed_panelId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TicketEmbedField" DROP CONSTRAINT "TicketEmbedField_embedId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TicketPanelButton" DROP CONSTRAINT "TicketPanelButton_panelId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TicketPanelSelectMenu" DROP CONSTRAINT "TicketPanelSelectMenu_panelId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TicketPanelSelectOption" DROP CONSTRAINT "TicketPanelSelectOption_selectMenuId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TicketPanels" DROP CONSTRAINT "TicketPanels_authorId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TicketPanels" DROP CONSTRAINT "TicketPanels_guildId_fkey";

-- DropTable
DROP TABLE "public"."Guilds";

-- DropTable
DROP TABLE "public"."Sessions";

-- DropTable
DROP TABLE "public"."Ticket";

-- DropTable
DROP TABLE "public"."TicketEmbed";

-- DropTable
DROP TABLE "public"."TicketEmbedField";

-- DropTable
DROP TABLE "public"."TicketPanelButton";

-- DropTable
DROP TABLE "public"."TicketPanelSelectMenu";

-- DropTable
DROP TABLE "public"."TicketPanelSelectOption";

-- DropTable
DROP TABLE "public"."TicketPanels";

-- DropTable
DROP TABLE "public"."Users";

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL DEFAULT 'USER',
    "permissions" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isProtected" BOOLEAN NOT NULL DEFAULT false,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "passwordChangedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" "public"."AuditAction" NOT NULL,
    "category" "public"."AuditCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RateLimit" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "firstAttempt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Game" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "icon" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6b7280',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GamePosition" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GamePosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RoleType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "public"."RoleCategory" NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6b7280',
    "icon" TEXT,
    "requiresGame" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isProtected" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MembershipType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MemberRoleAssignment" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "roleTypeId" TEXT NOT NULL,
    "gameId" TEXT,
    "positionId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberRoleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Membership" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "membershipTypeId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "public"."MembershipPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "bankAccountId" TEXT,
    "isExternalPayment" BOOLEAN NOT NULL DEFAULT false,
    "paymentDate" TIMESTAMP(3),
    "paymentReference" TEXT,
    "dueDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Transaction" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "type" "public"."TransactionType" NOT NULL,
    "status" "public"."TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "bankAccountId" TEXT,
    "contractId" TEXT,
    "dueDate" TIMESTAMP(3),
    "paidDate" TIMESTAMP(3),
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Contract" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "type" "public"."ContractType" NOT NULL,
    "status" "public"."ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "salary" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "documentUrl" TEXT,
    "signedAt" TIMESTAMP(3),
    "signedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Document" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "type" "public"."DocumentType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "expiresAt" TIMESTAMP(3),
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Member" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "pseudo" TEXT,
    "gender" "public"."Gender",
    "email" TEXT,
    "phone" TEXT,
    "discordId" TEXT,
    "riotId" TEXT,
    "steamId" TEXT,
    "tiktokId" TEXT,
    "twitchId" TEXT,
    "twitterHandle" TEXT,
    "youtubeId" TEXT,
    "instagramId" TEXT,
    "battlenetId" TEXT,
    "epicGamesId" TEXT,
    "eaId" TEXT,
    "avatarUrl" TEXT,
    "address" TEXT,
    "addressComplement" TEXT,
    "postalCode" TEXT,
    "city" TEXT,
    "country" TEXT,
    "bankIban" TEXT,
    "bankBic" TEXT,
    "bankAccountHolder" TEXT,
    "status" "public"."MemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "joinDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "departureDate" TIMESTAMP(3),
    "departureReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MemberNote" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BankAccount" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."AccountType" NOT NULL DEFAULT 'BANK',
    "description" TEXT,
    "bankName" TEXT,
    "iban" TEXT,
    "bic" TEXT,
    "accountNumber" TEXT,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Meeting" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "public"."MeetingType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 60,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MeetingPoint" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "importance" INTEGER NOT NULL DEFAULT 2,
    "isDiscussed" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MeetingPointNote" (
    "id" TEXT NOT NULL,
    "pointId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" VARCHAR(200) NOT NULL,
    "isChecked" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingPointNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MeetingPointVote" (
    "id" TEXT NOT NULL,
    "pointId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vote" "public"."VoteType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingPointVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Sponsor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "logo" TEXT,
    "website" TEXT,
    "description" TEXT,
    "type" "public"."SponsorType" NOT NULL DEFAULT 'ENTERPRISE',
    "level" "public"."SponsorLevel" NOT NULL DEFAULT 'SUPPORTER',
    "status" "public"."SponsorStatus" NOT NULL DEFAULT 'PROSPECT',
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "contactRole" TEXT,
    "address" TEXT,
    "postalCode" TEXT,
    "city" TEXT,
    "country" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6b7280',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sponsor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SponsorContract" (
    "id" TEXT NOT NULL,
    "sponsorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "reference" TEXT,
    "status" "public"."SponsorContractStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "documentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SponsorContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SponsorObligation" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "type" "public"."ObligationType" NOT NULL DEFAULT 'CUSTOM',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "status" "public"."ObligationStatus" NOT NULL DEFAULT 'PENDING',
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrence" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "proofUrl" TEXT,
    "proofNotes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SponsorObligation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SponsorPayment" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "bankAccountId" TEXT,
    "reference" TEXT,
    "invoiceUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SponsorPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SponsorNote" (
    "id" TEXT NOT NULL,
    "sponsorId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SponsorNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SponsorContractNote" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SponsorContractNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "public"."User"("role");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "public"."User"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "public"."Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "public"."Session"("userId");

-- CreateIndex
CREATE INDEX "Session_token_idx" ON "public"."Session"("token");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "public"."AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "public"."AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_category_idx" ON "public"."AuditLog"("category");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "public"."AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimit_key_key" ON "public"."RateLimit"("key");

-- CreateIndex
CREATE INDEX "RateLimit_key_idx" ON "public"."RateLimit"("key");

-- CreateIndex
CREATE INDEX "RateLimit_blockedUntil_idx" ON "public"."RateLimit"("blockedUntil");

-- CreateIndex
CREATE UNIQUE INDEX "Game_name_key" ON "public"."Game"("name");

-- CreateIndex
CREATE INDEX "Game_isActive_idx" ON "public"."Game"("isActive");

-- CreateIndex
CREATE INDEX "Game_sortOrder_idx" ON "public"."Game"("sortOrder");

-- CreateIndex
CREATE INDEX "GamePosition_gameId_idx" ON "public"."GamePosition"("gameId");

-- CreateIndex
CREATE INDEX "GamePosition_sortOrder_idx" ON "public"."GamePosition"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "GamePosition_gameId_name_key" ON "public"."GamePosition"("gameId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "RoleType_name_key" ON "public"."RoleType"("name");

-- CreateIndex
CREATE INDEX "RoleType_category_idx" ON "public"."RoleType"("category");

-- CreateIndex
CREATE INDEX "RoleType_isActive_idx" ON "public"."RoleType"("isActive");

-- CreateIndex
CREATE INDEX "RoleType_sortOrder_idx" ON "public"."RoleType"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipType_name_key" ON "public"."MembershipType"("name");

-- CreateIndex
CREATE INDEX "MembershipType_isActive_idx" ON "public"."MembershipType"("isActive");

-- CreateIndex
CREATE INDEX "MembershipType_sortOrder_idx" ON "public"."MembershipType"("sortOrder");

-- CreateIndex
CREATE INDEX "MemberRoleAssignment_memberId_idx" ON "public"."MemberRoleAssignment"("memberId");

-- CreateIndex
CREATE INDEX "MemberRoleAssignment_roleTypeId_idx" ON "public"."MemberRoleAssignment"("roleTypeId");

-- CreateIndex
CREATE INDEX "MemberRoleAssignment_gameId_idx" ON "public"."MemberRoleAssignment"("gameId");

-- CreateIndex
CREATE INDEX "MemberRoleAssignment_endDate_idx" ON "public"."MemberRoleAssignment"("endDate");

-- CreateIndex
CREATE INDEX "Membership_memberId_idx" ON "public"."Membership"("memberId");

-- CreateIndex
CREATE INDEX "Membership_startDate_idx" ON "public"."Membership"("startDate");

-- CreateIndex
CREATE INDEX "Membership_endDate_idx" ON "public"."Membership"("endDate");

-- CreateIndex
CREATE INDEX "Membership_status_idx" ON "public"."Membership"("status");

-- CreateIndex
CREATE INDEX "Membership_bankAccountId_idx" ON "public"."Membership"("bankAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_memberId_startDate_key" ON "public"."Membership"("memberId", "startDate");

-- CreateIndex
CREATE INDEX "Transaction_memberId_idx" ON "public"."Transaction"("memberId");

-- CreateIndex
CREATE INDEX "Transaction_type_idx" ON "public"."Transaction"("type");

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "public"."Transaction"("status");

-- CreateIndex
CREATE INDEX "Transaction_bankAccountId_idx" ON "public"."Transaction"("bankAccountId");

-- CreateIndex
CREATE INDEX "Transaction_contractId_idx" ON "public"."Transaction"("contractId");

-- CreateIndex
CREATE INDEX "Transaction_paidDate_idx" ON "public"."Transaction"("paidDate");

-- CreateIndex
CREATE INDEX "Contract_memberId_idx" ON "public"."Contract"("memberId");

-- CreateIndex
CREATE INDEX "Contract_type_idx" ON "public"."Contract"("type");

-- CreateIndex
CREATE INDEX "Contract_status_idx" ON "public"."Contract"("status");

-- CreateIndex
CREATE INDEX "Document_memberId_idx" ON "public"."Document"("memberId");

-- CreateIndex
CREATE INDEX "Document_type_idx" ON "public"."Document"("type");

-- CreateIndex
CREATE INDEX "Document_expiresAt_idx" ON "public"."Document"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Member_email_key" ON "public"."Member"("email");

-- CreateIndex
CREATE INDEX "Member_status_idx" ON "public"."Member"("status");

-- CreateIndex
CREATE INDEX "Member_email_idx" ON "public"."Member"("email");

-- CreateIndex
CREATE INDEX "MemberNote_memberId_idx" ON "public"."MemberNote"("memberId");

-- CreateIndex
CREATE INDEX "MemberNote_authorId_idx" ON "public"."MemberNote"("authorId");

-- CreateIndex
CREATE INDEX "MemberNote_createdAt_idx" ON "public"."MemberNote"("createdAt");

-- CreateIndex
CREATE INDEX "BankAccount_type_idx" ON "public"."BankAccount"("type");

-- CreateIndex
CREATE INDEX "BankAccount_isActive_idx" ON "public"."BankAccount"("isActive");

-- CreateIndex
CREATE INDEX "Meeting_type_idx" ON "public"."Meeting"("type");

-- CreateIndex
CREATE INDEX "Meeting_date_idx" ON "public"."Meeting"("date");

-- CreateIndex
CREATE INDEX "Meeting_isCompleted_idx" ON "public"."Meeting"("isCompleted");

-- CreateIndex
CREATE INDEX "MeetingPoint_meetingId_idx" ON "public"."MeetingPoint"("meetingId");

-- CreateIndex
CREATE INDEX "MeetingPoint_order_idx" ON "public"."MeetingPoint"("order");

-- CreateIndex
CREATE INDEX "MeetingPoint_importance_idx" ON "public"."MeetingPoint"("importance");

-- CreateIndex
CREATE INDEX "MeetingPointNote_pointId_idx" ON "public"."MeetingPointNote"("pointId");

-- CreateIndex
CREATE INDEX "MeetingPointNote_userId_idx" ON "public"."MeetingPointNote"("userId");

-- CreateIndex
CREATE INDEX "MeetingPointNote_order_idx" ON "public"."MeetingPointNote"("order");

-- CreateIndex
CREATE INDEX "MeetingPointVote_pointId_idx" ON "public"."MeetingPointVote"("pointId");

-- CreateIndex
CREATE INDEX "MeetingPointVote_userId_idx" ON "public"."MeetingPointVote"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingPointVote_pointId_userId_key" ON "public"."MeetingPointVote"("pointId", "userId");

-- CreateIndex
CREATE INDEX "Sponsor_type_idx" ON "public"."Sponsor"("type");

-- CreateIndex
CREATE INDEX "Sponsor_level_idx" ON "public"."Sponsor"("level");

-- CreateIndex
CREATE INDEX "Sponsor_status_idx" ON "public"."Sponsor"("status");

-- CreateIndex
CREATE INDEX "Sponsor_name_idx" ON "public"."Sponsor"("name");

-- CreateIndex
CREATE INDEX "SponsorContract_sponsorId_idx" ON "public"."SponsorContract"("sponsorId");

-- CreateIndex
CREATE INDEX "SponsorContract_status_idx" ON "public"."SponsorContract"("status");

-- CreateIndex
CREATE INDEX "SponsorContract_startDate_idx" ON "public"."SponsorContract"("startDate");

-- CreateIndex
CREATE INDEX "SponsorContract_endDate_idx" ON "public"."SponsorContract"("endDate");

-- CreateIndex
CREATE INDEX "SponsorObligation_contractId_idx" ON "public"."SponsorObligation"("contractId");

-- CreateIndex
CREATE INDEX "SponsorObligation_status_idx" ON "public"."SponsorObligation"("status");

-- CreateIndex
CREATE INDEX "SponsorObligation_dueDate_idx" ON "public"."SponsorObligation"("dueDate");

-- CreateIndex
CREATE INDEX "SponsorObligation_type_idx" ON "public"."SponsorObligation"("type");

-- CreateIndex
CREATE INDEX "SponsorPayment_contractId_idx" ON "public"."SponsorPayment"("contractId");

-- CreateIndex
CREATE INDEX "SponsorPayment_isPaid_idx" ON "public"."SponsorPayment"("isPaid");

-- CreateIndex
CREATE INDEX "SponsorPayment_dueDate_idx" ON "public"."SponsorPayment"("dueDate");

-- CreateIndex
CREATE INDEX "SponsorPayment_bankAccountId_idx" ON "public"."SponsorPayment"("bankAccountId");

-- CreateIndex
CREATE INDEX "SponsorNote_sponsorId_idx" ON "public"."SponsorNote"("sponsorId");

-- CreateIndex
CREATE INDEX "SponsorNote_authorId_idx" ON "public"."SponsorNote"("authorId");

-- CreateIndex
CREATE INDEX "SponsorNote_createdAt_idx" ON "public"."SponsorNote"("createdAt");

-- CreateIndex
CREATE INDEX "SponsorContractNote_contractId_idx" ON "public"."SponsorContractNote"("contractId");

-- CreateIndex
CREATE INDEX "SponsorContractNote_authorId_idx" ON "public"."SponsorContractNote"("authorId");

-- CreateIndex
CREATE INDEX "SponsorContractNote_createdAt_idx" ON "public"."SponsorContractNote"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GamePosition" ADD CONSTRAINT "GamePosition_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "public"."Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MemberRoleAssignment" ADD CONSTRAINT "MemberRoleAssignment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "public"."Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MemberRoleAssignment" ADD CONSTRAINT "MemberRoleAssignment_roleTypeId_fkey" FOREIGN KEY ("roleTypeId") REFERENCES "public"."RoleType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MemberRoleAssignment" ADD CONSTRAINT "MemberRoleAssignment_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "public"."Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MemberRoleAssignment" ADD CONSTRAINT "MemberRoleAssignment_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "public"."GamePosition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Membership" ADD CONSTRAINT "Membership_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "public"."Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Membership" ADD CONSTRAINT "Membership_membershipTypeId_fkey" FOREIGN KEY ("membershipTypeId") REFERENCES "public"."MembershipType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Membership" ADD CONSTRAINT "Membership_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "public"."BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "public"."Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "public"."BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "public"."Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Contract" ADD CONSTRAINT "Contract_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "public"."Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "public"."Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MemberNote" ADD CONSTRAINT "MemberNote_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "public"."Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MemberNote" ADD CONSTRAINT "MemberNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MeetingPoint" ADD CONSTRAINT "MeetingPoint_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "public"."Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MeetingPointNote" ADD CONSTRAINT "MeetingPointNote_pointId_fkey" FOREIGN KEY ("pointId") REFERENCES "public"."MeetingPoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MeetingPointNote" ADD CONSTRAINT "MeetingPointNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MeetingPointVote" ADD CONSTRAINT "MeetingPointVote_pointId_fkey" FOREIGN KEY ("pointId") REFERENCES "public"."MeetingPoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MeetingPointVote" ADD CONSTRAINT "MeetingPointVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SponsorContract" ADD CONSTRAINT "SponsorContract_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "public"."Sponsor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SponsorObligation" ADD CONSTRAINT "SponsorObligation_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "public"."SponsorContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SponsorPayment" ADD CONSTRAINT "SponsorPayment_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "public"."SponsorContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SponsorPayment" ADD CONSTRAINT "SponsorPayment_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "public"."BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SponsorNote" ADD CONSTRAINT "SponsorNote_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "public"."Sponsor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SponsorNote" ADD CONSTRAINT "SponsorNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SponsorContractNote" ADD CONSTRAINT "SponsorContractNote_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "public"."SponsorContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SponsorContractNote" ADD CONSTRAINT "SponsorContractNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
