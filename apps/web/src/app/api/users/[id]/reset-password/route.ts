import { NextRequest, NextResponse } from 'next/server';

import { PERMISSIONS } from '$constants/permissions.constants';
import { requireAuth, requirePermission } from '$server/api-auth';
import { apiErrors } from '$server/api-response';
import { createAuditLogWithHeaders, resetUserPassword } from '$server/auth';
import { prisma } from '$server/prisma';
import {
  type ApiErrorResponse,
  type ApiSuccessResponse,
  ErrorCode,
} from '$types/api.types';

type RouteParams = {
  params: Promise<{ id: string }>;
};

// ============================================
// POST /api/users/[id]/reset-password
// ============================================
export async function POST(
  _request: NextRequest,
  { params }: RouteParams,
): Promise<
  NextResponse<
    ApiSuccessResponse<{ temporaryPassword: string }> | ApiErrorResponse
  >
> {
  try {
    const { id } = await params;

    // Check authentication
    const auth = await requireAuth();
    if (!auth.success) return auth.response;

    // Check permission
    const permCheck = requirePermission(
      auth.user,
      PERMISSIONS.USERS.RESET_PASSWORD,
    );
    if (!permCheck.success) return permCheck.response;

    // Get existing user
    const existingUser = await prisma.user.findUnique({
      where: { deletedAt: null, id },
    });

    if (!existingUser) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.NOT_FOUND,
            message: 'Utilisateur non trouvé',
          },
          success: false,
        },
        { status: 404 },
      );
    }

    if (existingUser.id === auth.user.id) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.FORBIDDEN,
            message:
              'Utilisez le changement de mot de passe pour votre propre compte',
          },
          success: false,
        },
        { status: 403 },
      );
    }

    // Protected accounts can only be reset by a protected actor
    if (
      existingUser.isProtected &&
      existingUser.id !== auth.user.id &&
      !auth.user.isProtected
    ) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.FORBIDDEN,
            message:
              'Vous ne pouvez pas réinitialiser le mot de passe de ce compte',
          },
          success: false,
        },
        { status: 403 },
      );
    }

    // Reset password
    const temporaryPassword = await resetUserPassword(id);

    // Log audit
    await createAuditLogWithHeaders({
      action: 'PASSWORD_RESET',
      category: 'AUTH',
      description: `Mot de passe réinitialisé pour: ${existingUser.email}`,
      metadata: { targetUserId: id },
      userId: auth.user.id,
    });

    return NextResponse.json({
      data: { temporaryPassword },
      success: true,
    });
  } catch (error) {
    return apiErrors.internal('PASSWORD_RESET', error);
  }
}
