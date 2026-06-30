-- Long-term indexes for the users administration list.
CREATE INDEX IF NOT EXISTS "User_deletedAt_createdAt_idx"
ON "public"."User"("deletedAt", "createdAt");

CREATE INDEX IF NOT EXISTS "User_deletedAt_isActive_idx"
ON "public"."User"("deletedAt", "isActive");

CREATE INDEX IF NOT EXISTS "User_deletedAt_lastLoginAt_idx"
ON "public"."User"("deletedAt", "lastLoginAt");

CREATE INDEX IF NOT EXISTS "User_deletedAt_mustChangePassword_idx"
ON "public"."User"("deletedAt", "mustChangePassword");

CREATE INDEX IF NOT EXISTS "User_deletedAt_role_idx"
ON "public"."User"("deletedAt", "role");

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "User_email_trgm_idx"
ON "public"."User" USING gin ("email" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "User_firstName_trgm_idx"
ON "public"."User" USING gin ("firstName" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "User_lastName_trgm_idx"
ON "public"."User" USING gin ("lastName" gin_trgm_ops);
