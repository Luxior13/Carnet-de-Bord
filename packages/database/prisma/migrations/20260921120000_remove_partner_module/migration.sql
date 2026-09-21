BEGIN;

-- The « Sponsors & partenaires » module was removed on 2026-09-21 so the
-- product base can be rebuilt cleanly. Its business data is dropped here and
-- the module is re-announced on /feuille-de-route only. The complete
-- specification needed to rebuild it is kept in
-- `features/pages/bureau-juridique/sponsors-partenaires.md`.
--
-- The audit journal is intentionally NOT touched. `AuditAction.PARTNER_*`,
-- `AuditCategory.PARTNER` and the existing AuditLog rows stay in place: the
-- journal is append-only, so historical entries remain readable exactly like
-- the older `BACKGROUND_JOB_UPDATE` events. No application code produces new
-- partner audit events anymore.
--
-- `prevent_person_coordinate_reassignment` and its PersonEmail / PersonPhone
-- triggers are kept on purpose: they protect Répertoire data integrity and are
-- not partner-owned objects.

DROP TABLE IF EXISTS "public"."PartnerOrganizationMergeRedirect";
DROP TABLE IF EXISTS "public"."PartnerTimelineEvent";
DROP TABLE IF EXISTS "public"."PartnerFollowUpAction";
DROP TABLE IF EXISTS "public"."PartnerFollowUpEntry";
DROP TABLE IF EXISTS "public"."PartnerContact";
DROP TABLE IF EXISTS "public"."PartnerRelationshipPeriod";
DROP TABLE IF EXISTS "public"."PartnerOrganizationContactChannel";
DROP TABLE IF EXISTS "public"."PartnerOrganizationCategory";
DROP TABLE IF EXISTS "public"."PartnerOrganizationDeletionTombstone";
DROP TABLE IF EXISTS "public"."PartnerOrganization";

DROP FUNCTION IF EXISTS "public"."validate_partner_timeline_event_scope"();
DROP FUNCTION IF EXISTS "public"."prevent_partner_timeline_event_update"();
DROP FUNCTION IF EXISTS "public"."prevent_partner_timeline_event_delete"();
DROP FUNCTION IF EXISTS "public"."validate_partner_contact_selected_coordinates"();
DROP FUNCTION IF EXISTS "public"."prevent_partner_tombstone_mutation"();

DROP TYPE IF EXISTS "public"."PartnerTimelineEventType";
DROP TYPE IF EXISTS "public"."PartnerContactChannelType";
DROP TYPE IF EXISTS "public"."PartnerOrganizationStatus";
DROP TYPE IF EXISTS "public"."PartnerOrganizationCategoryType";

COMMIT;
