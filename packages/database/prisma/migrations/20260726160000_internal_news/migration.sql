ALTER TYPE "AuditAction" ADD VALUE 'INTERNAL_ANNOUNCEMENT_PUBLISH';
ALTER TYPE "AuditAction" ADD VALUE 'INTERNAL_ANNOUNCEMENT_PIN_UPDATE';

CREATE TABLE "InternalAnnouncement" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "body" VARCHAR(2000) NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pinnedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "authorDisplayNameSnapshot" VARCHAR(200) NOT NULL,
    "authorLoginNameSnapshot" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternalAnnouncement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InternalAnnouncement_publishedAt_id_idx"
ON "InternalAnnouncement"("publishedAt", "id");

CREATE INDEX "InternalAnnouncement_pinnedAt_publishedAt_id_idx"
ON "InternalAnnouncement"("pinnedAt", "publishedAt", "id");

CREATE INDEX "InternalAnnouncement_createdById_idx"
ON "InternalAnnouncement"("createdById");

ALTER TABLE "InternalAnnouncement"
ADD CONSTRAINT "InternalAnnouncement_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
