import { NextResponse } from 'next/server';

import { PERMISSIONS } from '$constants/permissions.constants';
import {
  type AccountSessionInfo,
  listAccountSessions,
  revokeAccountSessions,
} from '$features/auth/server/account-sessions.service';
import { requireAuth, requirePermission } from '$server/api-auth';
import { apiError, apiSuccess } from '$server/api-response';
import { serviceErrorResponse } from '$server/service-error';
import {
  type ApiErrorResponse,
  type ApiSuccessResponse,
  ErrorCode,
} from '$types/api.types';

const missingCurrentSession = (): NextResponse<ApiErrorResponse> =>
  apiError(ErrorCode.UNAUTHORIZED, 'Session actuelle introuvable', 401);

/** Live sessions of the signed-in account. */
export async function GET(
  request: Request,
): Promise<
  NextResponse<
    ApiSuccessResponse<{ sessions: AccountSessionInfo[] }> | ApiErrorResponse
  >
> {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth.response;
    const permission = requirePermission(
      auth.user,
      PERMISSIONS.ACCOUNT.MANAGE_SESSIONS,
    );
    if (!permission.success) return permission.response;
    if (!auth.session) return missingCurrentSession();

    return apiSuccess({
      sessions: await listAccountSessions(auth.user.id, auth.session),
    });
  } catch (error) {
    return serviceErrorResponse(error, { action: 'SESSIONS', request });
  }
}

/** Revokes one other session (`?id=`) or every other session. */
export async function DELETE(
  request: Request,
): Promise<NextResponse<ApiSuccessResponse<null> | ApiErrorResponse>> {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth.response;
    const permission = requirePermission(
      auth.user,
      PERMISSIONS.ACCOUNT.MANAGE_SESSIONS,
    );
    if (!permission.success) return permission.response;
    if (!auth.session) return missingCurrentSession();

    await revokeAccountSessions(
      auth.user.id,
      auth.session,
      new URL(request.url).searchParams.get('id'),
    );

    return apiSuccess(null);
  } catch (error) {
    return serviceErrorResponse(error, { action: 'SESSIONS', request });
  }
}
