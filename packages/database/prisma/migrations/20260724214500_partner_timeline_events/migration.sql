CREATE TYPE "public"."PartnerTimelineEventType" AS ENUM (
    'RELATIONSHIP_CREATED',
    'STATUS_CHANGED',
    'PERIOD_CORRECTED',
    'ACTION_COMPLETED',
    'ACTION_REOPENED',
    'ACTION_UPDATED'
);

ALTER TABLE "public"."PartnerFollowUpEntry"
ADD COLUMN "authorDisplayNameSnapshot" VARCHAR(200),
ADD COLUMN "authorLoginNameSnapshot" VARCHAR(64);

ALTER TABLE "public"."PartnerFollowUpAction"
ADD COLUMN "completedByDisplayNameSnapshot" VARCHAR(200),
ADD COLUMN "completedByLoginNameSnapshot" VARCHAR(64);

UPDATE "public"."PartnerFollowUpEntry" AS follow_up
SET
  "authorDisplayNameSnapshot" = LEFT(
    COALESCE(
      NULLIF(btrim(concat_ws(' ', actor."firstName", actor."lastName")), ''),
      NULLIF(btrim(actor."loginName"), '')
    ),
    200
  ),
  "authorLoginNameSnapshot" = LEFT(
    NULLIF(btrim(actor."loginName"), ''),
    64
  )
FROM "public"."User" AS actor
WHERE actor."id" = follow_up."authorId";

UPDATE "public"."PartnerFollowUpAction" AS action
SET
  "completedByDisplayNameSnapshot" = LEFT(
    COALESCE(
      NULLIF(btrim(concat_ws(' ', actor."firstName", actor."lastName")), ''),
      NULLIF(btrim(actor."loginName"), '')
    ),
    200
  ),
  "completedByLoginNameSnapshot" = LEFT(
    NULLIF(btrim(actor."loginName"), ''),
    64
  )
FROM "public"."User" AS actor
WHERE actor."id" = action."completedById";

ALTER TABLE "public"."PartnerFollowUpEntry"
ADD CONSTRAINT "PartnerFollowUpEntry_author_snapshot_check" CHECK (
  (
    "authorDisplayNameSnapshot" IS NULL OR (
      "authorDisplayNameSnapshot" = btrim("authorDisplayNameSnapshot") AND
      "authorDisplayNameSnapshot" <> ''
    )
  ) AND
  (
    "authorLoginNameSnapshot" IS NULL OR (
      "authorLoginNameSnapshot" = btrim("authorLoginNameSnapshot") AND
      "authorLoginNameSnapshot" <> ''
    )
  )
);

ALTER TABLE "public"."PartnerFollowUpAction"
ADD CONSTRAINT "PartnerFollowUpAction_completer_snapshot_check" CHECK (
  (
    "completedByDisplayNameSnapshot" IS NULL OR (
      "completedByDisplayNameSnapshot" =
        btrim("completedByDisplayNameSnapshot") AND
      "completedByDisplayNameSnapshot" <> ''
    )
  ) AND
  (
    "completedByLoginNameSnapshot" IS NULL OR (
      "completedByLoginNameSnapshot" =
        btrim("completedByLoginNameSnapshot") AND
      "completedByLoginNameSnapshot" <> ''
    )
  )
);

CREATE TABLE "public"."PartnerTimelineEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "public"."PartnerTimelineEventType" NOT NULL,
    "operationId" VARCHAR(191) NOT NULL,
    "actorId" TEXT,
    "actorDisplayNameSnapshot" VARCHAR(200),
    "actorLoginNameSnapshot" VARCHAR(64),
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "formatVersion" INTEGER NOT NULL DEFAULT 1,
    "periodId" TEXT,
    "actionId" TEXT,
    "followUpEntryId" TEXT,
    "payload" JSONB NOT NULL,

    CONSTRAINT "PartnerTimelineEvent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PartnerTimelineEvent_values_check" CHECK (
      "operationId" = btrim("operationId") AND
      "operationId" <> '' AND
      (
        "actorDisplayNameSnapshot" IS NULL OR (
          "actorDisplayNameSnapshot" = btrim("actorDisplayNameSnapshot") AND
          "actorDisplayNameSnapshot" <> ''
        )
      ) AND
      (
        "actorLoginNameSnapshot" IS NULL OR (
          "actorLoginNameSnapshot" = btrim("actorLoginNameSnapshot") AND
          "actorLoginNameSnapshot" <> ''
        )
      ) AND
      "formatVersion" > 0 AND
      jsonb_typeof("payload") = 'object'
    )
);

CREATE UNIQUE INDEX "PartnerTimelineEvent_operationId_key"
ON "public"."PartnerTimelineEvent"("operationId");

CREATE INDEX "PartnerTimelineEvent_organizationId_occurredAt_id_idx"
ON "public"."PartnerTimelineEvent"("organizationId", "occurredAt" DESC, "id" DESC);

CREATE INDEX "PartnerTimelineEvent_actorId_idx"
ON "public"."PartnerTimelineEvent"("actorId");

CREATE INDEX "PartnerTimelineEvent_periodId_idx"
ON "public"."PartnerTimelineEvent"("periodId");

CREATE INDEX "PartnerTimelineEvent_actionId_idx"
ON "public"."PartnerTimelineEvent"("actionId");

CREATE INDEX "PartnerTimelineEvent_followUpEntryId_idx"
ON "public"."PartnerTimelineEvent"("followUpEntryId");

ALTER TABLE "public"."PartnerTimelineEvent"
ADD CONSTRAINT "PartnerTimelineEvent_organizationId_fkey"
FOREIGN KEY ("organizationId")
REFERENCES "public"."PartnerOrganization"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "public"."PartnerTimelineEvent"
ADD CONSTRAINT "PartnerTimelineEvent_actorId_fkey"
FOREIGN KEY ("actorId")
REFERENCES "public"."User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "public"."PartnerTimelineEvent"
ADD CONSTRAINT "PartnerTimelineEvent_periodId_fkey"
FOREIGN KEY ("periodId")
REFERENCES "public"."PartnerRelationshipPeriod"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "public"."PartnerTimelineEvent"
ADD CONSTRAINT "PartnerTimelineEvent_actionId_fkey"
FOREIGN KEY ("actionId")
REFERENCES "public"."PartnerFollowUpAction"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "public"."PartnerTimelineEvent"
ADD CONSTRAINT "PartnerTimelineEvent_followUpEntryId_fkey"
FOREIGN KEY ("followUpEntryId")
REFERENCES "public"."PartnerFollowUpEntry"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Optional references must always belong to the same fiche. The action check
-- follows its owning follow-up because PartnerFollowUpAction deliberately has
-- no duplicated organizationId column.
CREATE FUNCTION "public"."validate_partner_timeline_event_scope"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."periodId" IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM "public"."PartnerRelationshipPeriod" AS period
      WHERE period."id" = NEW."periodId"
        AND period."organizationId" = NEW."organizationId"
    )
  THEN
    RAISE EXCEPTION 'Partner timeline period belongs to another organization';
  END IF;

  IF NEW."followUpEntryId" IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM "public"."PartnerFollowUpEntry" AS follow_up
      WHERE follow_up."id" = NEW."followUpEntryId"
        AND follow_up."organizationId" = NEW."organizationId"
    )
  THEN
    RAISE EXCEPTION 'Partner timeline follow-up belongs to another organization';
  END IF;

  IF NEW."actionId" IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM "public"."PartnerFollowUpAction" AS action
      INNER JOIN "public"."PartnerFollowUpEntry" AS follow_up
        ON follow_up."id" = action."entryId"
      WHERE action."id" = NEW."actionId"
        AND follow_up."organizationId" = NEW."organizationId"
        AND (
          NEW."followUpEntryId" IS NULL
          OR action."entryId" = NEW."followUpEntryId"
        )
    )
  THEN
    RAISE EXCEPTION 'Partner timeline action belongs to another follow-up';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "PartnerTimelineEvent_validate_scope"
BEFORE INSERT ON "public"."PartnerTimelineEvent"
FOR EACH ROW EXECUTE FUNCTION "public"."validate_partner_timeline_event_scope"();

-- Existing fiches receive an explicit baseline at migration time. It records
-- only the state that can be established safely and never pretends that the
-- current status was also the status at the original creation date.
INSERT INTO "public"."PartnerTimelineEvent" (
    "id",
    "organizationId",
    "type",
    "operationId",
    "actorId",
    "actorDisplayNameSnapshot",
    "actorLoginNameSnapshot",
    "occurredAt",
    "formatVersion",
    "payload"
)
SELECT
    'timeline_' || md5(
      organization."id" || ':' || organization."createdAt"::text
    ),
    organization."id",
    'RELATIONSHIP_CREATED'::"public"."PartnerTimelineEventType",
    'migration:partner-timeline:v1:' || md5(organization."id"),
    NULL,
    'Système',
    NULL,
    CURRENT_TIMESTAMP,
    1,
    jsonb_build_object(
      'status',
      organization."status"::text,
      'startedOn',
      NULL,
      'endedOn',
      NULL,
      'closingNote',
      NULL,
      'source',
      'migration'
    )
FROM "public"."PartnerOrganization" AS organization;

-- A completed action is still reconstructible exactly from its source row, so
-- preserve that business fact instead of leaving it only in the purgable audit.
INSERT INTO "public"."PartnerTimelineEvent" (
    "id",
    "organizationId",
    "type",
    "operationId",
    "actorId",
    "actorDisplayNameSnapshot",
    "actorLoginNameSnapshot",
    "occurredAt",
    "formatVersion",
    "actionId",
    "followUpEntryId",
    "payload"
)
SELECT
    'timeline_' || md5('completed-action:' || action."id"),
    follow_up."organizationId",
    'ACTION_COMPLETED'::"public"."PartnerTimelineEventType",
    'migration:partner-action-completed:v1:' || md5(action."id"),
    action."completedById",
    action."completedByDisplayNameSnapshot",
    action."completedByLoginNameSnapshot",
    action."completedAt",
    1,
    action."id",
    follow_up."id",
    jsonb_build_object(
      'completedAt',
      action."completedAt",
      'description',
      action."description",
      'dueOn',
      CASE
        WHEN action."dueOn" IS NULL THEN NULL
        ELSE to_char(action."dueOn", 'YYYY-MM-DD')
      END,
      'source',
      'migration'
    )
FROM "public"."PartnerFollowUpAction" AS action
INNER JOIN "public"."PartnerFollowUpEntry" AS follow_up
  ON follow_up."id" = action."entryId"
WHERE action."completedAt" IS NOT NULL;

-- Events are append-only facts. The only permitted update is clearing a
-- nullable source reference through ON DELETE SET NULL; identity snapshots and
-- the structured business fact itself can never be rewritten.
CREATE FUNCTION "public"."prevent_partner_timeline_event_update"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."id" IS NOT DISTINCT FROM OLD."id"
    AND NEW."organizationId" IS NOT DISTINCT FROM OLD."organizationId"
    AND NEW."type" IS NOT DISTINCT FROM OLD."type"
    AND NEW."operationId" IS NOT DISTINCT FROM OLD."operationId"
    AND NEW."actorDisplayNameSnapshot" IS NOT DISTINCT FROM OLD."actorDisplayNameSnapshot"
    AND NEW."actorLoginNameSnapshot" IS NOT DISTINCT FROM OLD."actorLoginNameSnapshot"
    AND NEW."occurredAt" IS NOT DISTINCT FROM OLD."occurredAt"
    AND NEW."createdAt" IS NOT DISTINCT FROM OLD."createdAt"
    AND NEW."formatVersion" IS NOT DISTINCT FROM OLD."formatVersion"
    AND NEW."payload" IS NOT DISTINCT FROM OLD."payload"
    AND (
      NEW."actorId" IS NOT DISTINCT FROM OLD."actorId"
      OR (OLD."actorId" IS NOT NULL AND NEW."actorId" IS NULL)
    )
    AND (
      NEW."periodId" IS NOT DISTINCT FROM OLD."periodId"
      OR (OLD."periodId" IS NOT NULL AND NEW."periodId" IS NULL)
    )
    AND (
      NEW."actionId" IS NOT DISTINCT FROM OLD."actionId"
      OR (OLD."actionId" IS NOT NULL AND NEW."actionId" IS NULL)
    )
    AND (
      NEW."followUpEntryId" IS NOT DISTINCT FROM OLD."followUpEntryId"
      OR (
        OLD."followUpEntryId" IS NOT NULL
        AND NEW."followUpEntryId" IS NULL
      )
    )
  THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Partner timeline events are immutable';
END;
$$;

CREATE TRIGGER "PartnerTimelineEvent_prevent_update"
BEFORE UPDATE ON "public"."PartnerTimelineEvent"
FOR EACH ROW EXECUTE FUNCTION "public"."prevent_partner_timeline_event_update"();
