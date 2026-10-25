import { NextResponse } from 'next/server';

import {
  hasPermission,
  isKnownPermissionKey,
} from '$constants/permissions.constants';
import { type ApiErrorResponse, ErrorCode } from '$types/api.types';
import type { SessionType, UserType } from '$types/auth.types';

import { reserveAuthenticatedApiRateLimit } from './rate-limiter';
import { serviceErrors } from './service-error';
import { getAuthSession } from './session';

type RequireAuthSuccess = {
  response?: never;
  session: SessionType | null;
  success: true;
  user: UserType;
};

type RequireAuthFailure = {
  response: NextResponse<ApiErrorResponse>;
  success: false;
  user?: never;
};

type RequireAuthResult = RequireAuthSuccess | RequireAuthFailure;

type RequireAuthOptions = {
  allowPasswordChangeRequired?: boolean;
};

type RequirePermissionSuccess = {
  response?: never;
  success: true;
};

type RequirePermissionFailure = {
  response: NextResponse<ApiErrorResponse>;
  success: false;
};

type RequirePermissionResult =
  RequirePermissionSuccess | RequirePermissionFailure;

/**
 * Requires an authenticated session for an API route. Authorization is decided
 * afterwards by `requirePermission` or the module policy, never by role.
 */
export async function requireAuth(
  options: RequireAuthOptions = {},
): Promise<RequireAuthResult> {
  const { session, user } = await getAuthSession();

  if (!user) {
    return {
      response: NextResponse.json(
        {
          error: {
            code: ErrorCode.UNAUTHORIZED,
            message: 'Non authentifié',
          },
          success: false,
        },
        { status: 401 },
      ),
      success: false,
    };
  }

  if (user.mustChangePassword && !options.allowPasswordChangeRequired) {
    return {
      response: NextResponse.json(
        {
          error: {
            code: ErrorCode.PASSWORD_CHANGE_REQUIRED,
            message:
              'Vous devez changer votre mot de passe temporaire avant de continuer',
          },
          success: false,
        },
        { status: 403 },
      ),
      success: false,
    };
  }

  const apiRateLimit = await reserveAuthenticatedApiRateLimit(user.id);
  if (!apiRateLimit.allowed) {
    const retryAfter = apiRateLimit.retryAfter ?? 60;

    return {
      response: NextResponse.json(
        {
          error: {
            code: ErrorCode.RATE_LIMITED,
            message: 'Trop de requêtes. Réessayez dans un instant.',
          },
          success: false,
        },
        { headers: { 'Retry-After': String(retryAfter) }, status: 429 },
      ),
      success: false,
    };
  }

  return { session, success: true, user };
}

const PERMISSION_DENIED_MESSAGE =
  "Vous n'avez pas la permission d'effectuer cette action";

// A protected account bypasses policy decisions, never catalogue typos.
const isAllowed = (user: UserType, permissionKey: string): boolean =>
  (user.isProtected && isKnownPermissionKey(permissionKey)) ||
  hasPermission(user.role, permissionKey, user.permissions);

/**
 * Route-level check: returns the 403 response when the user lacks the
 * permission. Protected users always have full access.
 */
export function requirePermission(
  user: UserType,
  permissionKey: string,
): RequirePermissionResult {
  if (isAllowed(user, permissionKey)) return { success: true };

  return {
    response: NextResponse.json(
      {
        error: {
          code: ErrorCode.FORBIDDEN,
          message: PERMISSION_DENIED_MESSAGE,
        },
        success: false,
      },
      { status: 403 },
    ),
    success: false,
  };
}

/** Service-level variant of `requirePermission`: throws the same refusal. */
export function assertPermission(user: UserType, permissionKey: string): void {
  if (!isAllowed(user, permissionKey))
    throw serviceErrors.forbidden(PERMISSION_DENIED_MESSAGE);
}
