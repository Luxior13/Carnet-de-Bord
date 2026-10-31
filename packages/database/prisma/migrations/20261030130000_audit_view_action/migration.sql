-- 30 October 2026: opening the activity journal leaves its own trace
-- (« celui qui surveille est surveillé »). Additive value only; existing
-- events and their classification are unchanged.
ALTER TYPE "public"."AuditAction" ADD VALUE 'AUDIT_VIEW' AFTER 'AUDIT_EXPORT';
