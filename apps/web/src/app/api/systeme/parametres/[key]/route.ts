import type { Prisma } from '@prisma/client';
import { AuditAction, AuditCategory } from '@repo/database';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { PERMISSIONS } from '$constants/permissions.constants';
import {
  isSystemSettingKey,
  parseSystemSettingValue,
  SYSTEM_SETTING_DEFINITIONS,
} from '$constants/system-settings.constants';
import { requireAuth, requirePermission } from '$server/api-auth';
import { apiErrors, parseJsonBody } from '$server/api-response';
import { createAuditLogWithHeaders } from '$server/auth';
import { prisma } from '$server/prisma';
import { requireRecentSensitiveActionProof } from '$server/sensitive-action';
import {
  createSystemSetting,
  SystemSettingConflictError,
  updateSystemSetting,
} from '$server/system-settings';
import {
  type ApiErrorResponse,
  type ApiSuccessResponse,
  ErrorCode,
} from '$types/api.types';
import type { SystemSettingItem } from '$types/platform.types';

type RouteParams = { params: Promise<{ key: string }> };

const updateSettingSchema = z
  .object({
    expectedVersion: z.number().int().min(0),
    value: z.unknown(),
  })
  .strict();

export async function PUT(
  request: NextRequest,
  { params }: RouteParams,
): Promise<
  NextResponse<ApiSuccessResponse<SystemSettingItem> | ApiErrorResponse>
> {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth.response;
    const permission = requirePermission(
      auth.user,
      PERMISSIONS.SETTINGS.UPDATE,
    );
    if (!permission.success) return permission.response;
    const proof = requireRecentSensitiveActionProof(auth.session);
    if (!proof.success) return proof.response;
    const { key } = await params;
    if (!isSystemSettingKey(key)) {
      return apiErrors.notFound('Paramètre inconnu');
    }
    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.success) return parsedBody.response;
    const parsed = updateSettingSchema.safeParse(parsedBody.data);
    if (!parsed.success) return apiErrors.validation('Paramètre invalide');

    let value: unknown;
    try {
      value = parseSystemSettingValue(key, parsed.data.value);
    } catch {
      return apiErrors.validation('Valeur de paramètre invalide');
    }
    // The key was narrowed by isSystemSettingKey above.
    // eslint-disable-next-line security/detect-object-injection
    const definition = SYSTEM_SETTING_DEFINITIONS[key];
    const setting = await prisma.$transaction(async (transaction) => {
      const previous = await transaction.systemSetting.findUnique({
        select: { value: true, version: true },
        where: { key },
      });
      const updated =
        parsed.data.expectedVersion === 0
          ? await createSystemSetting(
              {
                description: definition.description,
                key,
                updatedById: auth.user.id,
                value: value as Prisma.InputJsonValue,
              },
              transaction,
            )
          : await updateSystemSetting(
              {
                description: definition.description,
                expectedVersion: parsed.data.expectedVersion,
                key,
                updatedById: auth.user.id,
                value: value as Prisma.InputJsonValue,
              },
              transaction,
            );
      await createAuditLogWithHeaders(
        {
          action: AuditAction.SYSTEM_SETTING_UPDATE,
          category: AuditCategory.SYSTEM,
          description: `Paramètre système mis à jour : ${key}`,
          metadata: {
            after: { value: updated.value, version: updated.version },
            before: previous
              ? { value: previous.value, version: previous.version }
              : null,
            changes: ['value', 'version'],
            pageKey: 'system-settings',
            pageLabel: 'Paramètres',
            poleKey: 'system',
            poleLabel: 'Système',
            settingKey: key,
          },
          targetUserId: null,
          userId: auth.user.id,
        },
        { client: transaction, required: true },
      );

      return updated;
    });

    return NextResponse.json({
      data: {
        ...setting,
        updatedAt: setting.updatedAt.toISOString(),
      },
      success: true,
    });
  } catch (error) {
    if (
      error instanceof SystemSettingConflictError ||
      (typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002')
    ) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.CONFLICT,
            message: 'Ce paramètre a été modifié. Rechargez la page.',
          },
          success: false,
        },
        { status: 409 },
      );
    }

    return apiErrors.internal('SYSTEM_SETTING_UPDATE', error, request);
  }
}
