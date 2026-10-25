BEGIN;

-- Revue complète du 23 octobre 2026, REV-18, applied on 25 October 2026.
--
-- InternalAnnouncement belonged to the « Actualité interne » module, removed
-- from the site and kept as a planned feature: the module will define its own
-- storage when it is rebuilt. ArchivedStaffProfile was a read-only copy of the
-- legacy StaffProfile table that no screen reads; account deletion was its
-- only remaining writer. Both are dropped; take a signed backup first, it is
-- the export of their rows. Backups now use format v10, without these tables.
DROP TABLE IF EXISTS "public"."InternalAnnouncement";
DROP TABLE IF EXISTS "public"."ArchivedStaffProfile";

-- `audit:view_sensitive` left the catalogue on 24 October 2026 (REV-13). The
-- application already ignores it and drops it at the next save; remove the
-- remaining stored overrides so the data matches the catalogue. Tombstones
-- carry no permissions and are excluded by the condition.
UPDATE "public"."User"
SET "permissions" = CASE
  WHEN ("permissions" - 'audit:view_sensitive') = '{}'::jsonb THEN NULL
  ELSE "permissions" - 'audit:view_sensitive'
END
WHERE "deletedAt" IS NULL
  AND jsonb_typeof("permissions") = 'object'
  AND "permissions" ? 'audit:view_sensitive';

COMMIT;
