import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAuth } from '$server/api-auth';
import { apiErrors, parseJsonBody } from '$server/api-response';
import {
  createAuditLogWithHeaders,
  mapUserToUserType,
  verifyPassword,
} from '$server/auth';
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
  type ApiErrorResponse,
  type ApiSuccessResponse,
  ErrorCode,
} from '$types/api.types';
import type { UserType } from '$types/auth.types';
import { isPasswordWithinBcryptLimit } from '$utils/password.utils';

type RouteParams = {
  params: Promise<{ id: string }>;
};

type ResetMfaResponse = {
  user: UserType;
};

const resetMfaSchema = z
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

const USERS_SECURITY_AUDIT_LOCATION = {
  pageKey: 'users',
  pageLabel: 'Utilisateurs & permissions',
  poleKey: 'system',
  poleLabel: 'Système',
  tabKey: 'security',
  tabLabel: 'Sécurité',
} as const;

class TargetMfaStateChangedError extends Error {
  constructor() {
    super('Target MFA state changed');
    this.name = 'TargetMfaStateChangedError';
  }
}

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
  { params }: RouteParams,
): Promise<
  NextResponse<ApiSuccessResponse<ResetMfaResponse> | ApiErrorResponse>
> {
  try {
    const { id } = await params;
    const auth = await requireAuth();
    if (!auth.success) return auth.response;

    // This is deliberately not permission-delegable: only the singleton
    // protected root may perform last-resort MFA recovery for another member.
    if (!auth.user.isProtected || auth.user.role !== 'ADMIN') {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.FORBIDDEN,
            message: 'Cette récupération est réservée au compte racine',
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
    const currentSession = auth.session;

    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.success) return parsedBody.response;
    const validation = resetMfaSchema.safeParse(parsedBody.data);
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

    const [root, target] = await Promise.all([
      prisma.user.findUnique({
        include: { totpCredential: true },
        where: { deletedAt: null, id: auth.user.id },
      }),
      prisma.user.findUnique({
        include: { totpCredential: true },
        where: { deletedAt: null, id },
      }),
    ]);

    if (
      !root ||
      !root.isProtected ||
      root.role !== 'ADMIN' ||
      !root.isActive ||
      root.mfaEnabledAt === null ||
      !root.totpCredential ||
      root.securityVersion !== currentSession.securityVersion
    ) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.UNAUTHORIZED,
            message: 'La session du compte racine doit être renouvelée',
          },
          success: false,
        },
        { status: 401 },
      );
    }

    if (!target) {
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

    if (target.isProtected || target.role !== 'USER' || target.id === root.id) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.FORBIDDEN,
            message:
              'La double authentification de ce compte ne peut pas être réinitialisée administrativement',
          },
          success: false,
        },
        { status: 403 },
      );
    }

    if (target.mfaEnabledAt === null || !target.totpCredential) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.CONFLICT,
            message: "La double authentification n'est pas activée",
          },
          success: false,
        },
        { status: 409 },
      );
    }

    const passwordRateLimitKey = `admin-mfa-reset-password:${root.id}`;
    const passwordLimit =
      await reserveSensitiveActionRateLimit(passwordRateLimitKey);
    if (!passwordLimit.allowed) {
      return rateLimitedResponse(passwordLimit.retryAfter ?? 1800);
    }

    const passwordValid = await verifyPassword(
      validation.data.currentPassword,
      root.passwordHash,
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
    await recordLoginAttempt(passwordRateLimitKey, true);

    const totpRateLimitKey = `admin-mfa-reset-totp:${root.id}`;
    const totpLimit = await reserveSensitiveActionRateLimit(totpRateLimitKey);
    if (!totpLimit.allowed) {
      return rateLimitedResponse(totpLimit.retryAfter ?? 1800);
    }

    const proof = await verifyMfaProof({
      code: validation.data.currentTotpCode,
      credential: root.totpCredential,
      recoveryCodes: [],
      userId: root.id,
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

    const targetName =
      target.firstName && target.lastName
        ? `${target.firstName} ${target.lastName}`
        : target.loginName;
    const credentialUpdatedAt = root.totpCredential.updatedAt;
    const authenticatedAt = new Date();

    const updatedUser = await prisma.$transaction(async (transaction) => {
      // Recheck and lock the exact authenticated session. A password-only or
      // concurrently revoked root session cannot authorize this operation.
      const sessionLock = await transaction.session.updateMany({
        data: { lastSeenAt: authenticatedAt },
        where: {
          expiresAt: { gt: authenticatedAt },
          idleExpiresAt: { gt: authenticatedAt },
          mfaMethod: { not: null },
          mfaVerifiedAt: { not: null },
          securityVersion: root.securityVersion,
          token: currentSession.token,
          userId: root.id,
        },
      });
      if (sessionLock.count !== 1) throw new MfaReplayDetectedError();

      // Conditional version advance serializes this reset against target-side
      // setup, disable, password and access mutations.
      const targetUpdate = await transaction.user.updateMany({
        data: {
          mfaEnabledAt: null,
          securityVersion: { increment: 1 },
        },
        where: {
          deletedAt: null,
          id: target.id,
          isProtected: false,
          mfaEnabledAt: { not: null },
          role: 'USER',
          securityVersion: target.securityVersion,
        },
      });
      if (targetUpdate.count !== 1) throw new TargetMfaStateChangedError();

      await consumeVerifiedMfaProof(transaction, {
        authenticatedAt,
        credentialUpdatedAt,
        proof,
        userId: root.id,
      });

      const credentialDelete = await transaction.totpCredential.deleteMany({
        where: { userId: target.id },
      });
      if (credentialDelete.count !== 1) {
        throw new TargetMfaStateChangedError();
      }

      await Promise.all([
        transaction.session.deleteMany({ where: { userId: target.id } }),
        transaction.mfaLoginChallenge.deleteMany({
          where: { userId: target.id },
        }),
        transaction.totpEnrollment.deleteMany({
          where: { userId: target.id },
        }),
        transaction.mfaRecoveryCode.deleteMany({
          where: { userId: target.id },
        }),
      ]);

      await createAuditLogWithHeaders(
        {
          action: 'MFA_DISABLED',
          category: 'AUTH',
          description: `Double authentification réinitialisée par le compte racine pour: ${target.loginName}`,
          metadata: {
            ...USERS_SECURITY_AUDIT_LOCATION,
            adminRecovery: true,
            authenticationMethod: 'TOTP',
            targetName,
          },
          targetUserId: target.id,
          userId: root.id,
        },
        { client: transaction, required: true },
      );

      await transaction.rateLimit.deleteMany({
        where: {
          key: { in: [passwordRateLimitKey, totpRateLimitKey] },
        },
      });

      const nextUser = await transaction.user.findUnique({
        where: { id: target.id },
      });
      if (!nextUser) throw new TargetMfaStateChangedError();

      return nextUser;
    });

    return NextResponse.json({
      data: { user: mapUserToUserType(updatedUser) },
      success: true,
    });
  } catch (error) {
    if (error instanceof TargetMfaStateChangedError) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.CONFLICT,
            message:
              'La sécurité de ce compte a changé. Rechargez la fiche avant de réessayer.',
          },
          success: false,
        },
        { status: 409 },
      );
    }

    if (error instanceof MfaReplayDetectedError) {
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

    return apiErrors.internal('USER_MFA_RESET', error, request);
  }
}
