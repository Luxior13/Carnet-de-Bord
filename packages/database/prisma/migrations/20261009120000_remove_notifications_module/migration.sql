BEGIN;

-- The « Notifications » module was removed on 2026-10-09 so the design and the
-- expected channels can be clarified before rebuilding it. Its transient inbox
-- data is dropped here and the module is re-announced on
-- /systeme/feuille-de-route only. The specification needed to rebuild it is
-- kept in `features/notifications-rappels.md`,
-- `features/pages/vie-interne/notifications-rappels.md` and
-- `features/pages/systeme/modeles-notifications.md`.
--
-- The audit journal is intentionally NOT touched. `AuditAction.NOTIFICATION_SEND`
-- and the existing AuditLog rows stay in place: the journal is append-only, so
-- historical entries remain readable. No application code produces new
-- notification audit events anymore.

DROP TABLE IF EXISTS "public"."NotificationRecipient";
DROP TABLE IF EXISTS "public"."Notification";

DROP TYPE IF EXISTS "public"."NotificationSeverity";

COMMIT;
