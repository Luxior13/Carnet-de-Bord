import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { PERMISSIONS } from '$constants/permissions.constants';
import { requireAuth, requirePermission } from '$server/api-auth';
import { apiErrors, parseJsonBody } from '$server/api-response';
import { prisma } from '$server/prisma';
import type { ApiErrorResponse, ApiSuccessResponse } from '$types/api.types';

type RouteParams = { params: Promise<{ id: string }> };

const notificationActionSchema = z
  .object({ action: z.enum(['archive', 'read', 'unread']) })
  .strict();

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams,
): Promise<
  NextResponse<ApiSuccessResponse<{ updated: true }> | ApiErrorResponse>
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
    const parsed = notificationActionSchema.safeParse(parsedBody.data);
    if (!parsed.success) return apiErrors.validation('Action invalide');
    const { id } = await params;
    const now = new Date();
    const result = await prisma.notificationRecipient.updateMany({
      data:
        parsed.data.action === 'archive'
          ? { archivedAt: now, readAt: now }
          : { readAt: parsed.data.action === 'read' ? now : null },
      where: { notificationId: id, userId: auth.user.id },
    });
    if (result.count !== 1) {
      return apiErrors.notFound('Notification introuvable');
    }

    return NextResponse.json({ data: { updated: true }, success: true });
  } catch (error) {
    return apiErrors.internal('NOTIFICATION_UPDATE', error, request);
  }
}
