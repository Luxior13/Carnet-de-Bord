import { UserRole } from '@repo/database';
import { NextRequest, NextResponse } from 'next/server';

import { PAGINATION } from '$constants/pagination.constants';
import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import { createUserSchema } from '$features/users/create-user.schema';
import { createUserForActor } from '$features/users/server/user-admin.service';
import { listUsers } from '$features/users/server/users-list.service';
import { requireAuth, requirePermission } from '$server/api-auth';
import {
  apiError,
  apiErrors,
  apiSuccess,
  parseJsonBody,
  parsePagination,
} from '$server/api-response';
import { serviceErrorResponse } from '$server/service-error';
import { mapUserToUserType } from '$server/user-projection';
import { protectUserIdentityForActor } from '$server/user-visibility';
import {
  type ApiErrorResponse,
  type ApiSuccessResponse,
  ErrorCode,
} from '$types/api.types';
import type { UsersListResponse, UserType } from '$types/auth.types';
import { loginNameSchema } from '$utils/zod.utils';

const USER_SORT_OPTIONS = ['name', 'recent', 'created'] as const;
type UserSortOption = (typeof USER_SORT_OPTIONS)[number];
const USER_STATUS_OPTIONS = ['active', 'inactive', 'pending'] as const;
type UserStatusOption = (typeof USER_STATUS_OPTIONS)[number];
const USER_SEARCH_MAX_LENGTH = 100;

function normalizeUserSort(value: string | null): UserSortOption {
  return USER_SORT_OPTIONS.includes(value as UserSortOption)
    ? (value as UserSortOption)
    : 'name';
}

function normalizeUserRole(
  value: string | null,
): UserRole | 'SUPERADMIN' | null {
  return value === UserRole.ADMIN ||
    value === UserRole.USER ||
    value === 'SUPERADMIN'
    ? value
    : null;
}

function normalizeUserStatus(value: string | null): UserStatusOption | null {
  return USER_STATUS_OPTIONS.includes(value as UserStatusOption)
    ? (value as UserStatusOption)
    : null;
}

export async function GET(
  request: NextRequest,
): Promise<
  NextResponse<ApiSuccessResponse<UsersListResponse> | ApiErrorResponse>
> {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth.response;

    const permCheck = requirePermission(auth.user, PERMISSIONS.USERS.VIEW);
    if (!permCheck.success) return permCheck.response;
    const canViewContact =
      auth.user.isProtected ||
      hasPermission(
        auth.user.role,
        PERMISSIONS.USERS.VIEW_CONTACT,
        auth.user.permissions,
      ) ||
      hasPermission(
        auth.user.role,
        PERMISSIONS.USERS.UPDATE_CONTACT,
        auth.user.permissions,
      );
    const canViewSecurity =
      auth.user.isProtected ||
      hasPermission(
        auth.user.role,
        PERMISSIONS.USERS.VIEW_SECURITY,
        auth.user.permissions,
      );
    const { searchParams } = new URL(request.url);
    const { limit, page, skip } = parsePagination(
      searchParams,
      PAGINATION.DEFAULT_LIMIT,
      {
        maxLimit: 100,
      },
    );
    const search =
      searchParams.get('search')?.trim().slice(0, USER_SEARCH_MAX_LENGTH) || '';
    const role = normalizeUserRole(searchParams.get('role'));
    const sort = normalizeUserSort(searchParams.get('sort'));
    const status = normalizeUserStatus(searchParams.get('status'));

    if (status === 'pending' && !canViewSecurity) {
      return apiError(
        ErrorCode.FORBIDDEN,
        'La permission de voir la sécurité des comptes est requise pour ce filtre',
        403,
      );
    }

    let loginName: string | undefined;

    if (searchParams.has('loginName')) {
      const exactLogin = loginNameSchema.safeParse(
        searchParams.get('loginName'),
      );
      if (!exactLogin.success)
        return apiErrors.validation('Identifiant invalide');
      loginName = exactLogin.data;
    }

    const { stats, total, users } = await listUsers(
      { limit, loginName, role, search, skip, sort, status },
      { canViewContact, canViewSecurity, isProtected: auth.user.isProtected },
    );

    return apiSuccess({
      pagination: {
        limit,
        page,
        total,
        totalPages: Math.ceil(total / limit),
      },
      securityDetailsVisible: canViewSecurity,
      stats,
      users: users.map((user) => {
        const mappedUser = mapUserToUserType({
          ...user,
          permissions: null,
        });

        return protectUserIdentityForActor(
          {
            ...mappedUser,
            ...(canViewContact
              ? {}
              : { contactEmail: null, contactEmailVerifiedAt: null }),
            ...(canViewSecurity
              ? { securityDetailsVisible: true }
              : {
                  mfaEnabledAt: null,
                  mustChangePassword: false,
                  passwordChangedAt: null,
                  securityDetailsVisible: false,
                }),
          },
          auth.user,
        );
      }),
    });
  } catch (error) {
    return apiErrors.internal('USERS_LIST', error, request);
  }
}

export async function POST(
  request: NextRequest,
): Promise<
  NextResponse<
    | ApiSuccessResponse<{ temporaryPassword: string; user: UserType }>
    | ApiErrorResponse
  >
> {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth.response;

    const permCheck = requirePermission(auth.user, PERMISSIONS.USERS.CREATE);
    if (!permCheck.success) return permCheck.response;

    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.success) return parsedBody.response;
    const validation = createUserSchema.safeParse(parsedBody.data);
    if (!validation.success) {
      return apiErrors.validation(
        'Données invalides',
        validation.error.flatten().fieldErrors,
      );
    }

    return apiSuccess(
      await createUserForActor(
        { actor: auth.user, session: auth.session },
        validation.data,
      ),
    );
  } catch (error) {
    return serviceErrorResponse(error, { action: 'USER_CREATE', request });
  }
}
