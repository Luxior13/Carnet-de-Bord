-- Clean up audit logs that reference removed enum values before altering enums
DELETE FROM "public"."AuditLog" WHERE "action" IN (
  'MEMBER_ROLE_ASSIGN', 'MEMBER_ROLE_UPDATE', 'MEMBER_ROLE_END', 'MEMBER_ROLE_REMOVE',
  'GAME_CREATE', 'GAME_UPDATE', 'GAME_DELETE',
  'ROLE_TYPE_CREATE', 'ROLE_TYPE_UPDATE', 'ROLE_TYPE_DELETE',
  'CONTRACT_CREATE', 'CONTRACT_UPDATE', 'CONTRACT_DELETE',
  'DOCUMENT_UPLOAD', 'DOCUMENT_UPDATE', 'DOCUMENT_DELETE',
  'MEMBER_NOTE_CREATE', 'MEMBER_NOTE_UPDATE', 'MEMBER_NOTE_DELETE',
  'MEETING_CREATE', 'MEETING_UPDATE', 'MEETING_DELETE',
  'STRUCTURE_UPDATE', 'BUREAU_MEMBER_ADD', 'BUREAU_MEMBER_UPDATE', 'BUREAU_MEMBER_REMOVE'
);

DELETE FROM "public"."AuditLog" WHERE "category" IN (
  'CONTRACT', 'DOCUMENT', 'MEETING', 'STRUCTURE'
);

-- AlterEnum
BEGIN;
CREATE TYPE "public"."AuditAction_new" AS ENUM ('LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'PASSWORD_CHANGE', 'PASSWORD_RESET', 'ACCOUNT_LOCKED', 'SESSION_INVALIDATE', 'USER_CREATE', 'USER_UPDATE', 'USER_DELETE', 'USER_ACTIVATE', 'USER_DEACTIVATE', 'PERMISSION_UPDATE', 'MEMBER_CREATE', 'MEMBER_UPDATE', 'MEMBER_DELETE', 'MEMBERSHIP_CREATE', 'MEMBERSHIP_UPDATE', 'MEMBERSHIP_DELETE', 'TRANSACTION_CREATE', 'TRANSACTION_UPDATE', 'TRANSACTION_DELETE', 'BANK_ACCOUNT_CREATE', 'BANK_ACCOUNT_UPDATE', 'BANK_ACCOUNT_DELETE', 'MEMBERSHIP_TYPE_CREATE', 'MEMBERSHIP_TYPE_UPDATE', 'MEMBERSHIP_TYPE_DELETE', 'SPONSOR_CREATE', 'SPONSOR_UPDATE', 'SPONSOR_DELETE', 'SPONSOR_CONTRACT_CREATE', 'SPONSOR_CONTRACT_UPDATE', 'SPONSOR_CONTRACT_DELETE', 'SPONSOR_OBLIGATION_CREATE', 'SPONSOR_OBLIGATION_UPDATE', 'SPONSOR_OBLIGATION_DELETE', 'SPONSOR_PAYMENT_CREATE', 'SPONSOR_PAYMENT_UPDATE', 'SPONSOR_PAYMENT_DELETE', 'SPONSOR_NOTE_CREATE', 'SPONSOR_NOTE_UPDATE', 'SPONSOR_NOTE_DELETE');
ALTER TABLE "public"."AuditLog" ALTER COLUMN "action" TYPE "public"."AuditAction_new" USING ("action"::text::"public"."AuditAction_new");
ALTER TYPE "public"."AuditAction" RENAME TO "AuditAction_old";
ALTER TYPE "public"."AuditAction_new" RENAME TO "AuditAction";
DROP TYPE "public"."AuditAction_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "public"."AuditCategory_new" AS ENUM ('AUTH', 'USER', 'PERMISSION', 'MEMBER', 'FINANCE', 'SETTINGS', 'SPONSOR', 'SYSTEM');
ALTER TABLE "public"."AuditLog" ALTER COLUMN "category" TYPE "public"."AuditCategory_new" USING ("category"::text::"public"."AuditCategory_new");
ALTER TYPE "public"."AuditCategory" RENAME TO "AuditCategory_old";
ALTER TYPE "public"."AuditCategory_new" RENAME TO "AuditCategory";
DROP TYPE "public"."AuditCategory_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."BureauMember" DROP CONSTRAINT "BureauMember_memberId_fkey";
ALTER TABLE "public"."BureauMember" DROP CONSTRAINT "BureauMember_structureId_fkey";
ALTER TABLE "public"."Contract" DROP CONSTRAINT "Contract_memberId_fkey";
ALTER TABLE "public"."Document" DROP CONSTRAINT "Document_memberId_fkey";
ALTER TABLE "public"."GamePosition" DROP CONSTRAINT "GamePosition_gameId_fkey";
ALTER TABLE "public"."MeetingPoint" DROP CONSTRAINT "MeetingPoint_meetingId_fkey";
ALTER TABLE "public"."MeetingPointNote" DROP CONSTRAINT "MeetingPointNote_pointId_fkey";
ALTER TABLE "public"."MeetingPointNote" DROP CONSTRAINT "MeetingPointNote_userId_fkey";
ALTER TABLE "public"."MeetingPointVote" DROP CONSTRAINT "MeetingPointVote_pointId_fkey";
ALTER TABLE "public"."MeetingPointVote" DROP CONSTRAINT "MeetingPointVote_userId_fkey";
ALTER TABLE "public"."MemberNote" DROP CONSTRAINT "MemberNote_authorId_fkey";
ALTER TABLE "public"."MemberNote" DROP CONSTRAINT "MemberNote_memberId_fkey";
ALTER TABLE "public"."MemberRoleAssignment" DROP CONSTRAINT "MemberRoleAssignment_gameId_fkey";
ALTER TABLE "public"."MemberRoleAssignment" DROP CONSTRAINT "MemberRoleAssignment_memberId_fkey";
ALTER TABLE "public"."MemberRoleAssignment" DROP CONSTRAINT "MemberRoleAssignment_positionId_fkey";
ALTER TABLE "public"."MemberRoleAssignment" DROP CONSTRAINT "MemberRoleAssignment_roleTypeId_fkey";
ALTER TABLE "public"."Transaction" DROP CONSTRAINT "Transaction_contractId_fkey";

-- DropIndex
DROP INDEX "public"."Transaction_contractId_idx";

-- AlterTable
ALTER TABLE "public"."Transaction" DROP COLUMN "contractId";

-- DropTable
DROP TABLE "public"."BureauMember";
DROP TABLE "public"."Contract";
DROP TABLE "public"."Document";
DROP TABLE "public"."Game";
DROP TABLE "public"."GamePosition";
DROP TABLE "public"."Meeting";
DROP TABLE "public"."MeetingPoint";
DROP TABLE "public"."MeetingPointNote";
DROP TABLE "public"."MeetingPointVote";
DROP TABLE "public"."MemberNote";
DROP TABLE "public"."MemberRoleAssignment";
DROP TABLE "public"."RoleType";
DROP TABLE "public"."Structure";

-- DropEnum
DROP TYPE "public"."BureauRole";
DROP TYPE "public"."ContractStatus";
DROP TYPE "public"."ContractType";
DROP TYPE "public"."DocumentType";
DROP TYPE "public"."MeetingStatus";
DROP TYPE "public"."MeetingType";
DROP TYPE "public"."RoleCategory";
DROP TYPE "public"."VoteType";
