import { NextRequest, NextResponse } from 'next/server';

import { PERMISSIONS } from '$constants/permissions.constants';
import { resetPasswordForActor } from '$features/users/server/user-password-reset.service';
import { requireAuth, requirePermission } from '$server/api-auth';
import { apiSuccess } from '$server/api-response';
import { serviceErrorResponse } from '$server/service-error';
import type { ApiErrorResponse, ApiSuccessResponse } from '$types/api.types';

type RouteParams = {
  params: Promise<{ id: string }>;
};

/** POST /api/users/[id]/reset-password: issues a temporary password. */
export async function POST(
  request: NextRequest,
  { params }: RouteParams,
): Promise<
  NextResponse<
    ApiSuccessResponse<{ temporaryPassword: string }> | ApiErrorResponse
  >
> {
  try {
    const { id } = await params;
    const auth = await requireAuth();
    if (!auth.success) return auth.response;
    const permCheck = requirePermission(
      auth.user,
      PERMISSIONS.USERS.RESET_PASSWORD,
    );
    if (!permCheck.success) return permCheck.response;

    const temporaryPassword = await resetPasswordForActor(
      { actor: auth.user, session: auth.session },
      id,
    );

    return apiSuccess({ temporaryPassword });
  } catch (error) {
    return serviceErrorResponse(error, { action: 'PASSWORD_RESET', request });
  }
}
