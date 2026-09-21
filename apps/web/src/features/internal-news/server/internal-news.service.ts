import 'server-only';

import type { InternalAnnouncement, Prisma } from '@prisma/client';
import { AuditAction } from '@repo/database';

import {
  buildCursorPaginationMeta,
  decodeKeysetCursor,
  hashCursorFilters,
} from '$server/cursor-pagination';
import { prisma } from '$server/prisma';
import type { UserType } from '$types/auth.types';

import type {
  InternalAnnouncementItem,
  InternalNewsItem,
  InternalNewsResponse,
  PublishInternalAnnouncementInput,
} from '../internal-news.types';
import { createInternalNewsAudit } from './internal-news-audit';

const INTERNAL_NEWS_RESOURCE = 'internal-news';
const MAX_PINNED_ANNOUNCEMENTS = 5;
const ANNOUNCEMENT_ID_PREFIX = 'announcement:';

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
  id: `${ANNOUNCEMENT_ID_PREFIX}${announcement.id}`,
  isPinned: announcement.pinnedAt !== null,
  kind: 'ANNOUNCEMENT',
  occurredAt: announcement.publishedAt.toISOString(),
  title: announcement.title,
});

/**
 * Cursors are opaque signed values. The stored identifier keeps its
 * announcement prefix so a cursor issued before the feed was reduced to
 * announcements only still resolves to the same row.
 */
const parseCursorAnnouncementId = (value: string): string | null => {
  const id = value.startsWith(ANNOUNCEMENT_ID_PREFIX)
    ? value.slice(ANNOUNCEMENT_ID_PREFIX.length)
    : value;

  return id.length > 0 ? id : null;
};

const announcementCursorWhere = (cursor: {
  id: string;
  publishedAt: Date;
}): Prisma.InternalAnnouncementWhereInput => ({
  OR: [
    { publishedAt: { lt: cursor.publishedAt } },
    { id: { lt: cursor.id }, publishedAt: cursor.publishedAt },
  ],
});

export const compareInternalNewsItems = (
  left: Pick<InternalNewsItem, 'id' | 'occurredAt'>,
  right: Pick<InternalNewsItem, 'id' | 'occurredAt'>,
): number =>
  right.occurredAt.localeCompare(left.occurredAt) ||
  right.id.localeCompare(left.id);

export const listInternalNews = async (input: {
  cursor?: string;
  limit: number;
}): Promise<InternalNewsResponse> => {
  const filterHash = hashCursorFilters({
    resource: INTERNAL_NEWS_RESOURCE,
  });
  const decodedCursor = input.cursor
    ? decodeKeysetCursor(input.cursor, {
        filterHash,
        resource: INTERNAL_NEWS_RESOURCE,
      })
    : null;
  if (input.cursor && !decodedCursor) throw new RangeError('INVALID_CURSOR');

  const cursorId =
    decodedCursor === null ? null : parseCursorAnnouncementId(decodedCursor.id);
  const cursorDate = decodedCursor ? new Date(decodedCursor.sortValue) : null;
  if (
    decodedCursor &&
    (!cursorId ||
      !cursorDate ||
      Number.isNaN(cursorDate.getTime()) ||
      cursorDate.toISOString() !== decodedCursor.sortValue)
  ) {
    throw new RangeError('INVALID_CURSOR');
  }
  const cursor =
    cursorId && cursorDate ? { id: cursorId, publishedAt: cursorDate } : null;
  const snapshotAt = decodedCursor
    ? new Date(decodedCursor.snapshotAt)
    : new Date();

  const [announcements, pinnedAnnouncements] = await Promise.all([
    prisma.internalAnnouncement.findMany({
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      take: input.limit + 1,
      where: {
        ...(cursor ? { AND: [announcementCursorWhere(cursor)] } : {}),
        createdAt: { lte: snapshotAt },
        pinnedAt: null,
      },
    }),
    cursor
      ? Promise.resolve([])
      : prisma.internalAnnouncement.findMany({
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
        }),
  ]);
  const items: InternalNewsItem[] = announcements
    .map(mapAnnouncement)
    .sort(compareInternalNewsItems);
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
