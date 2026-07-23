CREATE TYPE "public"."PartnerOrganizationCategoryType" AS ENUM ('SPONSOR', 'PARTNER');
CREATE TYPE "public"."PartnerOrganizationStatus" AS ENUM ('PROSPECT', 'DISCUSSION', 'ACTIVE', 'ENDED', 'CLOSED');
CREATE TYPE "public"."PartnerContactChannelType" AS ENUM ('EMAIL', 'PHONE');

ALTER TYPE "public"."AuditAction" ADD VALUE 'PARTNER_CREATE';
ALTER TYPE "public"."AuditAction" ADD VALUE 'PARTNER_UPDATE';
ALTER TYPE "public"."AuditAction" ADD VALUE 'PARTNER_STATUS_UPDATE';
ALTER TYPE "public"."AuditAction" ADD VALUE 'PARTNER_PERIOD_CREATE';
ALTER TYPE "public"."AuditAction" ADD VALUE 'PARTNER_PERIOD_UPDATE';
ALTER TYPE "public"."AuditAction" ADD VALUE 'PARTNER_CONTACTS_UPDATE';
ALTER TYPE "public"."AuditAction" ADD VALUE 'PARTNER_FOLLOW_UP_CREATE';
ALTER TYPE "public"."AuditAction" ADD VALUE 'PARTNER_FOLLOW_UP_UPDATE';
ALTER TYPE "public"."AuditAction" ADD VALUE 'PARTNER_FOLLOW_UP_DELETE';
ALTER TYPE "public"."AuditAction" ADD VALUE 'PARTNER_FOLLOW_UP_COMPLETE';
ALTER TYPE "public"."AuditAction" ADD VALUE 'PARTNER_MERGE';
ALTER TYPE "public"."AuditAction" ADD VALUE 'PARTNER_DELETE';
ALTER TYPE "public"."AuditCategory" ADD VALUE 'PARTNER';

CREATE TABLE "public"."PartnerOrganization" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "normalizedName" VARCHAR(400) NOT NULL,
    "description" VARCHAR(500),
    "status" "public"."PartnerOrganizationStatus" NOT NULL DEFAULT 'PROSPECT',
    "website" VARCHAR(2048),
    "normalizedDomain" VARCHAR(253),
    "currentSituation" VARCHAR(1000),
    "situationUpdatedAt" TIMESTAMP(3),
    "situationUpdatedById" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PartnerOrganization_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PartnerOrganization_name_check" CHECK (
      "name" = btrim("name") AND "name" <> '' AND
      "normalizedName" = btrim("normalizedName") AND "normalizedName" <> ''
    ),
    CONSTRAINT "PartnerOrganization_version_check" CHECK ("version" > 0)
);

CREATE TABLE "public"."PartnerOrganizationCategory" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "category" "public"."PartnerOrganizationCategoryType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PartnerOrganizationCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."PartnerOrganizationContactChannel" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "public"."PartnerContactChannelType" NOT NULL,
    "value" VARCHAR(320) NOT NULL,
    "normalizedValue" VARCHAR(320) NOT NULL,
    "label" VARCHAR(40) NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PartnerOrganizationContactChannel_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PartnerOrganizationContactChannel_values_check" CHECK (
      "value" = btrim("value") AND "value" <> '' AND
      "normalizedValue" = btrim("normalizedValue") AND "normalizedValue" <> '' AND
      "label" = btrim("label") AND "label" <> '' AND
      "version" > 0
    )
);

CREATE TABLE "public"."PartnerRelationshipPeriod" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "startedOn" DATE,
    "endedOn" DATE,
    "closedAt" TIMESTAMP(3),
    "closingNote" VARCHAR(300),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PartnerRelationshipPeriod_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PartnerRelationshipPeriod_dates_check" CHECK (
      "endedOn" IS NULL OR "startedOn" IS NULL OR "endedOn" >= "startedOn"
    ),
    CONSTRAINT "PartnerRelationshipPeriod_version_check" CHECK ("version" > 0)
);

CREATE TABLE "public"."PartnerContact" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "personId" TEXT,
    "label" VARCHAR(80) NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "startedOn" DATE,
    "endedOn" DATE,
    "closedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PartnerContact_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PartnerContact_values_check" CHECK (
      "label" = btrim("label") AND "label" <> '' AND
      ("closedAt" IS NULL OR "isPrimary" = false) AND
      ("endedOn" IS NULL OR "startedOn" IS NULL OR "endedOn" >= "startedOn") AND
      "version" > 0
    )
);

CREATE TABLE "public"."PartnerFollowUpEntry" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "partnerContactId" TEXT,
    "text" VARCHAR(4000) NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "authorId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PartnerFollowUpEntry_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PartnerFollowUpEntry_values_check" CHECK (
      "text" = btrim("text") AND "text" <> '' AND "version" > 0
    )
);

CREATE TABLE "public"."PartnerFollowUpAction" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "description" VARCHAR(300) NOT NULL,
    "dueOn" DATE,
    "completedAt" TIMESTAMP(3),
    "completedById" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PartnerFollowUpAction_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PartnerFollowUpAction_values_check" CHECK (
      "description" = btrim("description") AND "description" <> '' AND
      (("completedAt" IS NULL AND "completedById" IS NULL) OR "completedAt" IS NOT NULL) AND
      "version" > 0
    )
);

CREATE TABLE "public"."PartnerOrganizationDeletionTombstone" (
    "organizationId" VARCHAR(128) NOT NULL,
    "deletionOperationId" VARCHAR(191) NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PartnerOrganizationDeletionTombstone_pkey" PRIMARY KEY ("organizationId"),
    CONSTRAINT "PartnerOrganizationDeletionTombstone_values_check" CHECK (
      "organizationId" = btrim("organizationId") AND "organizationId" <> '' AND
      "deletionOperationId" = btrim("deletionOperationId") AND "deletionOperationId" <> ''
    )
);

CREATE TABLE "public"."PartnerOrganizationMergeRedirect" (
    "sourceOrganizationId" VARCHAR(128) NOT NULL,
    "targetOrganizationId" TEXT NOT NULL,
    "mergeOperationId" VARCHAR(191) NOT NULL,
    "mergedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PartnerOrganizationMergeRedirect_pkey" PRIMARY KEY ("sourceOrganizationId")
);

CREATE INDEX "PartnerOrganization_normalizedName_id_idx" ON "public"."PartnerOrganization"("normalizedName", "id");
CREATE INDEX "PartnerOrganization_status_normalizedName_id_idx" ON "public"."PartnerOrganization"("status", "normalizedName", "id");
CREATE INDEX "PartnerOrganization_updatedAt_id_idx" ON "public"."PartnerOrganization"("updatedAt", "id");
CREATE INDEX "PartnerOrganization_status_updatedAt_id_idx" ON "public"."PartnerOrganization"("status", "updatedAt", "id");
CREATE INDEX "PartnerOrganization_normalizedDomain_idx" ON "public"."PartnerOrganization"("normalizedDomain");
CREATE INDEX "PartnerOrganization_normalizedName_trgm_idx" ON "public"."PartnerOrganization" USING GIN ("normalizedName" gin_trgm_ops);
CREATE INDEX "PartnerOrganizationCategory_category_organizationId_idx" ON "public"."PartnerOrganizationCategory"("category", "organizationId");
CREATE UNIQUE INDEX "PartnerOrganizationCategory_organizationId_category_key" ON "public"."PartnerOrganizationCategory"("organizationId", "category");
CREATE UNIQUE INDEX "PartnerOrganizationContactChannel_organizationId_type_normalizedValue_key" ON "public"."PartnerOrganizationContactChannel"("organizationId", "type", "normalizedValue");
CREATE INDEX "PartnerOrganizationContactChannel_normalizedValue_idx" ON "public"."PartnerOrganizationContactChannel"("normalizedValue");
CREATE INDEX "PartnerOrganizationContactChannel_organizationId_type_createdAt_idx" ON "public"."PartnerOrganizationContactChannel"("organizationId", "type", "createdAt");
CREATE UNIQUE INDEX "PartnerOrganizationContactChannel_primary_key" ON "public"."PartnerOrganizationContactChannel"("organizationId", "type") WHERE "isPrimary" = true;
CREATE INDEX "PartnerRelationshipPeriod_organizationId_createdAt_idx" ON "public"."PartnerRelationshipPeriod"("organizationId", "createdAt");
CREATE INDEX "PartnerRelationshipPeriod_organizationId_closedAt_idx" ON "public"."PartnerRelationshipPeriod"("organizationId", "closedAt");
CREATE INDEX "PartnerRelationshipPeriod_startedOn_idx" ON "public"."PartnerRelationshipPeriod"("startedOn");
CREATE INDEX "PartnerRelationshipPeriod_endedOn_idx" ON "public"."PartnerRelationshipPeriod"("endedOn");
CREATE UNIQUE INDEX "PartnerRelationshipPeriod_open_key" ON "public"."PartnerRelationshipPeriod"("organizationId") WHERE "closedAt" IS NULL;
CREATE INDEX "PartnerContact_organizationId_closedAt_createdAt_idx" ON "public"."PartnerContact"("organizationId", "closedAt", "createdAt");
CREATE INDEX "PartnerContact_personId_closedAt_idx" ON "public"."PartnerContact"("personId", "closedAt");
CREATE UNIQUE INDEX "PartnerContact_active_person_key" ON "public"."PartnerContact"("organizationId", "personId") WHERE "closedAt" IS NULL AND "personId" IS NOT NULL;
CREATE UNIQUE INDEX "PartnerContact_primary_key" ON "public"."PartnerContact"("organizationId") WHERE "closedAt" IS NULL AND "isPrimary" = true;
CREATE INDEX "PartnerFollowUpEntry_organizationId_occurredAt_id_idx" ON "public"."PartnerFollowUpEntry"("organizationId", "occurredAt", "id");
CREATE INDEX "PartnerFollowUpEntry_partnerContactId_idx" ON "public"."PartnerFollowUpEntry"("partnerContactId");
CREATE INDEX "PartnerFollowUpEntry_authorId_idx" ON "public"."PartnerFollowUpEntry"("authorId");
CREATE UNIQUE INDEX "PartnerFollowUpAction_entryId_key" ON "public"."PartnerFollowUpAction"("entryId");
CREATE INDEX "PartnerFollowUpAction_completedAt_dueOn_id_idx" ON "public"."PartnerFollowUpAction"("completedAt", "dueOn", "id");
CREATE INDEX "PartnerFollowUpAction_completedById_idx" ON "public"."PartnerFollowUpAction"("completedById");
CREATE UNIQUE INDEX "PartnerOrganizationDeletionTombstone_deletionOperationId_key" ON "public"."PartnerOrganizationDeletionTombstone"("deletionOperationId");
CREATE UNIQUE INDEX "PartnerOrganizationMergeRedirect_mergeOperationId_key" ON "public"."PartnerOrganizationMergeRedirect"("mergeOperationId");
CREATE INDEX "PartnerOrganizationMergeRedirect_targetOrganizationId_idx" ON "public"."PartnerOrganizationMergeRedirect"("targetOrganizationId");

ALTER TABLE "public"."PartnerOrganization" ADD CONSTRAINT "PartnerOrganization_situationUpdatedById_fkey" FOREIGN KEY ("situationUpdatedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."PartnerOrganization" ADD CONSTRAINT "PartnerOrganization_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."PartnerOrganization" ADD CONSTRAINT "PartnerOrganization_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."PartnerOrganizationCategory" ADD CONSTRAINT "PartnerOrganizationCategory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."PartnerOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."PartnerOrganizationContactChannel" ADD CONSTRAINT "PartnerOrganizationContactChannel_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."PartnerOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."PartnerRelationshipPeriod" ADD CONSTRAINT "PartnerRelationshipPeriod_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."PartnerOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."PartnerContact" ADD CONSTRAINT "PartnerContact_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."PartnerOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."PartnerContact" ADD CONSTRAINT "PartnerContact_personId_fkey" FOREIGN KEY ("personId") REFERENCES "public"."Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."PartnerFollowUpEntry" ADD CONSTRAINT "PartnerFollowUpEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."PartnerOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."PartnerFollowUpEntry" ADD CONSTRAINT "PartnerFollowUpEntry_partnerContactId_fkey" FOREIGN KEY ("partnerContactId") REFERENCES "public"."PartnerContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."PartnerFollowUpEntry" ADD CONSTRAINT "PartnerFollowUpEntry_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."PartnerFollowUpAction" ADD CONSTRAINT "PartnerFollowUpAction_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "public"."PartnerFollowUpEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."PartnerFollowUpAction" ADD CONSTRAINT "PartnerFollowUpAction_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."PartnerOrganizationMergeRedirect" ADD CONSTRAINT "PartnerOrganizationMergeRedirect_targetOrganizationId_fkey" FOREIGN KEY ("targetOrganizationId") REFERENCES "public"."PartnerOrganization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION "prevent_partner_tombstone_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Partner tombstones and merge redirects are immutable';
END;
$$;

CREATE TRIGGER "PartnerOrganizationDeletionTombstone_prevent_mutation"
BEFORE UPDATE OR DELETE ON "public"."PartnerOrganizationDeletionTombstone"
FOR EACH ROW EXECUTE FUNCTION "prevent_partner_tombstone_mutation"();

CREATE TRIGGER "PartnerOrganizationMergeRedirect_prevent_mutation"
BEFORE UPDATE OR DELETE ON "public"."PartnerOrganizationMergeRedirect"
FOR EACH ROW EXECUTE FUNCTION "prevent_partner_tombstone_mutation"();
