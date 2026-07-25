BEGIN;

ALTER TABLE "public"."PartnerContact"
ADD COLUMN "selectedEmailId" TEXT,
ADD COLUMN "selectedPhoneId" TEXT;

CREATE INDEX "PartnerContact_selectedEmailId_idx"
ON "public"."PartnerContact"("selectedEmailId");

CREATE INDEX "PartnerContact_selectedPhoneId_idx"
ON "public"."PartnerContact"("selectedPhoneId");

ALTER TABLE "public"."PartnerContact"
ADD CONSTRAINT "PartnerContact_selectedEmailId_fkey"
FOREIGN KEY ("selectedEmailId") REFERENCES "public"."PersonEmail"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."PartnerContact"
ADD CONSTRAINT "PartnerContact_selectedPhoneId_fkey"
FOREIGN KEY ("selectedPhoneId") REFERENCES "public"."PersonPhone"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "public"."PartnerContact"
SET
    "closedAt" = COALESCE("closedAt", CURRENT_TIMESTAMP),
    "isPrimary" = false,
    "label" = 'Interlocuteur supprimé',
    "selectedEmailId" = NULL,
    "selectedPhoneId" = NULL,
    "updatedAt" = CURRENT_TIMESTAMP,
    "version" = "version" + 1
WHERE "personId" IS NULL;

CREATE OR REPLACE FUNCTION "validate_partner_contact_selected_coordinates"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
    IF NEW."personId" IS NULL THEN
        NEW."closedAt" := COALESCE(NEW."closedAt", CURRENT_TIMESTAMP);
        NEW."isPrimary" := false;
        NEW."label" := 'Interlocuteur supprimé';
        NEW."selectedEmailId" := NULL;
        NEW."selectedPhoneId" := NULL;
    ELSIF NEW."closedAt" IS NOT NULL THEN
        NEW."isPrimary" := false;
        NEW."selectedEmailId" := NULL;
        NEW."selectedPhoneId" := NULL;
    ELSE
        IF NEW."selectedEmailId" IS NOT NULL
           AND NOT EXISTS (
               SELECT 1
               FROM "public"."PersonEmail" AS email
               WHERE email."id" = NEW."selectedEmailId"
                 AND email."personId" = NEW."personId"
           ) THEN
            RAISE EXCEPTION 'Selected email does not belong to partner contact person'
                USING
                    ERRCODE = '23503',
                    CONSTRAINT = 'PartnerContact_selectedEmail_owner_check';
        END IF;

        IF NEW."selectedPhoneId" IS NOT NULL
           AND NOT EXISTS (
               SELECT 1
               FROM "public"."PersonPhone" AS phone
               WHERE phone."id" = NEW."selectedPhoneId"
                 AND phone."personId" = NEW."personId"
           ) THEN
            RAISE EXCEPTION 'Selected phone does not belong to partner contact person'
                USING
                    ERRCODE = '23503',
                    CONSTRAINT = 'PartnerContact_selectedPhone_owner_check';
        END IF;
    END IF;

    IF TG_OP = 'UPDATE'
       AND (
           NEW."personId",
           NEW."selectedEmailId",
           NEW."selectedPhoneId"
       ) IS DISTINCT FROM (
           OLD."personId",
           OLD."selectedEmailId",
           OLD."selectedPhoneId"
       )
       AND NEW."version" = OLD."version" THEN
        NEW."version" := OLD."version" + 1;
        NEW."updatedAt" := CURRENT_TIMESTAMP;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER "PartnerContact_selected_coordinates_guard"
BEFORE INSERT OR UPDATE
ON "public"."PartnerContact"
FOR EACH ROW
EXECUTE FUNCTION "validate_partner_contact_selected_coordinates"();

CREATE OR REPLACE FUNCTION "prevent_person_coordinate_reassignment"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
    IF NEW."personId" IS DISTINCT FROM OLD."personId" THEN
        RAISE EXCEPTION 'A person coordinate cannot be reassigned'
            USING
                ERRCODE = '23514',
                CONSTRAINT = 'PersonCoordinate_personId_immutable';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER "PersonEmail_prevent_person_reassignment"
BEFORE UPDATE OF "personId"
ON "public"."PersonEmail"
FOR EACH ROW
EXECUTE FUNCTION "prevent_person_coordinate_reassignment"();

CREATE TRIGGER "PersonPhone_prevent_person_reassignment"
BEFORE UPDATE OF "personId"
ON "public"."PersonPhone"
FOR EACH ROW
EXECUTE FUNCTION "prevent_person_coordinate_reassignment"();

COMMIT;
