import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { apiErrors, parseJsonBody } from '$server/api-response';
import {
  createAuditLogWithHeaders,
  createSession,
  generateSessionToken,
  isSecurityVersionMismatchError,
  mapUserToUserType,
  setSessionTokenCookie,
} from '$server/auth';
import {
  clearMfaChallengeCookie,
  consumeVerifiedMfaProof,
  getMfaChallengeToken,
  hashMfaChallengeToken,
  InvalidMfaChallengeError,
  MfaReplayDetectedError,
  verifyMfaProof,
} from '$server/mfa';
import { prisma } from '$server/prisma';
import {
  createMfaRateLimitKeys,
  reserveMfaRateLimits,
} from '$server/rate-limiter';
import { getClientIp } from '$server/request-context';
import {
  type ApiErrorResponse,
  type ApiSuccessResponse,
  ErrorCode,
} from '$types/api.types';
import type { UserType } from '$types/auth.types';

const verifySchema = z
  .object({
    code: z.string().trim().min(1, 'Code requis').max(64, 'Code invalide'),
  })
  .strict();

type VerifyResponseData = {
  mustChangePassword: boolean;
  session: {
    expiresAt: string;
    idleExpiresAt: string;
    lastSeenAt: string;
    rememberMe: boolean;
  };
  status: 'authenticated';
  user: UserType;
};

const AUTH_AUDIT_LOCATION = {
  pageKey: 'authentication',
  pageLabel: 'Authentification',
  poleKey: 'system',
  poleLabel: 'Système',
  tabKey: 'connections',
  tabLabel: 'Connexions',
} as const;

const invalidChallengeResponse = (): NextResponse<ApiErrorResponse> =>
  NextResponse.json(
    {
      error: {
        code: ErrorCode.UNAUTHORIZED,
        message: 'Le défi de connexion a expiré. Recommencez la connexion.',
      },
      success: false,
    },
    { status: 401 },
  );

export async function POST(
  request: NextRequest,
): Promise<
  NextResponse<ApiSuccessResponse<VerifyResponseData> | ApiErrorResponse>
> {
  try {
    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.success) return parsedBody.response;
    const validation = verifySchema.safeParse(parsedBody.data);

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

    const challengeToken = await getMfaChallengeToken();
    if (!challengeToken) return invalidChallengeResponse();
    const tokenHash = hashMfaChallengeToken(challengeToken);
    const challenge = await prisma.mfaLoginChallenge.findUnique({
      include: {
        user: {
          include: {
            mfaRecoveryCodes: {
              select: { codeHash: true, id: true, salt: true },
              where: { usedAt: null },
            },
            totpCredential: true,
          },
        },
      },
      where: { tokenHash },
    });
    const now = new Date();

    if (
      !challenge ||
      challenge.purpose !== 'LOGIN' ||
      challenge.expiresAt <= now ||
      challenge.user.deletedAt !== null ||
      !challenge.user.isActive ||
      challenge.user.securityVersion !== challenge.securityVersion ||
      challenge.user.mfaEnabledAt === null ||
      !challenge.user.totpCredential ||
      !challenge.credentialUpdatedAt ||
      challenge.user.totpCredential.updatedAt.getTime() !==
        challenge.credentialUpdatedAt.getTime()
    ) {
      await clearMfaChallengeCookie();

      return invalidChallengeResponse();
    }

    const rateLimitKeys = createMfaRateLimitKeys(
      getClientIp(request.headers),
      challenge.userId,
      tokenHash,
    );
    const rateLimit = await reserveMfaRateLimits(rateLimitKeys);

    if (!rateLimit.allowed) {
      const retryAfter = rateLimit.retryAfter ?? 1800;

      return NextResponse.json(
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
    }

    const credential = challenge.user.totpCredential;
    const proof = await verifyMfaProof({
      code: validation.data.code,
      credential,
      recoveryCodes: challenge.user.mfaRecoveryCodes,
      userId: challenge.userId,
    });

    if (!proof) {
      await Promise.all([
        prisma.mfaLoginChallenge.updateMany({
          data: { attempts: { increment: 1 } },
          where: { expiresAt: { gt: now }, tokenHash },
        }),
        createAuditLogWithHeaders({
          action: 'LOGIN_FAILED',
          category: 'AUTH',
          description: 'Vérification à deux facteurs échouée',
          metadata: {
            ...AUTH_AUDIT_LOCATION,
            reason: 'MFA_INVALID',
          },
          targetUserId: challenge.userId,
          userId: null,
        }),
      ]);

      return NextResponse.json(
        {
          error: {
            code: ErrorCode.INVALID_CREDENTIALS,
            message: 'Code incorrect ou expiré',
          },
          success: false,
        },
        { status: 400 },
      );
    }

    const sessionToken = generateSessionToken();
    const mfaMethod = proof.method;
    const session = await createSession(
      sessionToken,
      challenge.userId,
      challenge.securityVersion,
      challenge.rememberMe,
      {
        action: 'LOGIN_SUCCESS',
        category: 'AUTH',
        description: `Connexion réussie: ${challenge.user.loginName}`,
        metadata: {
          ...AUTH_AUDIT_LOCATION,
          authenticationMethod:
            proof.method === 'TOTP' ? 'password_totp' : 'password_recovery',
          loginName: challenge.user.loginName,
        },
        targetUserId: challenge.userId,
        userId: challenge.userId,
      },
      {
        additionalAudits:
          proof.method === 'RECOVERY_CODE'
            ? [
                {
                  action: 'MFA_RECOVERY_CODE_USED',
                  category: 'AUTH',
                  description: 'Code de récupération MFA utilisé',
                  metadata: AUTH_AUDIT_LOCATION,
                  targetUserId: challenge.userId,
                  userId: challenge.userId,
                },
              ]
            : [],
        mfaMethod,
        precondition: async (transaction, authenticatedAt) => {
          const challengeDelete =
            await transaction.mfaLoginChallenge.deleteMany({
              where: {
                credentialUpdatedAt: challenge.credentialUpdatedAt,
                expiresAt: { gt: authenticatedAt },
                purpose: 'LOGIN',
                securityVersion: challenge.securityVersion,
                tokenHash,
                userId: challenge.userId,
              },
            });

          if (challengeDelete.count !== 1) {
            throw new InvalidMfaChallengeError();
          }

          await consumeVerifiedMfaProof(transaction, {
            authenticatedAt,
            credentialUpdatedAt: credential.updatedAt,
            proof,
            userId: challenge.userId,
          });
          await transaction.rateLimit.deleteMany({
            where: {
              key: { in: [rateLimitKeys.account, rateLimitKeys.challenge] },
            },
          });
        },
        requireMfaEnabled: true,
      },
    );

    await setSessionTokenCookie(session.token, session.expiresAt);
    await clearMfaChallengeCookie();

    const user = mapUserToUserType(challenge.user);

    return NextResponse.json({
      data: {
        mustChangePassword: user.mustChangePassword,
        session: {
          expiresAt: session.expiresAt.toISOString(),
          idleExpiresAt: session.idleExpiresAt.toISOString(),
          lastSeenAt: session.lastSeenAt.toISOString(),
          rememberMe: session.rememberMe,
        },
        status: 'authenticated',
        user,
      },
      success: true,
    });
  } catch (error) {
    if (
      error instanceof InvalidMfaChallengeError ||
      error instanceof MfaReplayDetectedError ||
      isSecurityVersionMismatchError(error)
    ) {
      await clearMfaChallengeCookie();

      return invalidChallengeResponse();
    }

    return apiErrors.internal('MFA_VERIFY', error, request);
  }
}
