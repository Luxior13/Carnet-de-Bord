import { NextRequest, NextResponse } from 'next/server';

import { PERMISSIONS } from '$constants/permissions.constants';
import {
  listManagedSessions,
  revokeManagedSessions,
} from '$features/users/server/user-sessions.service';
import { requireAuth, requirePermission } from '$server/api-auth';
import { apiSuccess } from '$server/api-response';
import { serviceErrorResponse } from '$server/service-error';
import type { ApiErrorResponse, ApiSuccessResponse } from '$types/api.types';
import type { UserSessionInfo } from '$types/auth.types';

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(
  request: NextRequest,
  { params }: RouteParams,
): Promise<
  NextResponse<
    ApiSuccessResponse<{ sessions: UserSessionInfo[] }> | ApiErrorResponse
  >
> {
  try {
    const { id } = await params;
    const auth = await requireAuth();
    if (!auth.success) return auth.response;
    const permCheck = requirePermission(
      auth.user,
      PERMISSIONS.USERS.VIEW_SESSIONS,
    );
    if (!permCheck.success) return permCheck.response;

    const sessions = await listManagedSessions(
      { actor: auth.user, session: auth.session },
      id,
    );

    return apiSuccess({ sessions });
  } catch (error) {
    return serviceErrorResponse(error, {
      action: 'USER_SESSIONS_GET',
      request,
    });
  }
}

/** DELETE ?id=<session> revokes one session, without it all of them. */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams,
): Promise<
  NextResponse<
    ApiSuccessResponse<{ revokedSessions: number }> | ApiErrorResponse
  >
> {
  try {
    const { id } = await params;
    const auth = await requireAuth();
    if (!auth.success) return auth.response;
    const permCheck = requirePermission(
      auth.user,
      PERMISSIONS.USERS.REVOKE_SESSIONS,
    );
    if (!permCheck.success) return permCheck.response;

    const revokedSessions = await revokeManagedSessions(
      { actor: auth.user, session: auth.session },
      id,
      request.nextUrl.searchParams.get('id')?.trim() || null,
    );

    return apiSuccess({ revokedSessions });
  } catch (error) {
    return serviceErrorResponse(error, {
      action: 'USER_SESSIONS_DELETE',
      request,
    });
  }
}
