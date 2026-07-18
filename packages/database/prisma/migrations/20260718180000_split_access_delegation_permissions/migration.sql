BEGIN;

-- Deployment contract: every web/worker process that only knows
-- users:update_access must be stopped before this migration runs. See
-- docs/OPERATIONS.md.
--
-- Split the former all-in-one access mutation capability into three explicit
-- capabilities. Canonical values win over legacy aliases, and an explicit
-- value is only kept when it differs from the role preset (ADMIN=true,
-- USER=false). This preserves both effective access and differential storage.
WITH
"source_permissions" AS (
  SELECT
    "id",
    "role"::text AS "role",
    "permissions",
    CASE
      WHEN jsonb_typeof("permissions" -> 'users:update_access') = 'boolean'
        THEN "permissions" -> 'users:update_access'
      WHEN jsonb_typeof("permissions" -> 'users:edit_permissions') = 'boolean'
        THEN "permissions" -> 'users:edit_permissions'
      ELSE NULL
    END AS "legacy_value"
  FROM "public"."User"
  WHERE jsonb_typeof("permissions") = 'object'
    AND (
      "permissions" ? 'users:update_access'
      OR "permissions" ? 'users:edit_permissions'
    )
),
"normalized_permissions" AS (
  SELECT
    "id",
    "role",
    "permissions",
    "legacy_value",
    ("role" = 'ADMIN') AS "role_default"
  FROM "source_permissions"
),
"updates" AS (
  SELECT
    "id",
    NULLIF(
      (
        "permissions"
          - 'users:update_access'
          - 'users:edit_permissions'
          - 'users:grant_access'
          - 'users:revoke_access'
          - 'users:delegate_access'
      )
      || CASE
        WHEN jsonb_typeof("permissions" -> 'users:grant_access') = 'boolean'
          AND (("permissions" ->> 'users:grant_access')::boolean)
            IS DISTINCT FROM "role_default"
          THEN jsonb_build_object(
            'users:grant_access',
            "permissions" -> 'users:grant_access'
          )
        WHEN jsonb_typeof("permissions" -> 'users:grant_access')
            IS DISTINCT FROM 'boolean'
          AND "legacy_value" IS NOT NULL
          AND (("legacy_value" #>> '{}')::boolean)
            IS DISTINCT FROM "role_default"
          THEN jsonb_build_object('users:grant_access', "legacy_value")
        ELSE '{}'::jsonb
      END
      || CASE
        WHEN jsonb_typeof("permissions" -> 'users:revoke_access') = 'boolean'
          AND (("permissions" ->> 'users:revoke_access')::boolean)
            IS DISTINCT FROM "role_default"
          THEN jsonb_build_object(
            'users:revoke_access',
            "permissions" -> 'users:revoke_access'
          )
        WHEN jsonb_typeof("permissions" -> 'users:revoke_access')
            IS DISTINCT FROM 'boolean'
          AND "legacy_value" IS NOT NULL
          AND (("legacy_value" #>> '{}')::boolean)
            IS DISTINCT FROM "role_default"
          THEN jsonb_build_object('users:revoke_access', "legacy_value")
        ELSE '{}'::jsonb
      END
      || CASE
        WHEN jsonb_typeof("permissions" -> 'users:delegate_access') = 'boolean'
          AND (("permissions" ->> 'users:delegate_access')::boolean)
            IS DISTINCT FROM "role_default"
          THEN jsonb_build_object(
            'users:delegate_access',
            "permissions" -> 'users:delegate_access'
          )
        WHEN jsonb_typeof("permissions" -> 'users:delegate_access')
            IS DISTINCT FROM 'boolean'
          AND "legacy_value" IS NOT NULL
          AND (("legacy_value" #>> '{}')::boolean)
            IS DISTINCT FROM "role_default"
          THEN jsonb_build_object('users:delegate_access', "legacy_value")
        ELSE '{}'::jsonb
      END,
      '{}'::jsonb
    ) AS "permissions"
  FROM "normalized_permissions"
)
UPDATE "public"."User" AS "user"
SET "permissions" = "updates"."permissions"
FROM "updates"
WHERE "user"."id" = "updates"."id"
  AND "user"."permissions" IS DISTINCT FROM "updates"."permissions";

COMMIT;
