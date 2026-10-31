import 'server-only';

import type { Prisma } from '@prisma/client';

import { PERMISSIONS } from '$constants/permissions.constants';
import { createAuditLogWithHeaders } from '$server/audit-log';
import {
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
  setMfaChallengeCookie,
  verifyMfaProof,
  verifyTotpCode,
} from '$server/mfa';
import { verifyPassword } from '$server/password';
import { prisma } from '$server/prisma';
import {
  clearRateLimit,
  createMfaRateLimitKeys,
  reserveMfaRateLimits,
  reserveSensitiveActionRateLimit,
} from '$server/rate-limiter';
import { serviceErrors } from '$server/service-error';
import {
  createSession,
  generateSessionToken,
  setSessionTokenCookie,
} from '$server/session';
import {
  authorizeUserAction,
  type UserActionAuthority,
} from '$server/user-action-authorization';
import { mapUserToUserType } from '$server/user-projection';
import type { SessionType, UserType } from '$types/auth.types';

export const MFA_SETUP_INVALID_CHALLENGE_MESSAGE =
  'Le défi de configuration a expiré. Recommencez.';

const SECURITY_AUDIT_LOCATION = {
  pageKey: 'account',
  pageLabel: 'Mon compte',
  poleKey: 'account',
  poleLabel: 'Espace personnel',
  tabKey: 'security',
  tabLabel: 'Sécurité',
} as const;

export type MfaSetupStart = {
  expiresAt: string;
  manualKey: string;
  qrCodeDataUrl: string;
  replacing: boolean;
};

export type MfaSetupConfirmation = {
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

type MandatorySetup = {
  challengeToken: string;
  challengeTokenHash: string;
  credentialUpdatedAt: Date | null;
  loginName: string;
  rememberMe: boolean;
  replacing: boolean;
  securityVersion: number;
  userId: string;
};

/**
 * A mandatory first enrollment carries its own SETUP challenge from the login
 * step; every other setup belongs to an authenticated session.
 */
export const findMandatorySetup = async (): Promise<MandatorySetup | null> => {
  const now = new Date();
  const challengeToken = await getMfaChallengeToken();
  if (!challengeToken) return null;
  const challengeTokenHash = hashMfaChallengeToken(challengeToken);
  const challenge = await prisma.mfaLoginChallenge.findUnique({
    include: { user: { include: { totpCredential: true } } },
    where: { tokenHash: challengeTokenHash },
  });
  if (
    !challenge ||
    challenge.purpose !== 'SETUP' ||
    challenge.expiresAt <= now ||
    !challenge.user.isActive ||
    challenge.user.deletedAt !== null ||
    challenge.user.securityVersion !== challenge.securityVersion ||
    challenge.user.mfaEnabledAt !== null ||
    challenge.user.totpCredential !== null
  ) {
    return null;
  }

  return {
    challengeToken,
    challengeTokenHash,
    credentialUpdatedAt: null,
    loginName: challenge.user.loginName,
    rememberMe: challenge.rememberMe,
    replacing: false,
    securityVersion: challenge.securityVersion,
    userId: challenge.userId,
  };
};

type AuthenticatedSetup = {
  proof: Awaited<ReturnType<typeof verifyMfaProof>>;
  setup: MandatorySetup;
};

/**
 * Re-proves an authenticated account before it may start a (re)enrollment:
 * current password always, and the current code when MFA is already active.
 */
const proveAuthenticatedSetup = async (
  actor: { session: SessionType; userId: string },
  proofs: { currentCode?: string; currentPassword?: string },
): Promise<AuthenticatedSetup> => {
  if (!proofs.currentPassword)
    throw serviceErrors.validation('Le mot de passe actuel est requis');

  const reauthKey = `account-reauth:${actor.userId}`;
  const passwordLimit = await reserveSensitiveActionRateLimit(reauthKey, {
    actorUserId: actor.userId,
    proof: 'password',
    step: 'mfa_manage',
    targetUserId: actor.userId,
  });
  if (!passwordLimit.allowed)
    throw serviceErrors.rateLimited(passwordLimit.retryAfter);

  const storedUser = await prisma.user.findUnique({
    include: {
      mfaRecoveryCodes: {
        select: { codeHash: true, id: true, salt: true },
        where: { usedAt: null },
      },
      totpCredential: true,
    },
    where: { deletedAt: null, id: actor.userId },
  });
  if (!storedUser) throw new InvalidMfaChallengeError();
  const hasEnabledMfa = storedUser.mfaEnabledAt !== null;
  if (hasEnabledMfa !== (storedUser.totpCredential !== null)) {
    throw serviceErrors.conflict(
      'La configuration de double authentification est incohérente',
    );
  }
  if (!(await verifyPassword(proofs.currentPassword, storedUser.passwordHash)))
    throw serviceErrors.invalidCredentials('Mot de passe actuel incorrect');
  await clearRateLimit(reauthKey);

  let proof: AuthenticatedSetup['proof'] = null;
  if (hasEnabledMfa) {
    if (!storedUser.totpCredential || !proofs.currentCode)
      throw serviceErrors.validation('Le code actuel est requis');

    const mfaManageKey = `account-mfa-manage:${storedUser.id}`;
    const mfaLimit = await reserveSensitiveActionRateLimit(mfaManageKey, {
      actorUserId: storedUser.id,
      proof: 'code',
      step: 'mfa_manage',
      targetUserId: storedUser.id,
    });
    if (!mfaLimit.allowed) throw serviceErrors.rateLimited(mfaLimit.retryAfter);
    proof = await verifyMfaProof({
      code: proofs.currentCode,
      credential: storedUser.totpCredential,
      recoveryCodes: storedUser.mfaRecoveryCodes,
      userId: storedUser.id,
    });
    if (!proof)
      throw serviceErrors.invalidCredentials('Code actuel incorrect ou expiré');
    await clearRateLimit(mfaManageKey);
  }

  const challengeToken = generateMfaChallengeToken();

  return {
    proof,
    setup: {
      challengeToken,
      challengeTokenHash: hashMfaChallengeToken(challengeToken),
      credentialUpdatedAt: storedUser.totpCredential?.updatedAt ?? null,
      loginName: storedUser.loginName,
      rememberMe: actor.session.rememberMe,
      replacing: storedUser.totpCredential !== null,
      securityVersion: storedUser.securityVersion,
      userId: storedUser.id,
    },
  };
};

/**
 * Starts an enrollment: a fresh TOTP secret, its encrypted enrollment and the
 * SETUP challenge, written under the user row lock after re-checking the
 * state the proofs were made against.
 */
export const startMfaSetup = async (
  source:
    | { kind: 'mandatory'; setup: MandatorySetup }
    | {
        kind: 'authenticated';
        proofs: { currentCode?: string; currentPassword?: string };
        session: SessionType;
        userId: string;
      },
): Promise<MfaSetupStart> => {
  const isMandatory = source.kind === 'mandatory';
  let setup: MandatorySetup;
  let proof: AuthenticatedSetup['proof'] = null;
  let authority: UserActionAuthority | undefined;
  if (source.kind === 'mandatory') {
    setup = source.setup;
  } else {
    ({ proof, setup } = await proveAuthenticatedSetup(source, source.proofs));
    authority = { actorId: source.userId, session: source.session };
  }
  const { challengeTokenHash, rememberMe, securityVersion, userId } = setup;
  let credentialUpdatedAt = setup.credentialUpdatedAt;

  const secret = generateTotpSecret();
  const encryptedSecret = encryptTotpSecret(secret, userId);
  let expiresAt = new Date(Date.now() + MFA_ENROLLMENT_DURATION_MS);
  const provisioning = await createTotpProvisioningData(
    secret,
    setup.loginName,
  );

  await prisma.$transaction(async (transaction) => {
    if (authority)
      await authorizeUserAction(
        transaction,
        authority,
        PERMISSIONS.ACCOUNT.MANAGE_MFA,
      );
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

    if (isMandatory) {
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

  await setMfaChallengeCookie(setup.challengeToken, expiresAt);

  return {
    expiresAt: expiresAt.toISOString(),
    ...provisioning,
    replacing: setup.replacing,
  };
};

const SETUP_CHALLENGE_INCLUDE = {
  user: { include: { totpCredential: true, totpEnrollment: true } },
} as const satisfies Prisma.MfaLoginChallengeInclude;

export type SetupChallenge = {
  challenge: Prisma.MfaLoginChallengeGetPayload<{
    include: typeof SETUP_CHALLENGE_INCLUDE;
  }>;
  isMandatoryBootstrap: boolean;
  tokenHash: string;
};

/** The pending SETUP challenge with its enrollment, or null when unusable. */
export const loadSetupChallenge = async (): Promise<SetupChallenge | null> => {
  const challengeToken = await getMfaChallengeToken();
  if (!challengeToken) return null;
  const tokenHash = hashMfaChallengeToken(challengeToken);
  const challenge = await prisma.mfaLoginChallenge.findUnique({
    include: SETUP_CHALLENGE_INCLUDE,
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
    return null;
  }

  return {
    challenge,
    isMandatoryBootstrap:
      challenge.user.mfaEnabledAt === null &&
      challenge.user.totpCredential === null &&
      challenge.credentialUpdatedAt === null,
    tokenHash,
  };
};

/**
 * Confirms an enrollment with a first code: the credential replaces any
 * previous one, recovery codes are regenerated, every session is revoked and
 * a new one is issued, all in the session transaction.
 */
export const confirmMfaSetup = async (
  { challenge, isMandatoryBootstrap, tokenHash }: SetupChallenge,
  code: string,
  context: { clientIp: string | null; sourceSessionToken?: string },
): Promise<MfaSetupConfirmation> => {
  const rateLimitKeys = createMfaRateLimitKeys(
    context.clientIp,
    challenge.userId,
    tokenHash,
  );
  const rateLimit = await reserveMfaRateLimits(rateLimitKeys, {
    // The mandatory enrollment happens before any session exists.
    actorUserId: isMandatoryBootstrap ? null : challenge.userId,
    proof: 'code',
    step: 'mfa_setup',
    targetUserId: challenge.userId,
  });
  if (!rateLimit.allowed) throw serviceErrors.rateLimited(rateLimit.retryAfter);

  const enrollment = challenge.user.totpEnrollment;
  if (!enrollment) throw new InvalidMfaChallengeError();
  const timeStep = await verifyTotpCode(
    decryptTotpSecret(enrollment, challenge.userId),
    code,
  );
  if (timeStep === null)
    throw serviceErrors.invalidCredentials('Code incorrect ou expiré');

  const replacing = challenge.user.totpCredential !== null;
  const recoveryCodes = generateRecoveryCodes(challenge.userId);
  const loginAudit = isMandatoryBootstrap
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
    generateSessionToken(),
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
        if (isMandatoryBootstrap) {
          const bootstrapUser = await transaction.user.findUnique({
            select: {
              deletedAt: true,
              isActive: true,
              mfaEnabledAt: true,
              securityVersion: true,
              totpCredential: { select: { userId: true } },
            },
            where: { id: challenge.userId },
          });
          if (
            !bootstrapUser ||
            bootstrapUser.deletedAt !== null ||
            !bootstrapUser.isActive ||
            bootstrapUser.securityVersion !== challenge.securityVersion + 1 ||
            bootstrapUser.mfaEnabledAt !== null ||
            bootstrapUser.totpCredential !== null
          ) {
            throw new InvalidMfaChallengeError();
          }
        }

        const challengeDelete = await transaction.mfaLoginChallenge.deleteMany({
          where: {
            expiresAt: { gt: authenticatedAt },
            purpose: 'SETUP',
            securityVersion: challenge.securityVersion,
            tokenHash,
            userId: challenge.userId,
          },
        });
        if (challengeDelete.count !== 1) throw new InvalidMfaChallengeError();

        if (challenge.credentialUpdatedAt) {
          const currentCredential = await transaction.totpCredential.count({
            where: {
              updatedAt: challenge.credentialUpdatedAt,
              userId: challenge.userId,
            },
          });
          if (currentCredential !== 1) throw new InvalidMfaChallengeError();
        }

        const enrollmentDelete = await transaction.totpEnrollment.deleteMany({
          where: {
            expiresAt: { gt: authenticatedAt },
            updatedAt: enrollment.updatedAt,
            userId: challenge.userId,
          },
        });
        if (enrollmentDelete.count !== 1) throw new InvalidMfaChallengeError();

        const credential = {
          lastUsedAt: authenticatedAt,
          lastUsedTimeStep: timeStep,
          secretAuthTag: enrollment.secretAuthTag,
          secretCiphertext: enrollment.secretCiphertext,
          secretIv: enrollment.secretIv,
          secretKeyVersion: enrollment.secretKeyVersion,
        };
        await transaction.totpCredential.upsert({
          create: { ...credential, userId: challenge.userId },
          update: credential,
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
      requireMfaEnabled: !isMandatoryBootstrap,
      revokeExistingSessions: true,
      ...(context.sourceSessionToken
        ? { sourceSessionToken: context.sourceSessionToken }
        : {}),
    },
  );

  await setSessionTokenCookie(session.token, session.expiresAt);
  const updatedUser = await prisma.user.findUnique({
    where: { id: challenge.userId },
  });
  if (!updatedUser) throw new InvalidMfaChallengeError();
  const user = mapUserToUserType(updatedUser);

  return {
    mustChangePassword: user.mustChangePassword,
    recoveryCodes: recoveryCodes.map((recoveryCode) => recoveryCode.plaintext),
    session: {
      expiresAt: session.expiresAt.toISOString(),
      idleExpiresAt: session.idleExpiresAt.toISOString(),
      lastSeenAt: session.lastSeenAt.toISOString(),
      rememberMe: session.rememberMe,
    },
    status: 'authenticated',
    user,
  };
};
