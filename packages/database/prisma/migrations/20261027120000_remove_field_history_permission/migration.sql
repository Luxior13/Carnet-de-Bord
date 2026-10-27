BEGIN;

-- 27 October 2026: the owner removed every « who filled this field » hint
-- from the interface; field history will come back with the activity log.
-- `audit:view_field_history` left the catalogue with its route. The
-- application already ignores the key and drops it at the next save; remove
-- the remaining stored overrides so the data matches the catalogue. Audit
-- events and field changes are kept. Tombstones carry no permissions and are
-- excluded by the condition.
UPDATE "public"."User"
SET "permissions" = CASE
  WHEN ("permissions" - 'audit:view_field_history') = '{}'::jsonb THEN NULL
  ELSE "permissions" - 'audit:view_field_history'
END
WHERE "deletedAt" IS NULL
  AND jsonb_typeof("permissions") = 'object'
  AND "permissions" ? 'audit:view_field_history';

COMMIT;
