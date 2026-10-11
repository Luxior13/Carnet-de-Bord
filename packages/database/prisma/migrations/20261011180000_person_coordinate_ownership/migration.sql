-- Keep a social profile attached to its original Person, as already enforced
-- for email addresses and phone numbers. No data rewrite is required.
CREATE TRIGGER "PersonSocialProfile_prevent_person_reassignment"
BEFORE UPDATE OF "personId"
ON "public"."PersonSocialProfile"
FOR EACH ROW
EXECUTE FUNCTION "prevent_person_coordinate_reassignment"();
