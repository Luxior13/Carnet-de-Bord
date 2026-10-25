import { NextRequest, NextResponse } from 'next/server';

import { PERMISSIONS } from '$constants/permissions.constants';
import {
  getMfaStatus,
  type MfaStatus,
} from '$features/auth/server/mfa-account.service';
import { requireAuth, requirePermission } from '$server/api-auth';
import { apiSuccess } from '$server/api-response';
import { serviceErrorResponse } from '$server/service-error';
import type { ApiErrorResponse, ApiSuccessResponse } from '$types/api.types';

/**
 * MFA state of the signed-in account. MFA is mandatory and cannot be turned
 * off; recovery goes through the protected administrative reset.
 */
export async function GET(
  request: NextRequest,
): Promise<NextResponse<ApiSuccessResponse<MfaStatus> | ApiErrorResponse>> {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth.response;
    const permission = requirePermission(
      auth.user,
      PERMISSIONS.ACCOUNT.MANAGE_MFA,
    );
    if (!permission.success) return permission.response;

    return apiSuccess(await getMfaStatus(auth.user));
  } catch (error) {
    return serviceErrorResponse(error, { action: 'MFA_STATUS', request });
  }
}
