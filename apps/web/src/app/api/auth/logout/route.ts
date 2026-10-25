import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { SESSION_COOKIE_NAME } from '$constants/security.constants';
import { requireAuth } from '$server/api-auth';
import { apiErrors } from '$server/api-response';
import { createAuditLogWithHeaders } from '$server/audit-log';
import { deleteSessionCookie, invalidateSession } from '$server/session';
import {
  type ApiErrorResponse,
  type ApiSuccessResponse,
} from '$types/api.types';

const AUTH_CONNECTION_AUDIT_LOCATION = {
  pageKey: 'authentication',
  pageLabel: 'Authentification',
  poleKey: 'system',
  poleLabel: 'Système',
  tabKey: 'connections',
  tabLabel: 'Connexions',
} as const;

export async function POST(): Promise<
  NextResponse<ApiSuccessResponse<{ message: string }> | ApiErrorResponse>
> {
  try {
    const auth = await requireAuth({
      allowPasswordChangeRequired: true,
    });
    if (!auth.success) return auth.response;

    // Get session token from cookie to invalidate
    const ck = await cookies();
    const sessionToken = ck.get(SESSION_COOKIE_NAME)?.value;

    if (sessionToken) {
      await invalidateSession(sessionToken);
    }

    await createAuditLogWithHeaders({
      action: 'LOGOUT',
      category: 'AUTH',
      description: `Déconnexion: ${auth.user.loginName}`,
      metadata: AUTH_CONNECTION_AUDIT_LOCATION,
      targetUserId: auth.user.id,
      userId: auth.user.id,
    });

    await deleteSessionCookie();

    return NextResponse.json({
      data: { message: 'Déconnexion réussie' },
      success: true,
    });
  } catch (error) {
    // Still try to delete cookie even if there's an error
    await deleteSessionCookie();

    return apiErrors.internal('LOGOUT', error);
  }
}
