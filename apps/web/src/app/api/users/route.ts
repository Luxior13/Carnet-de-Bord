import type { Prisma } from '@prisma/client';
import { UserRole } from '@repo/database';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { PERMISSIONS } from '$constants/permissions.constants';
import { requireAuth, requirePermission } from '$server/api-auth';
import { apiErrors, parsePagination } from '$server/api-response';
import {
  createAuditLogWithHeaders,
  createUser,
  generateTemporaryPassword,
  mapUserToUserType,
} from '$server/auth';
import { prisma } from '$server/prisma';
import {
  type ApiErrorResponse,
  type ApiSuccessResponse,
  ErrorCode,
} from '$types/api.types';
import type { UsersListResponse, UserType } from '$types/auth.types';
import { emailSchema, trimmedStringMin } from '$utils/zod.utils';

const USER_SORT_OPTIONS = ['name', 'recent', 'created'] as const;
type UserSortOption = (typeof USER_SORT_OPTIONS)[number];

function normalizeUserSort(value: string | null): UserSortOption {
  return USER_SORT_OPTIONS.includes(value as UserSortOption)
    ? (value as UserSortOption)
    : 'name';
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

    const { searchParams } = new URL(request.url);
    const { limit, page, skip } = parsePagination(searchParams, 25, {
      maxLimit: 100,
    });
    const search = searchParams.get('search')?.trim().toLowerCase() || '';
    const role = searchParams.get('role') as UserRole | null;
    const sort = normalizeUserSort(searchParams.get('sort'));
    const status = searchParams.get('status');

    const where: Prisma.UserWhereInput = { deletedAt: null };

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role && ['ADMIN', 'USER'].includes(role)) {
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
      active,
      inactive,
      adminCount,
      userCount,
      neverLoggedIn,
      newThisWeek,
      pendingPasswordChange,
      recentLogins,
    ] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        orderBy: getUserOrderBy(sort),
        skip,
        take: limit,
        where,
      }),
      countActiveUsers(),
      countActiveUsers({ isActive: true }),
      countActiveUsers({ isActive: false }),
      countActiveUsers({ role: UserRole.ADMIN }),
      countActiveUsers({ role: UserRole.USER }),
      countActiveUsers({ lastLoginAt: null }),
      countActiveUsers({ createdAt: { gte: oneWeekAgo } }),
      countActiveUsers({ mustChangePassword: true }),
      countActiveUsers({ lastLoginAt: { gte: oneDayAgo } }),
    ]);

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
        stats,
        users: users.map((user) => mapUserToUserType(user)),
      },
      success: true,
    });
  } catch (error) {
    return apiErrors.internal('USERS_LIST', error);
  }
}

const createUserSchema = z.object({
  email: emailSchema,
  firstName: trimmedStringMin(1, 'Prénom requis'),
  lastName: trimmedStringMin(1, 'Nom requis'),
  role: z.enum(['ADMIN', 'USER']),
});

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

    const body = await request.json();
    const validation = createUserSchema.safeParse(body);

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

    const { email, firstName, lastName, role } = validation.data;

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
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Cet email est déjà utilisé',
          },
          success: false,
        },
        { status: 400 },
      );
    }

    const temporaryPassword = generateTemporaryPassword();
    const newUser = await createUser({
      email,
      firstName,
      lastName,
      password: temporaryPassword,
      role,
    });

    await createAuditLogWithHeaders({
      action: 'USER_CREATE',
      category: 'USER',
      description: `Utilisateur créé: ${newUser.email}`,
      metadata: {
        createdUserId: newUser.id,
        role: newUser.role,
      },
      userId: auth.user.id,
    });

    return NextResponse.json({
      data: {
        temporaryPassword,
        user: mapUserToUserType(newUser),
      },
      success: true,
    });
  } catch (error) {
    return apiErrors.internal('USER_CREATE', error);
  }
}
