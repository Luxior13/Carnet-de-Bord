import { UserRole } from '@repo/database';
import { NextRequest, NextResponse } from 'next/server';

import { FEATURES } from '$constants/feature-registry.constants';
import { PAGINATION } from '$constants/pagination.constants';
import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import { createUserSchema } from '$features/users/create-user.schema';
import { createUser } from '$features/users/server/user-create.service';
import { listUsers } from '$features/users/server/users-list.service';
import { requireAuth, requirePermission } from '$server/api-auth';
import {
  apiError,
  apiErrors,
  isPrismaUniqueConstraintError,
  parseJsonBody,
  parsePagination,
} from '$server/api-response';
import { generateTemporaryPassword, mapUserToUserType } from '$server/auth';
import { prisma } from '$server/prisma';
import { requireRecentSensitiveActionProof } from '$server/sensitive-action';
import { UserActionAuthorizationError } from '$server/user-action-authorization';
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
const USERS_PAGE_AUDIT_LOCATION = FEATURES.users.audit;

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
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.FORBIDDEN,
            message:
              'La permission de voir la sécurité des comptes est requise pour ce filtre',
          },
          success: false,
        },
        { status: 403 },
      );
    }

    let loginName: string | undefined;

    if (searchParams.has('loginName')) {
      const exactLogin = loginNameSchema.safeParse(
        searchParams.get('loginName'),
      );
      if (!exactLogin.success) {
        return NextResponse.json(
          {
            error: {
              code: ErrorCode.VALIDATION_ERROR,
              message: 'Identifiant invalide',
            },
            success: false,
          },
          { status: 400 },
        );
      }
      loginName = exactLogin.data;
    }

    const { stats, total, users } = await listUsers(
      { limit, loginName, role, search, skip, sort, status },
      { canViewContact, canViewSecurity, isProtected: auth.user.isProtected },
    );

    return NextResponse.json({
      data: {
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
                    failedLoginAttempts: 0,
                    lockedUntil: null,
                    mfaEnabledAt: null,
                    mustChangePassword: false,
                    passwordChangedAt: null,
                    securityDetailsVisible: false,
                  }),
            },
            auth.user,
          );
        }),
      },
      success: true,
    });
  } catch (error) {
    return apiErrors.internal('USERS_LIST', error);
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
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            details: validation.error.flatten().fieldErrors,
            message: 'Données invalides',
          },
          success: false,
        },
        { status: 400 },
      );
    }

    const { contactEmail, firstName, lastName, loginName, role } =
      validation.data;

    if (role === 'ADMIN' && !auth.user.isProtected) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.FORBIDDEN,
            message:
              "Vous n'êtes pas autorisé à créer des comptes administrateurs",
          },
          success: false,
        },
        { status: 403 },
      );
    }

    const existingUser = await prisma.user.findUnique({
      select: { id: true },
      where: { loginName },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            details: { loginName: ['Cet identifiant est déjà utilisé'] },
            message: 'Cet identifiant est déjà utilisé',
          },
          success: false,
        },
        { status: 400 },
      );
    }

    if (role === 'ADMIN') {
      const proofCheck = requireRecentSensitiveActionProof(auth.session);
      if (!proofCheck.success) return proofCheck.response;
    }

    const temporaryPassword = generateTemporaryPassword();
    const newUser = await createUser(
      {
        contactEmail: contactEmail ?? null,
        firstName,
        lastName,
        loginName,
        password: temporaryPassword,
        role,
      },
      { actorId: auth.user.id, session: auth.session },
      (createdUser) => ({
        action: 'USER_CREATE',
        category: 'USER',
        description: `Utilisateur créé: ${createdUser.loginName}`,
        metadata: {
          createdUserId: createdUser.id,
          loginName: createdUser.loginName,
          ...USERS_PAGE_AUDIT_LOCATION,
          role: createdUser.role,
          tabKey: 'creation',
          tabLabel: 'Création',
        },
        targetUserId: createdUser.id,
        userId: auth.user.id,
      }),
    );

    return NextResponse.json({
      data: {
        temporaryPassword,
        user: mapUserToUserType(newUser),
      },
      success: true,
    });
  } catch (error) {
    if (error instanceof UserActionAuthorizationError) {
      return apiError(error.code, error.message, error.status);
    }
    if (isPrismaUniqueConstraintError(error)) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            details: { loginName: ['Cet identifiant est déjà utilisé'] },
            message: 'Cet identifiant est déjà utilisé',
          },
          success: false,
        },
        { status: 409 },
      );
    }

    return apiErrors.internal('USER_CREATE', error);
  }
}
