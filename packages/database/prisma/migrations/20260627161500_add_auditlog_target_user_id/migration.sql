-- Add structured target user reference to audit logs
ALTER TABLE "public"."AuditLog"
ADD COLUMN IF NOT EXISTS "targetUserId" TEXT;

CREATE INDEX IF NOT EXISTS "AuditLog_targetUserId_idx"
ON "public"."AuditLog"("targetUserId");

ALTER TABLE "public"."AuditLog"
ADD CONSTRAINT "AuditLog_targetUserId_fkey"
FOREIGN KEY ("targetUserId") REFERENCES "public"."User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
