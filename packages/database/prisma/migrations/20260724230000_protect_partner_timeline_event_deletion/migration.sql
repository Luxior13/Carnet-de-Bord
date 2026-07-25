-- PartnerTimelineEvent is append-only while its owning fiche exists. A
-- physical delete remains legitimate only as part of the database-level
-- cascade caused by deleting that owning PartnerOrganization.
--
-- PostgreSQL executes ON DELETE CASCADE as a DELETE on the referencing table
-- after the referenced row has been deleted. The parent-existence check thus
-- distinguishes a direct child delete from the intended ownership cascade
-- without relying on application code or session-local flags.
CREATE FUNCTION "public"."prevent_partner_timeline_event_delete"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "public"."PartnerOrganization" AS organization
    WHERE organization."id" = OLD."organizationId"
  )
  THEN
    RAISE EXCEPTION
      'Partner timeline events may only be deleted with their owning organization'
      USING ERRCODE = '23503';
  END IF;

  RETURN OLD;
END;
$$;

CREATE TRIGGER "PartnerTimelineEvent_prevent_delete"
BEFORE DELETE ON "public"."PartnerTimelineEvent"
FOR EACH ROW EXECUTE FUNCTION "public"."prevent_partner_timeline_event_delete"();
