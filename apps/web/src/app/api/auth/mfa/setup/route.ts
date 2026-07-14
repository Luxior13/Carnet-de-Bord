import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { PERMISSIONS } from '$constants/permissions.constants';
import { requireAuth, requirePermission } from '$server/api-auth';
import { apiErrors, parseJsonBody } from '$server/api-response';
import {
  createAuditLogWithHeaders,
  createSession,
  generateSessionToken,
  isSecurityVersionMismatchError,
  mapUserToUserType,
  setSessionTokenCookie,
  verifyPassword,
} from '$server/auth';
import {
  clearMfaChallengeCookie,
  consumeVerifiedMfaProof,
  createTotpProvisioningData,
  decryptTotpSecret,
  encryptTotpSecret,
  generateMfaChallengeToken,
  generateRecoveryCodes,
  generateTotpSecret,
  getMfaChallengeToken,
  hashMfaChallengeToken,
  InvalidMfaChallengeError,
  MFA_ENROLLMENT_DURATION_MS,
  MfaReplayDetectedError,
  setMfaChallengeCookie,
  verifyMfaProof,
  verifyTotpCode,
} from '$server/mfa';
import { prisma } from '$server/prisma';
import {
  createMfaRateLimitKeys,
  recordLoginAttempt,
  reserveMfaRateLimits,
  reserveSensitiveActionRateLimit,
} from '$server/rate-limiter';
import { getClientIp } from '$server/request-context';
import {
  type ApiErrorResponse,
  type ApiSuccessResponse,
  ErrorCode,
} from '$types/api.types';
import type { UserType } from '$types/auth.types';
import { isPasswordWithinBcryptLimit } from '$utils/password.utils';

const startSetupSchema = z
  .object({
    currentCode: z.string().trim().min(1).max(64).optional(),
    currentPassword: z
      .string()
      .refine(isPasswordWithinBcryptLimit, 'Mot de passe trop long')
      .optional(),
  })
  .strict();

const confirmSetupSchema = z
  .object({
    code: z
      .string()
      .trim()
      .regex(/^\d{6}$/, 'Code à six chiffres requis'),
  })
  .strict();

type SetupStartResponse = {
  expiresAt: string;
  manualKey: string;
  qrCodeDataUrl: string;
  replacing: boolean;
};

type SetupConfirmationResponse = {
  mustChangePassword: boolean;
  recoveryCodes: string[];
  session: {
    expiresAt: string;
    idleExpiresAt: string;
    lastSeenAt: string;
    rememberMe: boolean;
  };
  status: 'authenticated';
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

const invalidChallengeResponse = (): NextResponse<ApiErrorResponse> =>
  NextResponse.json(
    {
      error: {
        code: ErrorCode.UNAUTHORIZED,
        message: 'Le défi de configuration a expiré. Recommencez.',
      },
      success: false,
    },
    { status: 401 },
  );

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
  NextResponse<ApiSuccessResponse<SetupStartResponse> | ApiErrorResponse>
> {
  try {
    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.success) return parsedBody.response;
    const validation = startSetupSchema.safeParse(parsedBody.data);

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

    const now = new Date();
    const existingChallengeToken = await getMfaChallengeToken();
    const existingTokenHash = existingChallengeToken
      ? hashMfaChallengeToken(existingChallengeToken)
      : null;
    const bootstrapChallenge = existingTokenHash
      ? await prisma.mfaLoginChallenge.findUnique({
          include: { user: { include: { totpCredential: true } } },
          where: { tokenHash: existingTokenHash },
        })
      : null;
    const isValidRootBootstrap = Boolean(
      bootstrapChallenge &&
      bootstrapChallenge.purpose === 'SETUP' &&
      bootstrapChallenge.expiresAt > now &&
      bootstrapChallenge.user.isProtected &&
      bootstrapChallenge.user.isActive &&
      bootstrapChallenge.user.deletedAt === null &&
      bootstrapChallenge.user.securityVersion ===
        bootstrapChallenge.securityVersion &&
      bootstrapChallenge.user.mfaEnabledAt === null &&
      bootstrapChallenge.user.totpCredential === null,
    );

    let userId: string;
    let loginName: string;
    let securityVersion: number;
    let rememberMe: boolean;
    let replacing: boolean;
    let challengeToken: string;
    let challengeTokenHash: string;
    let credentialUpdatedAt: Date | null;
    let proof: Awaited<ReturnType<typeof verifyMfaProof>> | null | undefined;

    if (isValidRootBootstrap && bootstrapChallenge && existingChallengeToken) {
      userId = bootstrapChallenge.userId;
      loginName = bootstrapChallenge.user.loginName;
      securityVersion = bootstrapChallenge.securityVersion;
      rememberMe = false;
      replacing = bootstrapChallenge.user.totpCredential !== null;
      challengeToken = existingChallengeToken;
      challengeTokenHash = existingTokenHash ?? '';
      credentialUpdatedAt =
        bootstrapChallenge.user.totpCredential?.updatedAt ?? null;
    } else {
      const auth = await requireAuth();
      if (!auth.success) return auth.response;
      if (!auth.session) return invalidChallengeResponse();
      const permission = requirePermission(
        auth.user,
        PERMISSIONS.ACCOUNT.MANAGE_MFA,
      );
      if (!permission.success) return permission.response;

      if (!validation.data.currentPassword) {
        return NextResponse.json(
          {
            error: {
              code: ErrorCode.VALIDATION_ERROR,
              message: 'Le mot de passe actuel est requis',
            },
            success: false,
          },
          { status: 400 },
        );
      }

      const reauthKey = `account-reauth:${auth.user.id}`;
      const passwordLimit = await reserveSensitiveActionRateLimit(reauthKey);
      if (!passwordLimit.allowed) {
        return rateLimitedResponse(passwordLimit.retryAfter ?? 1800);
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

      if (!storedUser) return invalidChallengeResponse();
      const hasEnabledMfa = storedUser.mfaEnabledAt !== null;
      const hasTotpCredential = storedUser.totpCredential !== null;
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

      if (hasEnabledMfa) {
        if (!storedUser.totpCredential || !validation.data.currentCode) {
          return NextResponse.json(
            {
              error: {
                code: ErrorCode.VALIDATION_ERROR,
                message: 'Le code actuel est requis',
              },
              success: false,
            },
            { status: 400 },
          );
        }

        const mfaManageKey = `account-mfa-manage:${storedUser.id}`;
        const mfaLimit = await reserveSensitiveActionRateLimit(mfaManageKey);
        if (!mfaLimit.allowed) {
          return rateLimitedResponse(mfaLimit.retryAfter ?? 1800);
        }
        proof = await verifyMfaProof({
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
      }

      userId = storedUser.id;
      loginName = storedUser.loginName;
      securityVersion = storedUser.securityVersion;
      rememberMe = auth.session.rememberMe;
      replacing = storedUser.totpCredential !== null;
      credentialUpdatedAt = storedUser.totpCredential?.updatedAt ?? null;
      challengeToken = generateMfaChallengeToken();
      challengeTokenHash = hashMfaChallengeToken(challengeToken);
    }

    const secret = generateTotpSecret();
    const encryptedSecret = encryptTotpSecret(secret, userId);
    let expiresAt = new Date(Date.now() + MFA_ENROLLMENT_DURATION_MS);
    const provisioning = await createTotpProvisioningData(secret, loginName);

    await prisma.$transaction(async (transaction) => {
      const lockedUsers = await transaction.$queryRaw<{ id: string }[]>`
        SELECT "id"
        FROM "User"
        WHERE "id" = ${userId}
          AND "deletedAt" IS NULL
          AND "isActive" = TRUE
          AND "securityVersion" = ${securityVersion}
        FOR UPDATE
      `;
      if (lockedUsers.length !== 1) throw new InvalidMfaChallengeError();
      const lockedAt = new Date();
      expiresAt = new Date(lockedAt.getTime() + MFA_ENROLLMENT_DURATION_MS);

      const lockedUser = await transaction.user.findUnique({
        select: {
          deletedAt: true,
          isActive: true,
          isProtected: true,
          mfaEnabledAt: true,
          securityVersion: true,
          totpCredential: { select: { updatedAt: true } },
        },
        where: { id: userId },
      });
      if (
        !lockedUser ||
        lockedUser.deletedAt !== null ||
        !lockedUser.isActive ||
        lockedUser.securityVersion !== securityVersion
      ) {
        throw new InvalidMfaChallengeError();
      }

      if (isValidRootBootstrap) {
        const lockedChallenge = await transaction.mfaLoginChallenge.findUnique({
          select: {
            expiresAt: true,
            purpose: true,
            securityVersion: true,
            userId: true,
          },
          where: { tokenHash: challengeTokenHash },
        });
        if (
          !lockedUser.isProtected ||
          lockedUser.mfaEnabledAt !== null ||
          lockedUser.totpCredential !== null ||
          !lockedChallenge ||
          lockedChallenge.userId !== userId ||
          lockedChallenge.purpose !== 'SETUP' ||
          lockedChallenge.expiresAt <= lockedAt ||
          lockedChallenge.securityVersion !== securityVersion
        ) {
          throw new InvalidMfaChallengeError();
        }
      } else {
        const currentCredentialUpdatedAt =
          lockedUser.totpCredential?.updatedAt ?? null;
        if (
          (credentialUpdatedAt === null &&
            (lockedUser.mfaEnabledAt !== null ||
              currentCredentialUpdatedAt !== null)) ||
          (credentialUpdatedAt !== null &&
            (lockedUser.mfaEnabledAt === null ||
              currentCredentialUpdatedAt?.getTime() !==
                credentialUpdatedAt.getTime()))
        ) {
          throw new InvalidMfaChallengeError();
        }
      }

      if (proof && credentialUpdatedAt) {
        await consumeVerifiedMfaProof(transaction, {
          authenticatedAt: lockedAt,
          credentialUpdatedAt,
          proof,
          userId,
        });
        if (proof.method === 'TOTP') credentialUpdatedAt = lockedAt;
        if (proof.method === 'RECOVERY_CODE') {
          await createAuditLogWithHeaders(
            {
              action: 'MFA_RECOVERY_CODE_USED',
              category: 'AUTH',
              description: 'Code de récupération MFA utilisé',
              metadata: SECURITY_AUDIT_LOCATION,
              targetUserId: userId,
              userId,
            },
            { client: transaction, required: true },
          );
        }
      }

      await transaction.totpEnrollment.upsert({
        create: { ...encryptedSecret, expiresAt, userId },
        update: { ...encryptedSecret, expiresAt },
        where: { userId },
      });
      await transaction.mfaLoginChallenge.upsert({
        create: {
          credentialUpdatedAt,
          expiresAt,
          purpose: 'SETUP',
          rememberMe,
          securityVersion,
          tokenHash: challengeTokenHash,
          userId,
        },
        update: {
          attempts: 0,
          credentialUpdatedAt,
          expiresAt,
          purpose: 'SETUP',
          rememberMe,
          securityVersion,
          tokenHash: challengeTokenHash,
        },
        where: { userId },
      });
    });

    await setMfaChallengeCookie(challengeToken, expiresAt);

    return NextResponse.json({
      data: {
        expiresAt: expiresAt.toISOString(),
        ...provisioning,
        replacing,
      },
      success: true,
    });
  } catch (error) {
    if (
      error instanceof InvalidMfaChallengeError ||
      error instanceof MfaReplayDetectedError
    ) {
      await clearMfaChallengeCookie();

      return invalidChallengeResponse();
    }

    return apiErrors.internal('MFA_SETUP_START', error, request);
  }
}

export async function PUT(
  request: NextRequest,
): Promise<
  NextResponse<ApiSuccessResponse<SetupConfirmationResponse> | ApiErrorResponse>
> {
  try {
    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.success) return parsedBody.response;
    const validation = confirmSetupSchema.safeParse(parsedBody.data);

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
          include: { totpCredential: true, totpEnrollment: true },
        },
      },
      where: { tokenHash },
    });
    const now = new Date();

    if (
      !challenge ||
      challenge.purpose !== 'SETUP' ||
      challenge.expiresAt <= now ||
      challenge.user.deletedAt !== null ||
      !challenge.user.isActive ||
      challenge.user.securityVersion !== challenge.securityVersion ||
      !challenge.user.totpEnrollment ||
      challenge.user.totpEnrollment.expiresAt <= now
    ) {
      await clearMfaChallengeCookie();

      return invalidChallengeResponse();
    }

    const isRootBootstrap =
      challenge.user.isProtected &&
      challenge.user.mfaEnabledAt === null &&
      challenge.user.totpCredential === null &&
      challenge.credentialUpdatedAt === null;
    let sourceSessionToken: string | undefined;

    if (!isRootBootstrap) {
      const auth = await requireAuth();
      if (!auth.success) return auth.response;
      const permission = requirePermission(
        auth.user,
        PERMISSIONS.ACCOUNT.MANAGE_MFA,
      );
      if (!permission.success) return permission.response;
      if (
        !auth.session ||
        auth.user.id !== challenge.userId ||
        auth.session.securityVersion !== challenge.securityVersion
      ) {
        await clearMfaChallengeCookie();

        return invalidChallengeResponse();
      }
      sourceSessionToken = auth.session.token;
    }

    const rateLimitKeys = createMfaRateLimitKeys(
      getClientIp(request.headers),
      challenge.userId,
      tokenHash,
    );
    const rateLimit = await reserveMfaRateLimits(rateLimitKeys);
    if (!rateLimit.allowed) {
      return rateLimitedResponse(rateLimit.retryAfter ?? 1800);
    }

    const enrollment = challenge.user.totpEnrollment;
    const timeStep = await verifyTotpCode(
      decryptTotpSecret(enrollment, challenge.userId),
      validation.data.code,
    );

    if (timeStep === null) {
      await prisma.mfaLoginChallenge.updateMany({
        data: { attempts: { increment: 1 } },
        where: { expiresAt: { gt: now }, tokenHash },
      });

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

    const replacing = challenge.user.totpCredential !== null;
    const recoveryCodes = generateRecoveryCodes(challenge.userId);
    const sessionToken = generateSessionToken();
    const loginAudit = isRootBootstrap
      ? {
          action: 'LOGIN_SUCCESS' as const,
          category: 'AUTH' as const,
          description: `Connexion réussie: ${challenge.user.loginName}`,
          metadata: {
            authenticationMethod: 'password_totp_setup',
            pageKey: 'authentication',
            pageLabel: 'Authentification',
            poleKey: 'system',
            poleLabel: 'Système',
            tabKey: 'connections',
            tabLabel: 'Connexions',
          },
          targetUserId: challenge.userId,
          userId: challenge.userId,
        }
      : undefined;
    const session = await createSession(
      sessionToken,
      challenge.userId,
      challenge.securityVersion,
      challenge.rememberMe,
      loginAudit,
      {
        additionalAudits: [
          {
            action: 'MFA_ENABLED',
            category: 'AUTH',
            description: replacing
              ? 'Application d’authentification remplacée'
              : 'Double authentification activée',
            metadata: {
              ...SECURITY_AUDIT_LOCATION,
              recoveryCodesGenerated: recoveryCodes.length,
              replacing,
            },
            targetUserId: challenge.userId,
            userId: challenge.userId,
          },
        ],
        advanceSecurityVersion: true,
        mfaMethod: 'TOTP',
        precondition: async (transaction, authenticatedAt) => {
          const challengeDelete =
            await transaction.mfaLoginChallenge.deleteMany({
              where: {
                expiresAt: { gt: authenticatedAt },
                purpose: 'SETUP',
                securityVersion: challenge.securityVersion,
                tokenHash,
                userId: challenge.userId,
              },
            });
          if (challengeDelete.count !== 1) {
            throw new InvalidMfaChallengeError();
          }

          if (challenge.credentialUpdatedAt) {
            const currentCredential = await transaction.totpCredential.count({
              where: {
                updatedAt: challenge.credentialUpdatedAt,
                userId: challenge.userId,
              },
            });
            if (currentCredential !== 1) {
              throw new InvalidMfaChallengeError();
            }
          }

          const enrollmentDelete = await transaction.totpEnrollment.deleteMany({
            where: {
              expiresAt: { gt: authenticatedAt },
              updatedAt: enrollment.updatedAt,
              userId: challenge.userId,
            },
          });
          if (enrollmentDelete.count !== 1) {
            throw new InvalidMfaChallengeError();
          }

          await transaction.totpCredential.upsert({
            create: {
              lastUsedAt: authenticatedAt,
              lastUsedTimeStep: timeStep,
              secretAuthTag: enrollment.secretAuthTag,
              secretCiphertext: enrollment.secretCiphertext,
              secretIv: enrollment.secretIv,
              secretKeyVersion: enrollment.secretKeyVersion,
              userId: challenge.userId,
            },
            update: {
              lastUsedAt: authenticatedAt,
              lastUsedTimeStep: timeStep,
              secretAuthTag: enrollment.secretAuthTag,
              secretCiphertext: enrollment.secretCiphertext,
              secretIv: enrollment.secretIv,
              secretKeyVersion: enrollment.secretKeyVersion,
            },
            where: { userId: challenge.userId },
          });
          await transaction.user.update({
            data: { mfaEnabledAt: authenticatedAt },
            where: { id: challenge.userId },
          });
          await transaction.mfaRecoveryCode.deleteMany({
            where: { userId: challenge.userId },
          });
          await transaction.mfaRecoveryCode.createMany({
            data: recoveryCodes.map((recoveryCode) => ({
              codeHash: recoveryCode.codeHash,
              salt: recoveryCode.salt,
              userId: challenge.userId,
            })),
          });
          await transaction.rateLimit.deleteMany({
            where: {
              key: { in: [rateLimitKeys.account, rateLimitKeys.challenge] },
            },
          });
        },
        revokeExistingSessions: true,
        ...(sourceSessionToken ? { sourceSessionToken } : {}),
      },
    );

    await setSessionTokenCookie(session.token, session.expiresAt);
    await clearMfaChallengeCookie();
    const updatedUser = await prisma.user.findUnique({
      where: { id: challenge.userId },
    });
    if (!updatedUser) throw new InvalidMfaChallengeError();
    const user = mapUserToUserType(updatedUser);

    return NextResponse.json({
      data: {
        mustChangePassword: user.mustChangePassword,
        recoveryCodes: recoveryCodes.map(
          (recoveryCode) => recoveryCode.plaintext,
        ),
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

    return apiErrors.internal('MFA_SETUP_CONFIRM', error, request);
  }
}
