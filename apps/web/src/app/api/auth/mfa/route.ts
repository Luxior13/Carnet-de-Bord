import { NextResponse } from 'next/server';

import { PERMISSIONS } from '$constants/permissions.constants';
import { requireAuth, requirePermission } from '$server/api-auth';
import { apiErrors } from '$server/api-response';
import { prisma } from '$server/prisma';
import {
  type ApiErrorResponse,
  type ApiSuccessResponse,
  ErrorCode,
} from '$types/api.types';

type MfaStatusResponse = {
  enabledAt: string | null;
  recoveryCodesRemaining: number;
  required: true;
};

export async function GET(): Promise<
  NextResponse<ApiSuccessResponse<MfaStatusResponse> | ApiErrorResponse>
> {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth.response;
    const permission = requirePermission(
      auth.user,
      PERMISSIONS.ACCOUNT.MANAGE_MFA,
    );
    if (!permission.success) return permission.response;

    const [credential, recoveryCodesRemaining] = await Promise.all([
      prisma.totpCredential.findUnique({
        select: { userId: true },
        where: { userId: auth.user.id },
      }),
      prisma.mfaRecoveryCode.count({
        where: { usedAt: null, userId: auth.user.id },
      }),
    ]);
    const hasEnabledMfa = auth.user.mfaEnabledAt !== null;
    const hasTotpCredential = credential !== null;
    if (hasEnabledMfa !== hasTotpCredential) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.CONFLICT,
            message:
              'La configuration de double authentification est incohérente',
          },
          success: false,
        },
        { status: 409 },
      );
    }

    return NextResponse.json({
      data: {
        enabledAt: auth.user.mfaEnabledAt?.toISOString() ?? null,
        recoveryCodesRemaining,
        required: true,
      },
      success: true,
    });
  } catch (error) {
    return apiErrors.internal('MFA_STATUS', error);
  }
}

/**
 * MFA is mandatory for every human account. Recovery remains possible through
 * the protected administrative reset flow, which revokes every session and
 * forces a fresh enrollment at the next login.
 */
export async function DELETE(): Promise<NextResponse<ApiErrorResponse>> {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth.response;
    const permission = requirePermission(
      auth.user,
      PERMISSIONS.ACCOUNT.MANAGE_MFA,
    );
    if (!permission.success) return permission.response;

    return NextResponse.json(
      {
        error: {
          code: ErrorCode.FORBIDDEN,
          message:
            'La double authentification est obligatoire et ne peut pas être désactivée',
        },
        success: false,
      },
      { status: 403 },
    );
  } catch (error) {
    return apiErrors.internal('MFA_DISABLE', error);
  }
}
