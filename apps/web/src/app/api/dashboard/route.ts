import { NextResponse } from 'next/server';

import { PERMISSIONS } from '$constants/permissions.constants';
import { loadDashboardStats } from '$features/dashboard/server/dashboard.service';
import { requireAuth, requirePermission } from '$server/api-auth';
import { apiErrors } from '$server/api-response';
import type { ApiErrorResponse, ApiSuccessResponse } from '$types/api.types';
import type { DashboardStats } from '$types/dashboard.types';

export async function GET(): Promise<
  NextResponse<ApiSuccessResponse<DashboardStats> | ApiErrorResponse>
> {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth.response;

    const permission = requirePermission(auth.user, PERMISSIONS.DASHBOARD.VIEW);
    if (!permission.success) return permission.response;

    return NextResponse.json({
      data: await loadDashboardStats(auth.user),
      success: true,
    });
  } catch (error) {
    return apiErrors.internal('DASHBOARD_STATS', error);
  }
}
