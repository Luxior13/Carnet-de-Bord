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
import {
  getElevatedMfaProofExpiration,
  getPasswordReauthenticationExpiration,
  requireRecentPasswordReauthentication,
} from '$server/sensitive-action';
import {
  type ApiErrorResponse,
  type ApiSuccessResponse,
  ErrorCode,
} from '$types/api.types';
import type { SessionType } from '$types/auth.types';
import { isPasswordWithinBcryptLimit } from '$utils/password.utils';

type StepUpKind = 'critical-mfa' | 'full' | 'password';

type StepUpStatus = {
  criticalMfaExpiresAt: string | null;
  passwordExpiresAt: string | null;
};

type StepUpResponse = StepUpStatus & {
  expiresAt: string;
  kind: StepUpKind;
};

class StepUpSessionChangedError extends Error {
  constructor() {
    super('The authenticated session changed during step-up');
    this.name = 'StepUpSessionChangedError';
  }
}

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
  proofKind: StepUpKind,
): Promise<void> => {
  await createAuditLogWithHeaders({
    action: 'STEP_UP_FAILED',
    category: 'AUTH',
    description: 'Confirmation renforcée échouée',
    metadata: {
      ...STEP_UP_AUDIT_LOCATION,
      proofKind,
      reason,
    },
    targetUserId: userId,
    userId,
  });
};

const currentPasswordSchema = z
  .string()
  .min(1, 'Mot de passe actuel requis')
  .refine(isPasswordWithinBcryptLimit, 'Mot de passe trop long');
const currentTotpCodeSchema = z
  .string()
  .trim()
  .regex(MFA_TOTP_CODE_PATTERN, "Code d'authentification invalide");

const stepUpSchema = z.union([
  z
    .object({
      currentPassword: currentPasswordSchema,
      kind: z.literal('password'),
    })
    .strict(),
  z
    .object({
      currentTotpCode: currentTotpCodeSchema,
      kind: z.literal('critical-mfa'),
    })
    .strict(),
  z
    .object({
      currentPassword: currentPasswordSchema,
      currentTotpCode: currentTotpCodeSchema,
      kind: z.literal('full').optional(),
    })
    .strict()
    .transform((value) => ({ ...value, kind: 'full' as const })),
]);

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

const getStepUpStatus = (
  session: SessionType | null,
  now = new Date(),
): StepUpStatus => ({
  criticalMfaExpiresAt:
    getElevatedMfaProofExpiration(session, now)?.toISOString() ?? null,
  passwordExpiresAt:
    getPasswordReauthenticationExpiration(session, now)?.toISOString() ?? null,
});

export async function GET(): Promise<
  NextResponse<ApiSuccessResponse<StepUpStatus> | ApiErrorResponse>
> {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth.response;

    return NextResponse.json({
      data: getStepUpStatus(auth.session),
      success: true,
    });
  } catch (error) {
    return apiErrors.internal('AUTH_STEP_UP_STATUS', error);
  }
}

export async function DELETE(): Promise<
  NextResponse<ApiSuccessResponse<StepUpStatus> | ApiErrorResponse>
> {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth.response;
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

    const lockedAt = new Date();
    const update = await prisma.session.updateMany({
      data: {
        criticalMfaVerifiedAt: null,
        passwordReauthenticatedAt: null,
      },
      where: {
        expiresAt: { gt: lockedAt },
        idleExpiresAt: { gt: lockedAt },
        securityVersion: auth.session.securityVersion,
        token: auth.session.token,
        userId: auth.user.id,
      },
    });

    if (update.count !== 1) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.CONFLICT,
            message: 'La session a changé. Rechargez la page.',
          },
          success: false,
        },
        { status: 409 },
      );
    }

    return NextResponse.json({
      data: { criticalMfaExpiresAt: null, passwordExpiresAt: null },
      success: true,
    });
  } catch (error) {
    return apiErrors.internal('AUTH_STEP_UP_LOCK', error);
  }
}

export async function POST(
  request: NextRequest,
): Promise<
  NextResponse<ApiSuccessResponse<StepUpResponse> | ApiErrorResponse>
> {
  let authenticatedUserId: string | null = null;
  let requestedKind: StepUpKind = 'full';

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
    requestedKind = validation.data.kind;

    if (requestedKind === 'critical-mfa') {
      const passwordProof =
        requireRecentPasswordReauthentication(currentSession);
      if (!passwordProof.success) return passwordProof.response;
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
      await recordStepUpFailure(
        auth.user.id,
        'SECURITY_STATE_CHANGED',
        requestedKind,
      );

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

    const verifiesPassword = requestedKind !== 'critical-mfa';
    const verifiesTotp = requestedKind !== 'password';
    const totpCredential = storedUser.totpCredential;
    const rateLimitKeys: string[] = [];

    if (verifiesPassword) {
      const passwordRateLimitKey = `sensitive-step-up-password:${storedUser.id}`;
      rateLimitKeys.push(passwordRateLimitKey);
      const passwordLimit =
        await reserveSensitiveActionRateLimit(passwordRateLimitKey);
      if (!passwordLimit.allowed) {
        return rateLimitedResponse(passwordLimit.retryAfter ?? 1800);
      }

      const currentPassword =
        'currentPassword' in validation.data
          ? validation.data.currentPassword
          : '';
      const passwordValid = await verifyPassword(
        currentPassword,
        storedUser.passwordHash,
      );
      if (!passwordValid) {
        await recordStepUpFailure(
          storedUser.id,
          'PASSWORD_INVALID',
          requestedKind,
        );

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
    }

    let verifiedMfaProof: Awaited<ReturnType<typeof verifyMfaProof>> = null;
    if (verifiesTotp) {
      const totpRateLimitKey = `sensitive-step-up-totp:${storedUser.id}`;
      rateLimitKeys.push(totpRateLimitKey);
      const totpLimit = await reserveSensitiveActionRateLimit(totpRateLimitKey);
      if (!totpLimit.allowed) {
        return rateLimitedResponse(totpLimit.retryAfter ?? 1800);
      }

      const currentTotpCode =
        'currentTotpCode' in validation.data
          ? validation.data.currentTotpCode
          : '';
      verifiedMfaProof = await verifyMfaProof({
        code: currentTotpCode,
        credential: totpCredential,
        recoveryCodes: [],
        userId: storedUser.id,
      });
      if (!verifiedMfaProof || verifiedMfaProof.method !== 'TOTP') {
        await recordStepUpFailure(storedUser.id, 'TOTP_INVALID', requestedKind);

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
    }

    const authenticatedAt = new Date();
    const sessionProofData: {
      criticalMfaVerifiedAt?: Date;
      lastSeenAt: Date;
      passwordReauthenticatedAt?: Date;
    } = { lastSeenAt: authenticatedAt };
    if (verifiesPassword) {
      sessionProofData.passwordReauthenticatedAt = authenticatedAt;
    }
    if (verifiesTotp) {
      sessionProofData.criticalMfaVerifiedAt = authenticatedAt;
    }

    await prisma.$transaction(async (transaction) => {
      const sessionUpdate = await transaction.session.updateMany({
        data: sessionProofData,
        where: {
          expiresAt: { gt: authenticatedAt },
          idleExpiresAt: { gt: authenticatedAt },
          securityVersion: storedUser.securityVersion,
          token: currentSession.token,
          userId: storedUser.id,
        },
      });
      if (sessionUpdate.count !== 1) throw new StepUpSessionChangedError();

      if (verifiedMfaProof) {
        await consumeVerifiedMfaProof(transaction, {
          authenticatedAt,
          credentialUpdatedAt: totpCredential.updatedAt,
          proof: verifiedMfaProof,
          userId: storedUser.id,
        });
      }

      await createAuditLogWithHeaders(
        {
          action: 'STEP_UP_SUCCESS',
          category: 'AUTH',
          description: 'Confirmation renforcée réussie',
          metadata: {
            ...STEP_UP_AUDIT_LOCATION,
            authenticationMethod:
              requestedKind === 'password'
                ? 'PASSWORD'
                : requestedKind === 'critical-mfa'
                  ? 'TOTP'
                  : 'PASSWORD_TOTP',
            proofKind: requestedKind,
          },
          targetUserId: storedUser.id,
          userId: storedUser.id,
        },
        { client: transaction, required: true },
      );

      await transaction.rateLimit.deleteMany({
        where: { key: { in: rateLimitKeys } },
      });
    });

    const updatedSession: SessionType = {
      ...currentSession,
      criticalMfaVerifiedAt: verifiesTotp
        ? authenticatedAt
        : currentSession.criticalMfaVerifiedAt,
      passwordReauthenticatedAt: verifiesPassword
        ? authenticatedAt
        : currentSession.passwordReauthenticatedAt,
    };
    const status = getStepUpStatus(updatedSession, authenticatedAt);
    const expiresAt =
      requestedKind === 'password'
        ? status.passwordExpiresAt
        : status.criticalMfaExpiresAt;

    if (!expiresAt) throw new StepUpSessionChangedError();

    return NextResponse.json({
      data: { ...status, expiresAt, kind: requestedKind },
      success: true,
    });
  } catch (error) {
    if (error instanceof MfaReplayDetectedError) {
      if (authenticatedUserId) {
        await recordStepUpFailure(
          authenticatedUserId,
          'PROOF_REPLAYED',
          requestedKind,
        );
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

    if (error instanceof StepUpSessionChangedError) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.CONFLICT,
            message: 'La session a changé. Rechargez la page.',
          },
          success: false,
        },
        { status: 409 },
      );
    }

    return apiErrors.internal('AUTH_STEP_UP', error, request);
  }
}
