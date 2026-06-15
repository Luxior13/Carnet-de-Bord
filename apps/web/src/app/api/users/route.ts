import { UserRole } from '@repo/database';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { PERMISSIONS } from '$constants/permissions.constants';
import { requireAuth, requirePermission } from '$server/api-auth';
import { apiErrors } from '$server/api-response';
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

// ============================================
// GET /api/users - List users with pagination
// ============================================
export async function GET(
  request: NextRequest,
): Promise<
  NextResponse<ApiSuccessResponse<UsersListResponse> | ApiErrorResponse>
> {
  try {
    // Check authentication
    const auth = await requireAuth();
    if (!auth.success) return auth.response;

    // Check permission
    const permCheck = requirePermission(auth.user, PERMISSIONS.USERS.VIEW);
    if (!permCheck.success) return permCheck.response;

    // Parse pagination params
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get('limit') || '25', 10)),
    );
    const search = searchParams.get('search')?.trim().toLowerCase() || '';
    const role = searchParams.get('role') as UserRole | null;
    const status = searchParams.get('status'); // 'active' | 'inactive' | null

    // Build where clause
    const where: {
      deletedAt: null;
      email?: { contains: string; mode: 'insensitive' };
      firstName?: { contains: string; mode: 'insensitive' };
      isActive?: boolean;
      lastName?: { contains: string; mode: 'insensitive' };
      mustChangePassword?: boolean;
      OR?: Array<{
        email?: { contains: string; mode: 'insensitive' };
        firstName?: { contains: string; mode: 'insensitive' };
        lastName?: { contains: string; mode: 'insensitive' };
      }>;
      role?: UserRole;
    } = { deletedAt: null };

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

    // Get total count for pagination
    const total = await prisma.user.count({ where });

    // Get paginated users
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      where,
    });

    // Calculate statistics (on ALL users, not just paginated)
    const allUsers = await prisma.user.findMany({
      select: {
        createdAt: true,
        isActive: true,
        lastLoginAt: true,
        mustChangePassword: true,
        role: true,
      },
      where: { deletedAt: null },
    });

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const stats = allUsers.reduce(
      (acc, user) => {
        acc.total++;
        if (user.isActive) acc.active++;
        else acc.inactive++;
        if (user.role === UserRole.ADMIN) acc.byRole.ADMIN++;
        else acc.byRole.USER++;
        if (!user.lastLoginAt) acc.neverLoggedIn++;
        if (user.createdAt >= oneWeekAgo) acc.newThisWeek++;
        if (user.mustChangePassword) acc.pendingPasswordChange++;
        if (user.lastLoginAt && user.lastLoginAt >= oneDayAgo)
          acc.recentLogins++;

        return acc;
      },
      {
        active: 0,
        byRole: { ADMIN: 0, USER: 0 },
        inactive: 0,
        neverLoggedIn: 0,
        newThisWeek: 0,
        pendingPasswordChange: 0,
        recentLogins: 0,
        total: 0,
      },
    );

    return NextResponse.json({
      data: {
        pagination: {
          limit,
          page,
          total,
          totalPages: Math.ceil(total / limit),
        },
        stats,
        users: users.map(mapUserToUserType),
      },
      success: true,
    });
  } catch (error) {
    return apiErrors.internal('USERS_LIST', error);
  }
}

// ============================================
// POST /api/users - Create a new user
// ============================================
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
    // Check authentication
    const auth = await requireAuth();
    if (!auth.success) return auth.response;

    // Check permission
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

    // Only protected users can create ADMIN accounts
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

    // Check if email already exists
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

    // Generate temporary password
    const temporaryPassword = generateTemporaryPassword();

    const newUser = await createUser({
      email,
      firstName,
      lastName,
      password: temporaryPassword,
      role,
    });

    // Log audit
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
