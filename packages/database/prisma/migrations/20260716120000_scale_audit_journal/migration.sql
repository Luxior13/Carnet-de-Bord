-- Keep identity searches index-backed as the append-only audit table grows.
-- pg_trgm is already used by the users directory, but the guard makes this
-- migration safe for a fresh database as well.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "AuditLog_actorDisplayNameSnapshot_trgm_idx"
ON "public"."AuditLog" USING GIN ("actorDisplayNameSnapshot" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "AuditLog_actorLoginNameSnapshot_trgm_idx"
ON "public"."AuditLog" USING GIN ("actorLoginNameSnapshot" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "AuditLog_targetDisplayNameSnapshot_trgm_idx"
ON "public"."AuditLog" USING GIN ("targetDisplayNameSnapshot" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "AuditLog_targetLoginNameSnapshot_trgm_idx"
ON "public"."AuditLog" USING GIN ("targetLoginNameSnapshot" gin_trgm_ops);

-- User security statistics filter by the affected account and action.
CREATE INDEX IF NOT EXISTS "AuditLog_targetUserId_action_idx"
ON "public"."AuditLog"("targetUserId", "action");

-- These indexes are strict left-prefix duplicates of the longer B-tree
-- indexes kept in the schema. Removing them lowers write amplification and
-- storage without removing an available lookup prefix.
DROP INDEX IF EXISTS "public"."AuditLog_userId_idx";
DROP INDEX IF EXISTS "public"."AuditLog_userId_createdAt_idx";
DROP INDEX IF EXISTS "public"."AuditLog_targetUserId_idx";
DROP INDEX IF EXISTS "public"."AuditLog_targetUserId_createdAt_idx";
DROP INDEX IF EXISTS "public"."AuditLog_action_idx";
DROP INDEX IF EXISTS "public"."AuditLog_category_idx";
DROP INDEX IF EXISTS "public"."AuditLog_createdAt_idx";
