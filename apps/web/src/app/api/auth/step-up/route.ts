import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAuth } from '$server/api-auth';
import { apiErrors, parseJsonBody } from '$server/api-response';
import { createAuditLogWithHeaders, verifyPassword } from '$server/auth';
import {
  consumeVerifiedMfaProof,
  MFA_TOTP_CODE_PATTERN,
  MfaReplayDetectedError,
  verifyMfaProof,
} from '$server/mfa';
import { prisma } from '$server/prisma';
import {
  recordLoginAttempt,
  reserveSensitiveActionRateLimit,
} from '$server/rate-limiter';
import { SENSITIVE_ACTION_PROOF_MAX_AGE_MS } from '$server/sensitive-action';
import {
  type ApiErrorResponse,
  type ApiSuccessResponse,
  ErrorCode,
} from '$types/api.types';
import { isPasswordWithinBcryptLimit } from '$utils/password.utils';

type StepUpResponse = {
  expiresAt: string;
};

const STEP_UP_AUDIT_LOCATION = {
  pageKey: 'authentication',
  pageLabel: 'Authentification',
  poleKey: 'system',
  poleLabel: 'Système',
  tabKey: 'step-up',
  tabLabel: 'Confirmation renforcée',
} as const;

const recordStepUpFailure = async (
  userId: string,
  reason: string,
): Promise<void> => {
  await createAuditLogWithHeaders({
    action: 'STEP_UP_FAILED',
    category: 'AUTH',
    description: 'Confirmation renforcée échouée',
    metadata: {
      ...STEP_UP_AUDIT_LOCATION,
      authenticationMethod: 'TOTP',
      reason,
    },
    targetUserId: userId,
    userId,
  });
};

const stepUpSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, 'Mot de passe actuel requis')
      .refine(isPasswordWithinBcryptLimit, 'Mot de passe trop long'),
    currentTotpCode: z
      .string()
      .trim()
      .regex(MFA_TOTP_CODE_PATTERN, "Code d'authentification invalide"),
  })
  .strict();

const rateLimitedResponse = (
  retryAfter: number,
): NextResponse<ApiErrorResponse> =>
  NextResponse.json(
    {
      error: {
        code: ErrorCode.RATE_LIMITED,
        message: `Trop de tentatives. Réessayez dans ${Math.ceil(retryAfter / 60)} minutes.`,
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
  NextResponse<ApiSuccessResponse<StepUpResponse> | ApiErrorResponse>
> {
  let authenticatedUserId: string | null = null;

  try {
    const auth = await requireAuth();
    if (!auth.success) return auth.response;
    authenticatedUserId = auth.user.id;
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
    const currentSession = auth.session;

    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.success) return parsedBody.response;
    const validation = stepUpSchema.safeParse(parsedBody.data);
    if (!validation.success) {
      return apiErrors.validation(
        'Données invalides',
        validation.error.flatten().fieldErrors,
      );
    }

    const storedUser = await prisma.user.findUnique({
      include: { totpCredential: true },
      where: { deletedAt: null, id: auth.user.id },
    });
    if (
      !storedUser ||
      !storedUser.isActive ||
      storedUser.mfaEnabledAt === null ||
      !storedUser.totpCredential ||
      storedUser.securityVersion !== currentSession.securityVersion
    ) {
      await recordStepUpFailure(auth.user.id, 'SECURITY_STATE_CHANGED');

      return NextResponse.json(
        {
          error: {
            code: ErrorCode.UNAUTHORIZED,
            message: 'La session actuelle doit être renouvelée',
          },
          success: false,
        },
        { status: 401 },
      );
    }

    const passwordRateLimitKey = `sensitive-step-up-password:${storedUser.id}`;
    const passwordLimit =
      await reserveSensitiveActionRateLimit(passwordRateLimitKey);
    if (!passwordLimit.allowed) {
      return rateLimitedResponse(passwordLimit.retryAfter ?? 1800);
    }

    const passwordValid = await verifyPassword(
      validation.data.currentPassword,
      storedUser.passwordHash,
    );
    if (!passwordValid) {
      await recordStepUpFailure(storedUser.id, 'PASSWORD_INVALID');

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
    await recordLoginAttempt(passwordRateLimitKey, true);

    const totpRateLimitKey = `sensitive-step-up-totp:${storedUser.id}`;
    const totpLimit = await reserveSensitiveActionRateLimit(totpRateLimitKey);
    if (!totpLimit.allowed) {
      return rateLimitedResponse(totpLimit.retryAfter ?? 1800);
    }

    const proof = await verifyMfaProof({
      code: validation.data.currentTotpCode,
      credential: storedUser.totpCredential,
      recoveryCodes: [],
      userId: storedUser.id,
    });
    if (!proof || proof.method !== 'TOTP') {
      await recordStepUpFailure(storedUser.id, 'TOTP_INVALID');

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

    const authenticatedAt = new Date();
    const credentialUpdatedAt = storedUser.totpCredential.updatedAt;
    await prisma.$transaction(async (transaction) => {
      const sessionUpdate = await transaction.session.updateMany({
        data: {
          lastSeenAt: authenticatedAt,
          mfaVerifiedAt: authenticatedAt,
        },
        where: {
          expiresAt: { gt: authenticatedAt },
          idleExpiresAt: { gt: authenticatedAt },
          mfaMethod: { not: null },
          securityVersion: storedUser.securityVersion,
          token: currentSession.token,
          userId: storedUser.id,
        },
      });
      if (sessionUpdate.count !== 1) throw new MfaReplayDetectedError();

      await consumeVerifiedMfaProof(transaction, {
        authenticatedAt,
        credentialUpdatedAt,
        proof,
        userId: storedUser.id,
      });

      await createAuditLogWithHeaders(
        {
          action: 'STEP_UP_SUCCESS',
          category: 'AUTH',
          description: 'Confirmation renforcée réussie',
          metadata: {
            ...STEP_UP_AUDIT_LOCATION,
            authenticationMethod: 'TOTP',
          },
          targetUserId: storedUser.id,
          userId: storedUser.id,
        },
        { client: transaction, required: true },
      );

      await transaction.rateLimit.deleteMany({
        where: { key: { in: [passwordRateLimitKey, totpRateLimitKey] } },
      });
    });

    return NextResponse.json({
      data: {
        expiresAt: new Date(
          authenticatedAt.getTime() + SENSITIVE_ACTION_PROOF_MAX_AGE_MS,
        ).toISOString(),
      },
      success: true,
    });
  } catch (error) {
    if (error instanceof MfaReplayDetectedError) {
      if (authenticatedUserId) {
        await recordStepUpFailure(authenticatedUserId, 'PROOF_REPLAYED');
      }

      return NextResponse.json(
        {
          error: {
            code: ErrorCode.CONFLICT,
            message: 'Cette preuve a expiré. Saisissez un nouveau code.',
          },
          success: false,
        },
        { status: 409 },
      );
    }

    return apiErrors.internal('AUTH_STEP_UP', error, request);
  }
}
