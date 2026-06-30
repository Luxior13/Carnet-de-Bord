-- Indexes for long-term account activity and session management performance.
CREATE INDEX IF NOT EXISTS "Session_userId_expiresAt_idx"
ON "public"."Session"("userId", "expiresAt");

CREATE INDEX IF NOT EXISTS "Session_userId_createdAt_idx"
ON "public"."Session"("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "AuditLog_userId_action_idx"
ON "public"."AuditLog"("userId", "action");

CREATE INDEX IF NOT EXISTS "AuditLog_userId_createdAt_idx"
ON "public"."AuditLog"("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "AuditLog_targetUserId_createdAt_idx"
ON "public"."AuditLog"("targetUserId", "createdAt");
