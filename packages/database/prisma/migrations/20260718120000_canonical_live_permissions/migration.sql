BEGIN;

-- Deployment contract: every pre-canonical web/worker process must be stopped
-- before this migration runs. See docs/OPERATIONS.md.
--
-- Canonicalize persisted permission overrides in one pass. Only live,
-- per-user grantable overrides remain stored; role-bound, automatic,
-- roadmap, obsolete, unknown and non-boolean entries are discarded.
--
-- The final CTEs also resolve the complete dependency graph. This removes
-- orphan grants that could otherwise stay dormant and unexpectedly become
-- effective after a parent permission is granted later. The resulting JSON
-- is the minimal differential from the USER or ADMIN role preset.
WITH RECURSIVE
"permission_policy" ("key", "admin_default", "user_default") AS (
  VALUES
    ('account:update_profile', true, true),
    ('audit:export', true, false),
    ('audit:view', true, false),
    ('audit:view_sensitive', false, false),
    ('users:archive', true, false),
    ('users:create', true, false),
    ('users:export_activity', true, false),
    ('users:reset_password', true, false),
    ('users:revoke_sessions', true, false),
    ('users:update_access', true, false),
    ('users:update_account_policy', true, false),
    ('users:update_contact', true, false),
    ('users:update_login', true, false),
    ('users:update_profile', true, false),
    ('users:update_status', true, false),
    ('users:view', true, false),
    ('users:view_access', true, false),
    ('users:view_account_policy', true, false),
    ('users:view_activity', true, false),
    ('users:view_contact', true, false),
    ('users:view_security', true, false),
    ('users:view_sessions', true, false)
),
"permission_dependencies" ("key", "dependency_key") AS (
  VALUES
    ('audit:export', 'audit:view'),
    ('audit:view_sensitive', 'audit:view'),
    ('users:archive', 'users:view_security'),
    ('users:create', 'users:view'),
    ('users:export_activity', 'users:view_activity'),
    ('users:reset_password', 'users:view_security'),
    ('users:revoke_sessions', 'users:view_sessions'),
    ('users:update_access', 'users:view_access'),
    ('users:update_account_policy', 'users:view_account_policy'),
    ('users:update_contact', 'users:view'),
    ('users:update_contact', 'users:view_contact'),
    ('users:update_login', 'users:view'),
    ('users:update_profile', 'users:view'),
    ('users:update_status', 'users:view'),
    ('users:update_status', 'users:view_security'),
    ('users:view_access', 'users:view'),
    ('users:view_account_policy', 'users:view'),
    ('users:view_activity', 'users:view'),
    ('users:view_contact', 'users:view'),
    ('users:view_security', 'users:view'),
    ('users:view_sessions', 'users:view_security')
),
"legacy_permission_aliases" ("legacy_key", "canonical_key") AS (
  VALUES
    ('system:audit', 'audit:view'),
    ('system:audit_sensitive', 'audit:view_sensitive'),
    ('system:exports', 'audit:export'),
    ('users:delete', 'users:archive'),
    ('users:edit_permissions', 'users:update_access'),
    ('users:export', 'users:export_activity'),
    ('users:manage_account_policy', 'users:update_account_policy'),
    ('users:manage_status', 'users:update_status')
),
"source_permissions" AS (
  SELECT
    "id",
    "role"::text AS "role",
    CASE
      WHEN jsonb_typeof("permissions") = 'object' THEN "permissions"
      ELSE '{}'::jsonb
    END AS "permissions"
  FROM "public"."User"
  WHERE "permissions" IS NOT NULL
),
"canonical_entries" AS (
  SELECT
    "source"."id",
    "entry"."key",
    "entry"."value"
  FROM "source_permissions" AS "source"
  CROSS JOIN LATERAL jsonb_each("source"."permissions") AS "entry" ("key", "value")
  INNER JOIN "permission_policy" AS "policy"
    ON "policy"."key" = "entry"."key"
  WHERE jsonb_typeof("entry"."value") = 'boolean'
),
"legacy_entries" AS (
  SELECT
    "source"."id",
    "alias"."canonical_key" AS "key",
    "source"."permissions" -> "alias"."legacy_key" AS "value"
  FROM "source_permissions" AS "source"
  INNER JOIN "legacy_permission_aliases" AS "alias"
    ON "source"."permissions" ? "alias"."legacy_key"
  WHERE NOT (
      "source"."permissions" ? "alias"."canonical_key"
      AND jsonb_typeof(
        "source"."permissions" -> "alias"."canonical_key"
      ) = 'boolean'
    )
    AND jsonb_typeof(
      "source"."permissions" -> "alias"."legacy_key"
    ) = 'boolean'
),
"normalized_permissions" AS (
  SELECT
    "entries"."id",
    jsonb_object_agg(
      "entries"."key",
      "entries"."value"
      ORDER BY "entries"."key"
    ) AS "permissions"
  FROM (
    SELECT * FROM "canonical_entries"
    UNION ALL
    SELECT * FROM "legacy_entries"
  ) AS "entries"
  GROUP BY "entries"."id"
),
"canonicalized_users" AS (
  SELECT
    "source"."id",
    "source"."role",
    COALESCE("normalized"."permissions", '{}'::jsonb) AS "permissions"
  FROM "source_permissions" AS "source"
  LEFT JOIN "normalized_permissions" AS "normalized"
    ON "normalized"."id" = "source"."id"
),
"dependency_closure" ("key", "required_key") AS (
  SELECT "key", "dependency_key"
  FROM "permission_dependencies"

  UNION

  SELECT "closure"."key", "dependency"."dependency_key"
  FROM "dependency_closure" AS "closure"
  INNER JOIN "permission_dependencies" AS "dependency"
    ON "dependency"."key" = "closure"."required_key"
),
"permission_requirements" ("key", "required_key") AS (
  SELECT "key", "key" FROM "permission_policy"

  UNION

  SELECT "key", "required_key" FROM "dependency_closure"
),
"direct_permission_states" AS (
  SELECT
    "user"."id",
    "policy"."key",
    CASE
      WHEN jsonb_typeof("user"."permissions" -> "policy"."key") = 'boolean'
        THEN ("user"."permissions" ->> "policy"."key")::boolean
      WHEN "user"."role" = 'ADMIN' THEN "policy"."admin_default"
      ELSE "policy"."user_default"
    END AS "enabled",
    CASE
      WHEN "user"."role" = 'ADMIN' THEN "policy"."admin_default"
      ELSE "policy"."user_default"
    END AS "role_default"
  FROM "canonicalized_users" AS "user"
  CROSS JOIN "permission_policy" AS "policy"
),
"effective_permission_states" AS (
  SELECT
    "target"."id",
    "target"."key",
    "target"."role_default",
    bool_and("required"."enabled") AS "enabled"
  FROM "direct_permission_states" AS "target"
  INNER JOIN "permission_requirements" AS "requirement"
    ON "requirement"."key" = "target"."key"
  INNER JOIN "direct_permission_states" AS "required"
    ON "required"."id" = "target"."id"
    AND "required"."key" = "requirement"."required_key"
  GROUP BY "target"."id", "target"."key", "target"."role_default"
),
"enforced_permissions" AS (
  SELECT
    "id",
    jsonb_object_agg(
      "key",
      to_jsonb("enabled")
      ORDER BY "key"
    ) AS "permissions"
  FROM "effective_permission_states"
  WHERE "enabled" IS DISTINCT FROM "role_default"
  GROUP BY "id"
),
"updates" AS (
  SELECT
    "source"."id",
    NULLIF(
      COALESCE("enforced"."permissions", '{}'::jsonb),
      '{}'::jsonb
    ) AS "permissions"
  FROM "source_permissions" AS "source"
  LEFT JOIN "enforced_permissions" AS "enforced"
    ON "enforced"."id" = "source"."id"
)
UPDATE "public"."User" AS "user"
SET "permissions" = "updates"."permissions"
FROM "updates"
WHERE "user"."id" = "updates"."id"
  AND "user"."permissions" IS DISTINCT FROM "updates"."permissions";

COMMIT;
