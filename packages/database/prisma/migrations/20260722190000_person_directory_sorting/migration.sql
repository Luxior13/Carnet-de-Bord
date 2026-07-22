ALTER TABLE "public"."Person"
ADD COLUMN "sortName" VARCHAR(401);

UPDATE "public"."Person"
SET "sortName" = COALESCE(
  "normalizedNickname",
  "normalizedFirstName" || ' ' || "normalizedLastName"
);

ALTER TABLE "public"."Person"
ALTER COLUMN "sortName" SET NOT NULL;

CREATE INDEX "Person_updatedAt_id_idx"
ON "public"."Person"("updatedAt", "id");

CREATE INDEX "Person_structureStatus_updatedAt_id_idx"
ON "public"."Person"("structureStatus", "updatedAt", "id");

CREATE INDEX "Person_sortName_id_idx"
ON "public"."Person"("sortName", "id");

CREATE INDEX "Person_structureStatus_sortName_id_idx"
ON "public"."Person"("structureStatus", "sortName", "id");
