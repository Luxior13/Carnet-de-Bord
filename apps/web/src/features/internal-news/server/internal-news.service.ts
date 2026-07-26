import 'server-only';

import type {
  InternalAnnouncement,
  PartnerTimelineEvent,
  Prisma,
} from '@prisma/client';
import { AuditAction } from '@repo/database';

import {
  buildCursorPaginationMeta,
  decodeKeysetCursor,
  hashCursorFilters,
} from '$server/cursor-pagination';
import { prisma } from '$server/prisma';
import type { UserType } from '$types/auth.types';

import { getPartnerNewsCopy } from '../internal-news.mapper';
import type {
  InternalAnnouncementItem,
  InternalNewsFilter,
  InternalNewsItem,
  InternalNewsResponse,
  InternalPartnerNewsItem,
  PublishInternalAnnouncementInput,
} from '../internal-news.types';
import { createInternalNewsAudit } from './internal-news-audit';

type FeedSource = 'announcement' | 'partner';

type FeedCursor = {
  id: string;
  occurredAt: Date;
  source: FeedSource;
};

const INTERNAL_NEWS_RESOURCE = 'internal-news';
const MAX_PINNED_ANNOUNCEMENTS = 5;
const PARTNER_NEWS_EVENT_TYPES = [
  'RELATIONSHIP_CREATED',
  'STATUS_CHANGED',
] as const;

const getActorSnapshot = (
  actor: Pick<UserType, 'firstName' | 'id' | 'lastName' | 'loginName'>,
): {
  authorDisplayNameSnapshot: string;
  authorLoginNameSnapshot: string;
  createdById: string;
} => ({
  authorDisplayNameSnapshot: (
    `${actor.firstName.trim()} ${actor.lastName.trim()}`.trim() ||
    actor.loginName
  ).slice(0, 200),
  authorLoginNameSnapshot: actor.loginName.slice(0, 64),
  createdById: actor.id,
});

const mapAnnouncement = (
  announcement: InternalAnnouncement,
): InternalAnnouncementItem => ({
  actor: {
    displayName: announcement.authorDisplayNameSnapshot,
    loginName: announcement.authorLoginNameSnapshot,
  },
  body: announcement.body,
  href: null,
  id: `announcement:${announcement.id}`,
  isPinned: announcement.pinnedAt !== null,
  kind: 'ANNOUNCEMENT',
  occurredAt: announcement.publishedAt.toISOString(),
  title: announcement.title,
});

type PartnerNewsEvent = PartnerTimelineEvent & {
  organization: { id: string; name: string };
};

const mapPartnerEvent = (event: PartnerNewsEvent): InternalPartnerNewsItem => {
  const copy = getPartnerNewsCopy(
    event.organization.name,
    event.type as (typeof PARTNER_NEWS_EVENT_TYPES)[number],
    event.payload,
  );

  return {
    actor: {
      displayName:
        event.actorDisplayNameSnapshot ??
        event.actorLoginNameSnapshot ??
        'Compte indisponible',
      loginName: event.actorLoginNameSnapshot,
    },
    body: copy.body,
    href: `/bureau-juridique/partenaires/${encodeURIComponent(event.organization.id)}`,
    id: `partner:${event.id}`,
    kind: 'PARTNER_EVENT',
    occurredAt: event.occurredAt.toISOString(),
    partner: event.organization,
    statusTransition: copy.statusTransition,
    title: copy.title,
  };
};

const parseCursorItemId = (
  value: string,
): { id: string; source: FeedSource } | null => {
  const separator = value.indexOf(':');
  if (separator <= 0 || separator === value.length - 1) return null;
  const source = value.slice(0, separator);
  if (source !== 'announcement' && source !== 'partner') return null;

  return { id: value.slice(separator + 1), source };
};

const announcementCursorWhere = (
  cursor: FeedCursor | null,
): Prisma.InternalAnnouncementWhereInput => {
  if (!cursor) return {};
  const sameTimestamp: Prisma.InternalAnnouncementWhereInput[] = [];

  if ('announcement' < cursor.source) {
    sameTimestamp.push({ publishedAt: cursor.occurredAt });
  } else if (cursor.source === 'announcement') {
    sameTimestamp.push({
      id: { lt: cursor.id },
      publishedAt: cursor.occurredAt,
    });
  }

  return {
    OR: [{ publishedAt: { lt: cursor.occurredAt } }, ...sameTimestamp],
  };
};

const partnerCursorWhere = (
  cursor: FeedCursor | null,
): Prisma.PartnerTimelineEventWhereInput => {
  if (!cursor) return {};
  const sameTimestamp: Prisma.PartnerTimelineEventWhereInput[] = [];

  if ('partner' < cursor.source) {
    sameTimestamp.push({ occurredAt: cursor.occurredAt });
  } else if (cursor.source === 'partner') {
    sameTimestamp.push({
      id: { lt: cursor.id },
      occurredAt: cursor.occurredAt,
    });
  }

  return {
    OR: [{ occurredAt: { lt: cursor.occurredAt } }, ...sameTimestamp],
  };
};

export const compareInternalNewsItems = (
  left: Pick<InternalNewsItem, 'id' | 'occurredAt'>,
  right: Pick<InternalNewsItem, 'id' | 'occurredAt'>,
): number =>
  right.occurredAt.localeCompare(left.occurredAt) ||
  right.id.localeCompare(left.id);

export const listInternalNews = async (
  input: {
    cursor?: string;
    filter: InternalNewsFilter;
    limit: number;
  },
  access: { canViewPartners: boolean },
): Promise<InternalNewsResponse> => {
  const filterHash = hashCursorFilters({
    canViewPartners: access.canViewPartners,
    filter: input.filter,
  });
  const decodedCursor = input.cursor
    ? decodeKeysetCursor(input.cursor, {
        filterHash,
        resource: INTERNAL_NEWS_RESOURCE,
      })
    : null;
  if (input.cursor && !decodedCursor) throw new RangeError('INVALID_CURSOR');

  const parsedCursorId = decodedCursor
    ? parseCursorItemId(decodedCursor.id)
    : null;
  const cursorDate = decodedCursor ? new Date(decodedCursor.sortValue) : null;
  if (
    decodedCursor &&
    (!parsedCursorId ||
      !cursorDate ||
      Number.isNaN(cursorDate.getTime()) ||
      cursorDate.toISOString() !== decodedCursor.sortValue)
  ) {
    throw new RangeError('INVALID_CURSOR');
  }
  const cursor =
    parsedCursorId && cursorDate
      ? {
          id: parsedCursorId.id,
          occurredAt: cursorDate,
          source: parsedCursorId.source,
        }
      : null;
  const snapshotAt = decodedCursor
    ? new Date(decodedCursor.snapshotAt)
    : new Date();
  const includeAnnouncements = input.filter !== 'partners';
  const includePartners =
    access.canViewPartners && input.filter !== 'announcements';

  const [announcements, partnerEvents, pinnedAnnouncements] = await Promise.all(
    [
      includeAnnouncements
        ? prisma.internalAnnouncement.findMany({
            orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
            take: input.limit + 1,
            where: {
              AND: [announcementCursorWhere(cursor)],
              createdAt: { lte: snapshotAt },
              pinnedAt: null,
            },
          })
        : Promise.resolve([]),
      includePartners
        ? prisma.partnerTimelineEvent.findMany({
            include: {
              organization: { select: { id: true, name: true } },
            },
            orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
            take: input.limit + 1,
            where: {
              AND: [partnerCursorWhere(cursor)],
              createdAt: { lte: snapshotAt },
              type: { in: [...PARTNER_NEWS_EVENT_TYPES] },
            },
          })
        : Promise.resolve([]),
      includeAnnouncements && !cursor
        ? prisma.internalAnnouncement.findMany({
            orderBy: [
              { pinnedAt: 'desc' },
              { publishedAt: 'desc' },
              { id: 'desc' },
            ],
            take: MAX_PINNED_ANNOUNCEMENTS,
            where: {
              createdAt: { lte: snapshotAt },
              pinnedAt: { not: null },
            },
          })
        : Promise.resolve([]),
    ],
  );

  const items: InternalNewsItem[] = [
    ...announcements.map(mapAnnouncement),
    ...(partnerEvents as PartnerNewsEvent[]).map(mapPartnerEvent),
  ].sort(compareInternalNewsItems);
  const page = buildCursorPaginationMeta(
    items,
    input.limit,
    snapshotAt,
    (item) => ({
      filterHash,
      id: item.id,
      resource: INTERNAL_NEWS_RESOURCE,
      snapshotAt: snapshotAt.toISOString(),
      sortValue: item.occurredAt,
    }),
  );

  return {
    items: page.items,
    pagination: page.pagination,
    pinned: pinnedAnnouncements.map(mapAnnouncement),
  };
};

export const publishInternalAnnouncement = async (
  input: PublishInternalAnnouncementInput,
  actor: UserType,
): Promise<InternalAnnouncementItem> =>
  prisma.$transaction(async (transaction) => {
    const now = new Date();
    const announcement = await transaction.internalAnnouncement.create({
      data: {
        ...getActorSnapshot(actor),
        body: input.body,
        pinnedAt: input.isPinned ? now : null,
        publishedAt: now,
        title: input.title,
      },
    });
    await createInternalNewsAudit(transaction, {
      action: AuditAction.INTERNAL_ANNOUNCEMENT_PUBLISH,
      actor,
      description: 'Actualité interne publiée',
      entityId: announcement.id,
      metadata: {
        isPinned: input.isPinned,
        title: input.title,
      },
    });

    return mapAnnouncement(announcement);
  });

export const updateInternalAnnouncementPin = async (
  announcementId: string,
  isPinned: boolean,
  actor: UserType,
): Promise<InternalAnnouncementItem> =>
  prisma.$transaction(async (transaction) => {
    const announcement = await transaction.internalAnnouncement.update({
      data: { pinnedAt: isPinned ? new Date() : null },
      where: { id: announcementId },
    });
    await createInternalNewsAudit(transaction, {
      action: AuditAction.INTERNAL_ANNOUNCEMENT_PIN_UPDATE,
      actor,
      description: isPinned
        ? 'Actualité interne épinglée'
        : 'Actualité interne désépinglée',
      entityId: announcement.id,
      metadata: { isPinned, title: announcement.title },
    });

    return mapAnnouncement(announcement);
  });
