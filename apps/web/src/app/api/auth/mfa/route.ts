import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  PERMISSIONS,
  requiresMfaForAccess,
} from '$constants/permissions.constants';
import { requireAuth, requirePermission } from '$server/api-auth';
import { apiErrors, parseJsonBody } from '$server/api-response';
import {
  createSession,
  generateSessionToken,
  isSecurityVersionMismatchError,
  mapUserToUserType,
  SecurityVersionMismatchError,
  setSessionTokenCookie,
  verifyPassword,
} from '$server/auth';
import {
  clearMfaChallengeCookie,
  consumeVerifiedMfaProof,
  MfaReplayDetectedError,
  verifyMfaProof,
} from '$server/mfa';
import { prisma } from '$server/prisma';
import {
  recordLoginAttempt,
  reserveSensitiveActionRateLimit,
} from '$server/rate-limiter';
import {
  type ApiErrorResponse,
  type ApiSuccessResponse,
  ErrorCode,
} from '$types/api.types';
import type { UserType } from '$types/auth.types';
import { isPasswordWithinBcryptLimit } from '$utils/password.utils';

type MfaStatusResponse = {
  enabledAt: string | null;
  recoveryCodesRemaining: number;
  required: boolean;
};

type DisableMfaResponse = {
  user: UserType;
};

const disableMfaSchema = z
  .object({
    currentCode: z.string().trim().min(1, 'Code requis').max(64),
    currentPassword: z
      .string()
      .min(1, 'Mot de passe actuel requis')
      .refine(isPasswordWithinBcryptLimit, 'Mot de passe trop long'),
  })
  .strict();

const SECURITY_AUDIT_LOCATION = {
  pageKey: 'account',
  pageLabel: 'Mon compte',
  poleKey: 'account',
  poleLabel: 'Espace personnel',
  tabKey: 'security',
  tabLabel: 'Sécurité',
} as const;

const rateLimitedResponse = (
  retryAfter: number,
): NextResponse<ApiErrorResponse> =>
  NextResponse.json(
    {
      error: {
        code: ErrorCode.RATE_LIMITED,
        message:
          'Trop de tentatives. Réessayez dans ' +
          Math.ceil(retryAfter / 60) +
          ' minutes.',
      },
      success: false,
    },
    {
      headers: { 'Retry-After': String(retryAfter) },
      status: 429,
    },
  );

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
        required:
          auth.user.role === 'ADMIN' ||
          requiresMfaForAccess(auth.user.role, auth.user.permissions),
      },
      success: true,
    });
  } catch (error) {
    return apiErrors.internal('MFA_STATUS', error);
  }
}

export async function DELETE(
  request: NextRequest,
): Promise<
  NextResponse<ApiSuccessResponse<DisableMfaResponse> | ApiErrorResponse>
> {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth.response;
    const permission = requirePermission(
      auth.user,
      PERMISSIONS.ACCOUNT.MANAGE_MFA,
    );
    if (!permission.success) return permission.response;

    if (
      auth.user.role === 'ADMIN' ||
      requiresMfaForAccess(auth.user.role, auth.user.permissions)
    ) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.FORBIDDEN,
            message:
              "La double authentification d'un compte administrateur ou disposant d'accès critiques ne peut pas être désactivée",
          },
          success: false,
        },
        { status: 403 },
      );
    }

    if (!auth.session) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.UNAUTHORIZED,
            message: 'Session actuelle introuvable',
          },
          success: false,
        },
        { status: 401 },
      );
    }

    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.success) return parsedBody.response;
    const validation = disableMfaSchema.safeParse(parsedBody.data);
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

    const storedUser = await prisma.user.findUnique({
      include: {
        mfaRecoveryCodes: {
          select: { codeHash: true, id: true, salt: true },
          where: { usedAt: null },
        },
        totpCredential: true,
      },
      where: { deletedAt: null, id: auth.user.id },
    });
    if (
      !storedUser ||
      storedUser.mfaEnabledAt === null ||
      !storedUser.totpCredential
    ) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.CONFLICT,
            message: 'La double authentification n’est pas activée',
          },
          success: false,
        },
        { status: 409 },
      );
    }
    const credential = storedUser.totpCredential;

    const reauthKey = `account-reauth:${storedUser.id}`;
    const passwordLimit = await reserveSensitiveActionRateLimit(reauthKey);
    if (!passwordLimit.allowed) {
      return rateLimitedResponse(passwordLimit.retryAfter ?? 1800);
    }
    const passwordValid = await verifyPassword(
      validation.data.currentPassword,
      storedUser.passwordHash,
    );
    if (!passwordValid) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.INVALID_CREDENTIALS,
            message: 'Mot de passe actuel incorrect',
          },
          success: false,
        },
        { status: 400 },
      );
    }
    await recordLoginAttempt(reauthKey, true);

    const mfaManageKey = `account-mfa-manage:${storedUser.id}`;
    const mfaLimit = await reserveSensitiveActionRateLimit(mfaManageKey);
    if (!mfaLimit.allowed) {
      return rateLimitedResponse(mfaLimit.retryAfter ?? 1800);
    }
    const proof = await verifyMfaProof({
      code: validation.data.currentCode,
      credential: storedUser.totpCredential,
      recoveryCodes: storedUser.mfaRecoveryCodes,
      userId: storedUser.id,
    });
    if (!proof) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.INVALID_CREDENTIALS,
            message: 'Code actuel incorrect ou expiré',
          },
          success: false,
        },
        { status: 400 },
      );
    }
    await recordLoginAttempt(mfaManageKey, true);

    const sessionToken = generateSessionToken();
    const session = await createSession(
      sessionToken,
      storedUser.id,
      auth.session.securityVersion,
      auth.session.rememberMe,
      {
        action: 'MFA_DISABLED',
        category: 'AUTH',
        description: 'Double authentification désactivée',
        metadata: SECURITY_AUDIT_LOCATION,
        targetUserId: storedUser.id,
        userId: storedUser.id,
      },
      {
        additionalAudits:
          proof.method === 'RECOVERY_CODE'
            ? [
                {
                  action: 'MFA_RECOVERY_CODE_USED',
                  category: 'AUTH',
                  description: 'Code de récupération MFA utilisé',
                  metadata: SECURITY_AUDIT_LOCATION,
                  targetUserId: storedUser.id,
                  userId: storedUser.id,
                },
              ]
            : [],
        advanceSecurityVersion: true,
        disableMfa: true,
        precondition: async (transaction, authenticatedAt) => {
          await consumeVerifiedMfaProof(transaction, {
            authenticatedAt,
            credentialUpdatedAt: credential.updatedAt,
            proof,
            userId: storedUser.id,
          });
          await transaction.totpEnrollment.deleteMany({
            where: { userId: storedUser.id },
          });
          await transaction.mfaLoginChallenge.deleteMany({
            where: { userId: storedUser.id },
          });
          await transaction.mfaRecoveryCode.deleteMany({
            where: { userId: storedUser.id },
          });
          await transaction.totpCredential.delete({
            where: { userId: storedUser.id },
          });
          await transaction.rateLimit.deleteMany({
            where: { key: { in: [reauthKey, mfaManageKey] } },
          });
        },
        requireMfaEnabled: true,
        revokeExistingSessions: true,
        sourceSessionToken: auth.session.token,
      },
    );

    await setSessionTokenCookie(session.token, session.expiresAt);
    await clearMfaChallengeCookie();
    const updatedUser = await prisma.user.findUnique({
      where: { id: storedUser.id },
    });
    if (!updatedUser) throw new SecurityVersionMismatchError();

    return NextResponse.json({
      data: { user: mapUserToUserType(updatedUser) },
      success: true,
    });
  } catch (error) {
    if (
      isSecurityVersionMismatchError(error) ||
      error instanceof MfaReplayDetectedError
    ) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.UNAUTHORIZED,
            message: 'Votre session a expiré. Veuillez vous reconnecter.',
          },
          success: false,
        },
        { status: 401 },
      );
    }

    return apiErrors.internal('MFA_DISABLE', error, request);
  }
}
