import type { Prisma } from '@prisma/client';
import { UserRole } from '@repo/database';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import { requireAuth, requirePermission } from '$server/api-auth';
import {
  apiErrors,
  isPrismaUniqueConstraintError,
  parseJsonBody,
  parsePagination,
} from '$server/api-response';
import {
  createUser,
  generateTemporaryPassword,
  mapUserToUserType,
} from '$server/auth';
import { prisma } from '$server/prisma';
import { requireRecentSensitiveActionProof } from '$server/sensitive-action';
import {
  type ApiErrorResponse,
  type ApiSuccessResponse,
  ErrorCode,
} from '$types/api.types';
import type { UsersListResponse, UserType } from '$types/auth.types';
import {
  loginNameSchema,
  optionalEmailSchema,
  trimmedStringMinMax,
} from '$utils/zod.utils';

const USER_SORT_OPTIONS = ['name', 'recent', 'created'] as const;
type UserSortOption = (typeof USER_SORT_OPTIONS)[number];
const USER_STATUS_OPTIONS = ['active', 'inactive', 'pending'] as const;
type UserStatusOption = (typeof USER_STATUS_OPTIONS)[number];
const USER_SEARCH_MAX_LENGTH = 100;
const USERS_PAGE_AUDIT_LOCATION = {
  pageKey: 'users',
  pageLabel: 'Utilisateurs & permissions',
  poleKey: 'system',
  poleLabel: 'Système',
} as const;

const USER_LIST_SELECT = {
  contactEmail: true,
  contactEmailVerifiedAt: true,
  createdAt: true,
  failedLoginAttempts: true,
  firstName: true,
  id: true,
  isActive: true,
  isProtected: true,
  lastLoginAt: true,
  lastName: true,
  lockedUntil: true,
  loginName: true,
  mfaEnabledAt: true,
  mustChangePassword: true,
  passwordChangedAt: true,
  role: true,
} satisfies Prisma.UserSelect;

type CountGroup = {
  _count: {
    _all: number;
  };
};

function normalizeUserSort(value: string | null): UserSortOption {
  return USER_SORT_OPTIONS.includes(value as UserSortOption)
    ? (value as UserSortOption)
    : 'name';
}

function normalizeUserRole(value: string | null): UserRole | null {
  return value === UserRole.ADMIN || value === UserRole.USER ? value : null;
}

function normalizeUserStatus(value: string | null): UserStatusOption | null {
  return USER_STATUS_OPTIONS.includes(value as UserStatusOption)
    ? (value as UserStatusOption)
    : null;
}

function getUserOrderBy(
  sort: UserSortOption,
): Prisma.UserOrderByWithRelationInput[] {
  if (sort === 'recent') {
    return [
      { lastLoginAt: { nulls: 'last', sort: 'desc' } },
      { createdAt: 'desc' },
    ];
  }

  if (sort === 'created') {
    return [{ createdAt: 'desc' }];
  }

  return [{ lastName: 'asc' }, { firstName: 'asc' }, { createdAt: 'desc' }];
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
    const { limit, page, skip } = parsePagination(searchParams, 25, {
      maxLimit: 100,
    });
    const search = (
      searchParams.get('search')?.trim().slice(0, USER_SEARCH_MAX_LENGTH) || ''
    ).toLowerCase();
    const role = normalizeUserRole(searchParams.get('role'));
    const sort = normalizeUserSort(searchParams.get('sort'));
    const status = normalizeUserStatus(searchParams.get('status'));

    if (status === 'pending' && !canViewSecurity) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.FORBIDDEN,
            message:
              'La permission de voir la sÃ©curitÃ© des comptes est requise pour ce filtre',
          },
          success: false,
        },
        { status: 403 },
      );
    }

    const where: Prisma.UserWhereInput = { deletedAt: null };

    if (search) {
      const searchFilters: Prisma.UserWhereInput[] = [
        { loginName: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];

      if (canViewContact) {
        searchFilters.push({
          contactEmail: { contains: search, mode: 'insensitive' },
        });
      }

      where.OR = searchFilters;
    }

    if (role) {
      where.role = role;
    }

    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    } else if (status === 'pending') {
      where.mustChangePassword = true;
    }

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const baseUserWhere: Prisma.UserWhereInput = { deletedAt: null };
    const countActiveUsers = (
      extraWhere: Prisma.UserWhereInput = {},
    ): Promise<number> =>
      prisma.user.count({ where: { ...baseUserWhere, ...extraWhere } });

    const [
      total,
      users,
      statsTotal,
      activeStatusCounts,
      roleCounts,
      neverLoggedIn,
      newThisWeek,
      pendingPasswordChange,
      recentLogins,
    ] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        orderBy: getUserOrderBy(sort),
        select: USER_LIST_SELECT,
        skip,
        take: limit,
        where,
      }),
      countActiveUsers(),
      prisma.user.groupBy({
        _count: { _all: true },
        by: ['isActive'],
        where: baseUserWhere,
      }),
      prisma.user.groupBy({
        _count: { _all: true },
        by: ['role'],
        where: baseUserWhere,
      }),
      countActiveUsers({ lastLoginAt: null }),
      countActiveUsers({ createdAt: { gte: oneWeekAgo } }),
      canViewSecurity
        ? countActiveUsers({ mustChangePassword: true })
        : Promise.resolve(null),
      countActiveUsers({ lastLoginAt: { gte: oneDayAgo } }),
    ]);

    const active =
      (activeStatusCounts as (CountGroup & { isActive: boolean })[]).find(
        (group) => group.isActive,
      )?._count._all ?? 0;
    const inactive =
      (activeStatusCounts as (CountGroup & { isActive: boolean })[]).find(
        (group) => !group.isActive,
      )?._count._all ?? 0;
    const adminCount =
      (roleCounts as (CountGroup & { role: UserRole })[]).find(
        (group) => group.role === UserRole.ADMIN,
      )?._count._all ?? 0;
    const userCount =
      (roleCounts as (CountGroup & { role: UserRole })[]).find(
        (group) => group.role === UserRole.USER,
      )?._count._all ?? 0;

    const stats = {
      active,
      byRole: { ADMIN: adminCount, USER: userCount },
      inactive,
      neverLoggedIn,
      newThisWeek,
      pendingPasswordChange,
      recentLogins,
      total: statsTotal,
    };

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

          return {
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
          };
        }),
      },
      success: true,
    });
  } catch (error) {
    return apiErrors.internal('USERS_LIST', error);
  }
}

const createUserSchema = z
  .object({
    contactEmail: optionalEmailSchema,
    firstName: trimmedStringMinMax(1, 50, 'Prénom requis', 'Prénom trop long'),
    lastName: trimmedStringMinMax(1, 50, 'Nom requis', 'Nom trop long'),
    loginName: loginNameSchema,
    role: z.enum(['ADMIN', 'USER']),
  })
  .strict();

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
      where: { loginName },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.VALIDATION_ERROR,
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
    if (isPrismaUniqueConstraintError(error)) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.VALIDATION_ERROR,
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
