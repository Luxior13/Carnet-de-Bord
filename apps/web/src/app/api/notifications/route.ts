import type { Prisma } from '@prisma/client';
import { AuditAction, AuditCategory } from '@repo/database';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { PERMISSIONS } from '$constants/permissions.constants';
import { requireAuth, requirePermission } from '$server/api-auth';
import { apiErrors, parseJsonBody } from '$server/api-response';
import { createAuditLogWithHeaders } from '$server/auth';
import {
  buildCursorPaginationMeta,
  decodeKeysetCursor,
  hashCursorFilters,
  parseCursorPageSize,
} from '$server/cursor-pagination';
import { createNotification } from '$server/notifications';
import { prisma } from '$server/prisma';
import { requireRecentSensitiveActionProof } from '$server/sensitive-action';
import {
  type ApiErrorResponse,
  type ApiSuccessResponse,
  ErrorCode,
} from '$types/api.types';
import type {
  NotificationItem,
  NotificationListData,
} from '$types/platform.types';

const NOTIFICATION_RESOURCE = 'notifications';
const NOTIFICATION_MAX_LIMIT = 50;

const sendNotificationSchema = z
  .object({
    body: z.string().trim().min(1).max(2_000),
    dedupeKey: z.string().trim().min(1).max(160).optional(),
    expiresAt: z.string().datetime({ offset: true }).optional(),
    href: z
      .string()
      .trim()
      .regex(/^\/(?!\/)/)
      .max(500)
      .optional(),
    recipientUserIds: z.array(z.string().trim().min(1)).min(1).max(1_000),
    severity: z
      .enum(['INFO', 'SUCCESS', 'WARNING', 'CRITICAL'])
      .default('INFO'),
    title: z.string().trim().min(1).max(160),
    type: z
      .string()
      .trim()
      .regex(/^[a-z][a-z0-9._-]{1,79}$/),
  })
  .strict();

export async function GET(
  request: NextRequest,
): Promise<
  NextResponse<ApiSuccessResponse<NotificationListData> | ApiErrorResponse>
> {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth.response;

    const permission = requirePermission(
      auth.user,
      PERMISSIONS.NOTIFICATIONS.VIEW,
    );
    if (!permission.success) return permission.response;

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread') === 'true';
    const limit = parseCursorPageSize(searchParams, 20, NOTIFICATION_MAX_LIMIT);
    const filterHash = hashCursorFilters({ unreadOnly });
    const rawCursor = searchParams.get('cursor');
    const cursor = rawCursor
      ? decodeKeysetCursor(rawCursor, {
          filterHash,
          resource: NOTIFICATION_RESOURCE,
        })
      : null;
    if (rawCursor && !cursor) {
      return apiErrors.validation('Curseur de pagination invalide');
    }

    const snapshotAt = cursor ? new Date(cursor.snapshotAt) : new Date();
    const cursorCreatedAt = cursor ? new Date(cursor.sortValue) : null;
    const cursorId = cursor?.id ?? null;
    if (cursor && Number.isNaN(cursorCreatedAt?.getTime())) {
      return apiErrors.validation('Curseur de pagination invalide');
    }

    const where: Prisma.NotificationRecipientWhereInput = {
      archivedAt: null,
      createdAt: { lte: snapshotAt },
      notification: {
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      ...(unreadOnly ? { readAt: null } : {}),
      userId: auth.user.id,
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
          createdAt: true,
          notification: {
            select: {
              body: true,
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
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
          readAt: null,
          userId: auth.user.id,
        },
      }),
    ]);
    const mappedItems: NotificationItem[] = recipients.map((recipient) => ({
      body: recipient.notification.body,
      createdAt: recipient.createdAt.toISOString(),
      href: recipient.notification.href,
      id: recipient.notification.id,
      readAt: recipient.readAt?.toISOString() ?? null,
      severity: recipient.notification.severity,
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

    return NextResponse.json({
      data: { items: page.items, pagination: page.pagination, unreadCount },
      success: true,
    });
  } catch (error) {
    return apiErrors.internal('NOTIFICATIONS_LIST', error, request);
  }
}

export async function POST(
  request: NextRequest,
): Promise<
  NextResponse<
    | ApiSuccessResponse<{ id: string; recipientCount: number }>
    | ApiErrorResponse
  >
> {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth.response;
    const permission = requirePermission(
      auth.user,
      PERMISSIONS.NOTIFICATIONS.SEND,
    );
    if (!permission.success) return permission.response;
    const proof = requireRecentSensitiveActionProof(auth.session);
    if (!proof.success) return proof.response;

    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.success) return parsedBody.response;
    const parsed = sendNotificationSchema.safeParse(parsedBody.data);
    if (!parsed.success) {
      return apiErrors.validation('Notification invalide');
    }

    const recipientUserIds = [...new Set(parsed.data.recipientUserIds)];
    const recipientCount = await prisma.user.count({
      where: {
        deletedAt: null,
        id: { in: recipientUserIds },
        isActive: true,
      },
    });
    if (recipientCount !== recipientUserIds.length) {
      return apiErrors.validation(
        'Un ou plusieurs destinataires sont invalides',
      );
    }

    const result = await prisma.$transaction(async (transaction) => {
      const notification = await createNotification(
        {
          ...parsed.data,
          createdById: auth.user.id,
          expiresAt: parsed.data.expiresAt
            ? new Date(parsed.data.expiresAt)
            : null,
          recipientUserIds,
        },
        transaction,
      );
      await createAuditLogWithHeaders(
        {
          action: AuditAction.NOTIFICATION_SEND,
          category: AuditCategory.SYSTEM,
          description: 'Notification interne envoyée',
          metadata: {
            notificationId: notification.id,
            recipientCount: notification.recipientCount,
            type: parsed.data.type,
          },
          targetUserId: null,
          userId: auth.user.id,
        },
        { client: transaction, required: true },
      );

      return notification;
    });

    return NextResponse.json({ data: result, success: true }, { status: 201 });
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.CONFLICT,
            message: 'Cette notification a déjà été envoyée',
          },
          success: false,
        },
        { status: 409 },
      );
    }

    return apiErrors.internal('NOTIFICATION_SEND', error, request);
  }
}
