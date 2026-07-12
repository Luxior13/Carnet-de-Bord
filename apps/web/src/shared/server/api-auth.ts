import { type UserRole } from '@repo/database';
import { NextResponse } from 'next/server';

import { hasPermission } from '$constants/permissions.constants';
import { type ApiErrorResponse, ErrorCode } from '$types/api.types';
import type { SessionType, UserType } from '$types/auth.types';

import { getAuthSession } from './auth';

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
 * Requires authentication for an API route
 */
export async function requireAuth(
  allowedRoles?: UserRole[],
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

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return {
      response: NextResponse.json(
        {
          error: {
            code: ErrorCode.FORBIDDEN,
            message: 'Accès refusé',
          },
          success: false,
        },
        { status: 403 },
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

  return { session, success: true, user };
}

/**
 * Checks if a user has a specific permission
 * Protected users always have full access
 */
export function requirePermission(
  user: UserType,
  permissionKey: string,
): RequirePermissionResult {
  // Protected users have all permissions
  if (user.isProtected) {
    return { success: true };
  }

  const hasAccess = hasPermission(user.role, permissionKey, user.permissions);

  if (!hasAccess) {
    return {
      response: NextResponse.json(
        {
          error: {
            code: ErrorCode.FORBIDDEN,
            message: "Vous n'avez pas la permission d'effectuer cette action",
          },
          success: false,
        },
        { status: 403 },
      ),
      success: false,
    };
  }

  return { success: true };
}

/**
 * Checks whether the user has at least one permission from a list.
 * Useful for gradual permission migrations (fine-grained + legacy fallback).
 */
export function requireAnyPermission(
  user: UserType,
  permissionKeys: readonly string[],
): RequirePermissionResult {
  // Protected users have all permissions
  if (user.isProtected) {
    return { success: true };
  }

  const hasAccess = permissionKeys.some((permissionKey) =>
    hasPermission(user.role, permissionKey, user.permissions),
  );

  if (!hasAccess) {
    return {
      response: NextResponse.json(
        {
          error: {
            code: ErrorCode.FORBIDDEN,
            message: "Vous n'avez pas la permission d'effectuer cette action",
          },
          success: false,
        },
        { status: 403 },
      ),
      success: false,
    };
  }

  return { success: true };
}

/**
 * Shorthand role groups
 */
export const Roles = {
  ADMIN: ['ADMIN'] as UserRole[],
  ALL: ['ADMIN', 'USER'] as UserRole[],
};
