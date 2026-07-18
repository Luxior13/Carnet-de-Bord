import type { Prisma } from '@prisma/client';
import { AuditAction, AuditCategory } from '@repo/database';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { FEATURES } from '$constants/feature-registry.constants';
import { PERMISSIONS } from '$constants/permissions.constants';
import { requiresPasswordForSystemSettingChange } from '$constants/system-setting-catalog.constants';
import {
  isSystemSettingKey,
  parseSystemSettingValue,
  SYSTEM_SETTING_DEFINITIONS,
} from '$constants/system-settings.constants';
import { requireAuth, requirePermission } from '$server/api-auth';
import {
  apiErrors,
  isPrismaUniqueConstraintError,
  parseJsonBody,
} from '$server/api-response';
import { createAuditLogWithHeaders } from '$server/auth';
import { prisma } from '$server/prisma';
import { requireRecentPasswordReauthentication } from '$server/sensitive-action';
import {
  createSystemSetting,
  invalidateSystemSettingCache,
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
    const previous = await prisma.systemSetting.findUnique({
      select: { updatedAt: true, value: true, version: true },
      where: { key },
    });
    if (
      (previous && previous.version !== parsed.data.expectedVersion) ||
      (!previous && parsed.data.expectedVersion !== 0)
    ) {
      throw new SystemSettingConflictError();
    }
    const parsedPreviousValue = previous
      ? definition.schema.safeParse(previous.value)
      : null;
    const currentValue =
      parsedPreviousValue?.success === true
        ? parsedPreviousValue.data
        : definition.defaultValue;
    const numericValue = value as number;
    if (
      (!previous && numericValue === definition.defaultValue) ||
      (previous &&
        parsedPreviousValue?.success === true &&
        numericValue === currentValue)
    ) {
      return NextResponse.json({
        data: {
          description: definition.description,
          key,
          updatedAt:
            previous?.updatedAt.toISOString() ?? new Date(0).toISOString(),
          value: currentValue,
          version: previous?.version ?? 0,
        },
        success: true,
      });
    }
    if (
      requiresPasswordForSystemSettingChange(key, currentValue, numericValue)
    ) {
      const proof = requireRecentPasswordReauthentication(auth.session);
      if (!proof.success) return proof.response;
    }
    const setting = await prisma.$transaction(async (transaction) => {
      let updated: Awaited<ReturnType<typeof createSystemSetting>>;
      if (parsed.data.expectedVersion === 0) {
        try {
          updated = await createSystemSetting(
            {
              description: definition.description,
              key,
              updatedById: auth.user.id,
              value: numericValue as Prisma.InputJsonValue,
            },
            transaction,
          );
        } catch (error) {
          // SystemSetting has a single unique constraint: its key. A
          // concurrent first write is therefore a version conflict.
          if (isPrismaUniqueConstraintError(error)) {
            throw new SystemSettingConflictError();
          }
          throw error;
        }
      } else {
        updated = await updateSystemSetting(
          {
            description: definition.description,
            expectedVersion: parsed.data.expectedVersion,
            key,
            updatedById: auth.user.id,
            value: numericValue as Prisma.InputJsonValue,
          },
          transaction,
        );
      }
      await createAuditLogWithHeaders(
        {
          action: AuditAction.SYSTEM_SETTING_UPDATE,
          category: AuditCategory.SYSTEM,
          description: `Paramètre système mis à jour : ${definition.label}`,
          metadata: {
            after: { value: updated.value, version: updated.version },
            before: previous
              ? { value: previous.value, version: previous.version }
              : null,
            changes: ['value', 'version'],
            ...FEATURES.systemSettings.audit,
            settingKey: key,
          },
          targetUserId: null,
          userId: auth.user.id,
        },
        { client: transaction, required: true },
      );

      return updated;
    });
    invalidateSystemSettingCache(key);

    return NextResponse.json({
      data: {
        ...setting,
        key,
        updatedAt: setting.updatedAt.toISOString(),
      },
      success: true,
    });
  } catch (error) {
    if (error instanceof SystemSettingConflictError) {
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
