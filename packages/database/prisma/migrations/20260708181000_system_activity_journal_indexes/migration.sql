-- Composite indexes for cursor-paginated global audit journal queries.
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_id_idx"
ON "public"."AuditLog"("createdAt", "id");

CREATE INDEX IF NOT EXISTS "AuditLog_category_createdAt_id_idx"
ON "public"."AuditLog"("category", "createdAt", "id");

CREATE INDEX IF NOT EXISTS "AuditLog_action_createdAt_id_idx"
ON "public"."AuditLog"("action", "createdAt", "id");

CREATE INDEX IF NOT EXISTS "AuditLog_userId_createdAt_id_idx"
ON "public"."AuditLog"("userId", "createdAt", "id");

CREATE INDEX IF NOT EXISTS "AuditLog_targetUserId_createdAt_id_idx"
ON "public"."AuditLog"("targetUserId", "createdAt", "id");
