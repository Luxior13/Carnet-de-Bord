import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { PERMISSIONS } from '$constants/permissions.constants';
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
  consumeVerifiedMfaProof,
  generateRecoveryCodes,
  MFA_TOTP_CODE_PATTERN,
  MfaReplayDetectedError,
  verifyMfaProof,
} from '$server/mfa';
import { prisma } from '$server/prisma';
import {
  recordLoginAttempt,
  reserveSensitiveActionRateLimit,
} from '$server/rate-limiter';
import { createSecurityNotification } from '$server/security-notifications';
import {
  type ApiErrorResponse,
  type ApiSuccessResponse,
  ErrorCode,
} from '$types/api.types';
import type { UserType } from '$types/auth.types';
import { isPasswordWithinBcryptLimit } from '$utils/password.utils';

const regenerateSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, 'Mot de passe actuel requis')
      .refine(isPasswordWithinBcryptLimit, 'Mot de passe trop long'),
    // Regenerating the last-resort proofs must itself require the normal
    // authenticator. Accepting one recovery code to replace every remaining
    // recovery code can otherwise strand the user when the response is lost.
    currentTotpCode: z
      .string()
      .trim()
      .regex(MFA_TOTP_CODE_PATTERN, "Code d'authentification invalide"),
  })
  .strict();

type RecoveryCodesResponse = {
  recoveryCodes: string[];
  user: UserType;
};

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

export async function POST(
  request: NextRequest,
): Promise<
  NextResponse<ApiSuccessResponse<RecoveryCodesResponse> | ApiErrorResponse>
> {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth.response;
    const permission = requirePermission(
      auth.user,
      PERMISSIONS.ACCOUNT.MANAGE_MFA,
    );
    if (!permission.success) return permission.response;
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
    const validation = regenerateSchema.safeParse(parsedBody.data);
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
      code: validation.data.currentTotpCode,
      credential: storedUser.totpCredential,
      recoveryCodes: [],
      userId: storedUser.id,
    });
    if (!proof || proof.method !== 'TOTP') {
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

    const generatedCodes = generateRecoveryCodes(storedUser.id);
    const sessionToken = generateSessionToken();
    const session = await createSession(
      sessionToken,
      storedUser.id,
      auth.session.securityVersion,
      auth.session.rememberMe,
      {
        action: 'MFA_RECOVERY_CODES_REGENERATED',
        category: 'AUTH',
        description: 'Codes de récupération MFA régénérés',
        metadata: {
          ...SECURITY_AUDIT_LOCATION,
          recoveryCodesGenerated: generatedCodes.length,
        },
        targetUserId: storedUser.id,
        userId: storedUser.id,
      },
      {
        advanceSecurityVersion: true,
        mfaMethod: 'TOTP',
        precondition: async (transaction, authenticatedAt) => {
          await consumeVerifiedMfaProof(transaction, {
            authenticatedAt,
            credentialUpdatedAt: credential.updatedAt,
            proof,
            userId: storedUser.id,
          });
          await transaction.mfaRecoveryCode.deleteMany({
            where: { userId: storedUser.id },
          });
          await transaction.mfaRecoveryCode.createMany({
            data: generatedCodes.map((recoveryCode) => ({
              codeHash: recoveryCode.codeHash,
              salt: recoveryCode.salt,
              userId: storedUser.id,
            })),
          });
          await transaction.rateLimit.deleteMany({
            where: { key: { in: [reauthKey, mfaManageKey] } },
          });
          await createSecurityNotification(
            {
              actorUserId: storedUser.id,
              kind: 'RECOVERY_CODES_REGENERATED',
              recipientUserId: storedUser.id,
            },
            transaction,
          );
        },
        requireMfaEnabled: true,
        revokeExistingSessions: true,
        sourceSessionToken: auth.session.token,
      },
    );

    await setSessionTokenCookie(session.token, session.expiresAt);

    const updatedUser = await prisma.user.findUnique({
      where: { id: storedUser.id },
    });
    if (!updatedUser) throw new SecurityVersionMismatchError();

    return NextResponse.json({
      data: {
        recoveryCodes: generatedCodes.map((code) => code.plaintext),
        user: mapUserToUserType(updatedUser),
      },
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

    return apiErrors.internal('MFA_RECOVERY_CODES_REGENERATE', error, request);
  }
}
