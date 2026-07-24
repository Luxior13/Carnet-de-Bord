ALTER TABLE "public"."PartnerOrganization"
DROP CONSTRAINT IF EXISTS "PartnerOrganization_situationUpdatedById_fkey";

ALTER TABLE "public"."PartnerOrganization"
DROP COLUMN "currentSituation",
DROP COLUMN "situationUpdatedAt",
DROP COLUMN "situationUpdatedById";
