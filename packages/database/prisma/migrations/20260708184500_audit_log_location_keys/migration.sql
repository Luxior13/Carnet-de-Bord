-- Denormalized audit location keys keep global journal filters index-friendly.
ALTER TABLE "public"."AuditLog"
ADD COLUMN IF NOT EXISTS "poleKey" TEXT,
ADD COLUMN IF NOT EXISTS "pageKey" TEXT,
ADD COLUMN IF NOT EXISTS "tabKey" TEXT;

UPDATE "public"."AuditLog"
SET
  "poleKey" = COALESCE("poleKey", NULLIF("metadata"->>'poleKey', '')),
  "pageKey" = COALESCE("pageKey", NULLIF("metadata"->>'pageKey', '')),
  "tabKey" = COALESCE("tabKey", NULLIF("metadata"->>'tabKey', ''))
WHERE "metadata" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "AuditLog_poleKey_createdAt_id_idx"
ON "public"."AuditLog"("poleKey", "createdAt", "id");

CREATE INDEX IF NOT EXISTS "AuditLog_poleKey_pageKey_createdAt_id_idx"
ON "public"."AuditLog"("poleKey", "pageKey", "createdAt", "id");

CREATE INDEX IF NOT EXISTS "AuditLog_pageKey_createdAt_id_idx"
ON "public"."AuditLog"("pageKey", "createdAt", "id");
