import { NextRequest, NextResponse } from 'next/server';

import { FEATURES } from '$constants/feature-registry.constants';
import { PERMISSIONS } from '$constants/permissions.constants';
import { requireAuth, requirePermission } from '$server/api-auth';
import { apiErrors } from '$server/api-response';
import {
  isSecurityVersionMismatchError,
  resetUserPassword,
} from '$server/auth';
import { prisma } from '$server/prisma';
import { requireRecentSensitiveActionProof } from '$server/sensitive-action';
import {
  type ApiErrorResponse,
  type ApiSuccessResponse,
  ErrorCode,
} from '$types/api.types';

type RouteParams = {
  params: Promise<{ id: string }>;
};

const USERS_SECURITY_AUDIT_LOCATION = {
  ...FEATURES.users.audit,
  tabKey: 'security',
  tabLabel: 'Sécurité',
} as const;

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
      select: {
        firstName: true,
        id: true,
        isProtected: true,
        lastName: true,
        loginName: true,
        role: true,
        securityVersion: true,
        updatedAt: true,
      },
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

    if (existingUser.isProtected) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.FORBIDDEN,
            message:
              'Le mot de passe du compte racine ne peut être modifié que par son propriétaire',
          },
          success: false,
        },
        { status: 403 },
      );
    }

    // Administrative accounts require the root actor.
    if (
      existingUser.role === 'ADMIN' &&
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

    const proofCheck = requireRecentSensitiveActionProof(auth.session);
    if (!proofCheck.success) return proofCheck.response;

    const targetName =
      existingUser.firstName && existingUser.lastName
        ? `${existingUser.firstName} ${existingUser.lastName}`
        : existingUser.loginName;

    // Password reset, lock reset, session revocation and audit are atomic.
    const temporaryPassword = await resetUserPassword(
      id,
      {
        action: 'PASSWORD_RESET',
        category: 'AUTH',
        description: `Mot de passe réinitialisé pour: ${existingUser.loginName}`,
        metadata: {
          passwordReset: true,
          ...USERS_SECURITY_AUDIT_LOCATION,
          targetName,
        },
        targetUserId: id,
        userId: auth.user.id,
      },
      {
        expectedRole: existingUser.role,
        expectedSecurityVersion: existingUser.securityVersion,
        expectedUpdatedAt: existingUser.updatedAt,
      },
    );

    return NextResponse.json({
      data: { temporaryPassword },
      success: true,
    });
  } catch (error) {
    if (isSecurityVersionMismatchError(error)) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.CONFLICT,
            message:
              'La sécurité ou le rôle de ce compte a changé. Rechargez la fiche avant de réessayer.',
          },
          success: false,
        },
        { status: 409 },
      );
    }

    return apiErrors.internal('PASSWORD_RESET', error);
  }
}
