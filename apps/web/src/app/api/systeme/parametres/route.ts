import { NextRequest, NextResponse } from 'next/server';

import { PERMISSIONS } from '$constants/permissions.constants';
import { SYSTEM_SETTING_DEFINITIONS } from '$constants/system-settings.constants';
import { requireAuth, requirePermission } from '$server/api-auth';
import { apiErrors } from '$server/api-response';
import { prisma } from '$server/prisma';
import type { ApiErrorResponse, ApiSuccessResponse } from '$types/api.types';
import type { SystemSettingItem } from '$types/platform.types';

export async function GET(
  request: NextRequest,
): Promise<
  NextResponse<ApiSuccessResponse<SystemSettingItem[]> | ApiErrorResponse>
> {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth.response;
    const permission = requirePermission(auth.user, PERMISSIONS.SETTINGS.VIEW);
    if (!permission.success) return permission.response;

    const storedSettings = await prisma.systemSetting.findMany({
      select: {
        description: true,
        key: true,
        updatedAt: true,
        value: true,
        version: true,
      },
    });
    const storedByKey = new Map(
      storedSettings.map((setting) => [setting.key, setting]),
    );
    const settings = Object.entries(SYSTEM_SETTING_DEFINITIONS).map(
      ([key, definition]) => {
        const stored = storedByKey.get(key);
        const storedValue = stored
          ? definition.schema.safeParse(stored.value)
          : null;

        return {
          description: stored?.description ?? definition.description,
          key,
          updatedAt:
            stored?.updatedAt.toISOString() ?? new Date(0).toISOString(),
          value:
            storedValue?.success === true
              ? storedValue.data
              : definition.defaultValue,
          version: stored?.version ?? 0,
        } satisfies SystemSettingItem;
      },
    );

    return NextResponse.json({ data: settings, success: true });
  } catch (error) {
    return apiErrors.internal('SYSTEM_SETTINGS_LIST', error, request);
  }
}
