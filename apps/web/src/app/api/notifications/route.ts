import type { Prisma } from '@prisma/client';
import { AuditAction, AuditCategory } from '@repo/database';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { PERMISSIONS } from '$constants/permissions.constants';
import { PROTECTED_USER_PUBLIC_DISPLAY_NAME } from '$constants/protected-user.constants';
import { requireAuth, requirePermission } from '$server/api-auth';
import { apiErrors, parseJsonBody } from '$server/api-response';
import { createAuditLogWithHeaders } from '$server/auth';
import {
  buildCursorPaginationMeta,
  decodeKeysetCursor,
  hashCursorFilters,
  parseCursorPageSize,
} from '$server/cursor-pagination';
import {
  buildHumanNotificationDedupeKey,
  createNotification,
  isValidNotificationDedupeComponent,
  NotificationDedupeConflictError,
} from '$server/notifications';
import { prisma } from '$server/prisma';
import { requireRecentSensitiveActionProof } from '$server/sensitive-action';
import { getSystemSettingValue } from '$server/system-settings';
import {
  type ApiErrorResponse,
  type ApiSuccessResponse,
  ErrorCode,
} from '$types/api.types';
import type {
  NotificationItem,
  NotificationListData,
} from '$types/platform.types';
import { isKnownInternalPageHref } from '$utils/internal-href.utils';

const NOTIFICATION_RESOURCE = 'notifications';
const NOTIFICATION_MAX_LIMIT = 50;
const notificationListStatusSchema = z.enum(['all', 'archived', 'unread']);

const notificationBulkActionSchema = z
  .object({ action: z.literal('read_all') })
  .strict();

const sendNotificationSchema = z
  .object({
    body: z.string().trim().min(1).max(2_000),
    dedupeKey: z.string().refine(isValidNotificationDedupeComponent).optional(),
    expiresAt: z.string().datetime({ offset: true }).optional(),
    href: z.string().max(500).refine(isKnownInternalPageHref).optional(),
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
    const requestedStatus =
      searchParams.get('status') ??
      (searchParams.get('unread') === 'true' ? 'unread' : 'all');
    const parsedStatus =
      notificationListStatusSchema.safeParse(requestedStatus);
    if (!parsedStatus.success) {
      return apiErrors.validation('Filtre de notifications invalide');
    }
    const status = parsedStatus.data;
    const configuredDefaultLimit =
      await getSystemSettingValue('ui.defaultPageSize');
    const defaultLimit = Math.max(
      1,
      Math.min(configuredDefaultLimit, NOTIFICATION_MAX_LIMIT),
    );
    const limit = parseCursorPageSize(
      searchParams,
      defaultLimit,
      NOTIFICATION_MAX_LIMIT,
    );
    const filterHash = hashCursorFilters({ status });
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
      archivedAt: status === 'archived' ? { not: null } : null,
      createdAt: { lte: snapshotAt },
      notification: {
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      ...(status === 'unread' ? { readAt: null } : {}),
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
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
          readAt: null,
          userId: auth.user.id,
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

    return NextResponse.json({
      data: { items: page.items, pagination: page.pagination, unreadCount },
      success: true,
    });
  } catch (error) {
    return apiErrors.internal('NOTIFICATIONS_LIST', error, request);
  }
}

export async function PATCH(
  request: NextRequest,
): Promise<
  NextResponse<ApiSuccessResponse<{ updatedCount: number }> | ApiErrorResponse>
> {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth.response;
    const permission = requirePermission(
      auth.user,
      PERMISSIONS.NOTIFICATIONS.VIEW,
    );
    if (!permission.success) return permission.response;
    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.success) return parsedBody.response;
    const parsed = notificationBulkActionSchema.safeParse(parsedBody.data);
    if (!parsed.success) return apiErrors.validation('Action invalide');

    const result = await prisma.notificationRecipient.updateMany({
      data: { readAt: new Date() },
      where: {
        archivedAt: null,
        notification: {
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        readAt: null,
        userId: auth.user.id,
      },
    });

    return NextResponse.json({
      data: { updatedCount: result.count },
      success: true,
    });
  } catch (error) {
    return apiErrors.internal('NOTIFICATIONS_READ_ALL', error, request);
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
          dedupeKey: parsed.data.dedupeKey
            ? buildHumanNotificationDedupeKey(
                auth.user.id,
                parsed.data.dedupeKey,
              )
            : undefined,
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
      error instanceof NotificationDedupeConflictError ||
      (typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002')
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
