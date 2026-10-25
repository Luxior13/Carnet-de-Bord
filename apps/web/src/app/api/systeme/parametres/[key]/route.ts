import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { PERMISSIONS } from '$constants/permissions.constants';
import {
  isSystemSettingKey,
  parseSystemSettingValue,
} from '$constants/system-settings.constants';
import { updateSystemSettingForActor } from '$features/settings/server/system-setting-update.service';
import { requireAuth, requirePermission } from '$server/api-auth';
import { apiErrors, apiSuccess, parseJsonBody } from '$server/api-response';
import { serviceErrorResponse } from '$server/service-error';
import type { ApiErrorResponse, ApiSuccessResponse } from '$types/api.types';
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

    let value: number;
    try {
      value = parseSystemSettingValue(key, parsed.data.value) as number;
    } catch {
      return apiErrors.validation('Valeur de paramètre invalide');
    }

    return apiSuccess(
      await updateSystemSettingForActor(
        { actor: auth.user, session: auth.session },
        { expectedVersion: parsed.data.expectedVersion, key, value },
      ),
    );
  } catch (error) {
    return serviceErrorResponse(error, {
      action: 'SYSTEM_SETTING_UPDATE',
      request,
    });
  }
}
