-- Preserve effective contact access before splitting identity and coordinates.
-- Audit snapshots remain immutable. Removed capabilities no longer have a UI/API.
BEGIN;
WITH current_access AS (
  SELECT "id", CASE WHEN jsonb_typeof("permissions") = 'object'
      THEN "permissions" ELSE '{}'::jsonb END AS permissions,
    CASE WHEN jsonb_typeof("permissions"->'persons:view') = 'boolean'
      THEN ("permissions"->>'persons:view')::boolean ELSE "role" = 'ADMIN' END AS can_view,
    CASE WHEN jsonb_typeof("permissions"->'persons:update') = 'boolean'
      THEN ("permissions"->>'persons:update')::boolean ELSE "role" = 'ADMIN' END AS can_update
  FROM "User"
  WHERE "isProtected" = false AND "deletedAt" IS NULL
), migrated AS (
  SELECT "id",
    (permissions - ARRAY['users:view_activity', 'users:export_activity', 'audit:view',
      'account:view_activity', 'users:export', 'system:audit']::text[])
    || CASE WHEN jsonb_typeof(permissions->'persons:view_contact') = 'boolean' THEN '{}'::jsonb
      ELSE jsonb_build_object('persons:view_contact', can_view) END
    || CASE WHEN jsonb_typeof(permissions->'persons:update_contact') = 'boolean' THEN '{}'::jsonb
      ELSE jsonb_build_object('persons:update_contact', can_view AND can_update) END AS permissions
  FROM current_access
)
UPDATE "User" u SET "permissions" = m.permissions, "updatedAt" = CURRENT_TIMESTAMP
FROM migrated m WHERE u."id" = m."id" AND u."permissions" IS DISTINCT FROM m.permissions;
COMMIT;
