import 'server-only';

import type { Prisma } from '@prisma/client';
import { z } from 'zod';

import { PROTECTED_USER_PUBLIC_DISPLAY_NAME } from '$constants/protected-user.constants';
import {
  buildCursorPaginationMeta,
  decodeKeysetCursor,
  hashCursorFilters,
} from '$server/cursor-pagination';
import { prisma } from '$server/prisma';
import { getSystemSettingValue } from '$server/system-settings';
import type {
  NotificationItem,
  NotificationListData,
} from '$types/platform.types';
import { isKnownInternalPageHref } from '$utils/internal-href.utils';

const NOTIFICATION_RESOURCE = 'notifications';
export const NOTIFICATION_MAX_LIMIT = 50;
export const notificationListStatusSchema = z.enum([
  'all',
  'archived',
  'unread',
]);

export type NotificationListStatus = z.infer<
  typeof notificationListStatusSchema
>;

export const getDefaultNotificationListLimit = async (): Promise<number> => {
  const configured = await getSystemSettingValue('ui.defaultPageSize');

  return Math.max(1, Math.min(configured, NOTIFICATION_MAX_LIMIT));
};

export const listNotifications = async (input: {
  cursor?: string;
  limit: number;
  status: NotificationListStatus;
  userId: string;
}): Promise<NotificationListData> => {
  const limit = Math.max(1, Math.min(input.limit, NOTIFICATION_MAX_LIMIT));
  const filterHash = hashCursorFilters({ status: input.status });
  const cursor = input.cursor
    ? decodeKeysetCursor(input.cursor, {
        filterHash,
        resource: NOTIFICATION_RESOURCE,
      })
    : null;
  if (input.cursor && !cursor) throw new RangeError('INVALID_CURSOR');

  const snapshotAt = cursor ? new Date(cursor.snapshotAt) : new Date();
  const cursorCreatedAt = cursor ? new Date(cursor.sortValue) : null;
  const cursorId = cursor?.id ?? null;
  if (cursor && Number.isNaN(cursorCreatedAt?.getTime())) {
    throw new RangeError('INVALID_CURSOR');
  }

  const now = new Date();
  const where: Prisma.NotificationRecipientWhereInput = {
    archivedAt: input.status === 'archived' ? { not: null } : null,
    createdAt: { lte: snapshotAt },
    notification: {
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    ...(input.status === 'unread' ? { readAt: null } : {}),
    userId: input.userId,
    ...(cursorCreatedAt && cursorId
      ? {
          OR: [
            { createdAt: { lt: cursorCreatedAt } },
            {
              createdAt: cursorCreatedAt,
              notificationId: { lt: cursorId },
            },
          ],
        }
      : {}),
  };

  const [recipients, unreadCount] = await Promise.all([
    prisma.notificationRecipient.findMany({
      orderBy: [{ createdAt: 'desc' }, { notificationId: 'desc' }],
      select: {
        archivedAt: true,
        createdAt: true,
        notification: {
          select: {
            body: true,
            createdBy: {
              select: {
                firstName: true,
                isProtected: true,
                lastName: true,
                loginName: true,
              },
            },
            href: true,
            id: true,
            severity: true,
            title: true,
            type: true,
          },
        },
        notificationId: true,
        readAt: true,
      },
      take: limit + 1,
      where,
    }),
    prisma.notificationRecipient.count({
      where: {
        archivedAt: null,
        notification: {
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        readAt: null,
        userId: input.userId,
      },
    }),
  ]);
  const mappedItems: NotificationItem[] = recipients.map((recipient) => ({
    archivedAt: recipient.archivedAt?.toISOString() ?? null,
    body: recipient.notification.body,
    createdAt: recipient.createdAt.toISOString(),
    href:
      recipient.notification.href &&
      isKnownInternalPageHref(recipient.notification.href)
        ? recipient.notification.href
        : null,
    id: recipient.notification.id,
    readAt: recipient.readAt?.toISOString() ?? null,
    severity: recipient.notification.severity,
    source: recipient.notification.createdBy
      ? {
          kind: 'USER',
          label: recipient.notification.createdBy.isProtected
            ? PROTECTED_USER_PUBLIC_DISPLAY_NAME
            : `${recipient.notification.createdBy.firstName} ${recipient.notification.createdBy.lastName}`.trim() ||
              recipient.notification.createdBy.loginName,
        }
      : { kind: 'SYSTEM', label: 'Système' },
    title: recipient.notification.title,
    type: recipient.notification.type,
  }));
  const page = buildCursorPaginationMeta(
    mappedItems,
    limit,
    snapshotAt,
    (item) => ({
      filterHash,
      id: item.id,
      resource: NOTIFICATION_RESOURCE,
      snapshotAt: snapshotAt.toISOString(),
      sortValue: item.createdAt,
    }),
  );

  return { items: page.items, pagination: page.pagination, unreadCount };
};
