import 'server-only';

import { createAuditLogWithHeaders } from '$server/audit-log';
import {
  consumeVerifiedMfaProof,
  createMfaChallenge,
  getMfaChallengeToken,
  hashMfaChallengeToken,
  InvalidMfaChallengeError,
  verifyMfaProof,
} from '$server/mfa';
import { authenticateUser } from '$server/password';
import { prisma } from '$server/prisma';
import {
  createLoginRateLimitKeys,
  createMfaRateLimitKeys,
  recordSuccessfulLogin,
  reserveLoginRateLimits,
  reserveMfaRateLimits,
} from '$server/rate-limiter';
import { ServiceError, serviceErrors } from '$server/service-error';
import {
  createSession,
  generateSessionToken,
  setSessionTokenCookie,
} from '$server/session';
import { ErrorCode } from '$types/api.types';
import type { UserType } from '$types/auth.types';

export const LOGIN_INVALID_CHALLENGE_MESSAGE =
  'Le défi de connexion a expiré. Recommencez la connexion.';

const AUTH_CONNECTION_AUDIT_LOCATION = {
  pageKey: 'authentication',
  pageLabel: 'Authentification',
  poleKey: 'system',
  poleLabel: 'Système',
  tabKey: 'connections',
  tabLabel: 'Connexions',
} as const;

// Disabled, unknown and wrong-password accounts share the same public
// response to prevent account enumeration.
const invalidCredentials = (): ServiceError =>
  new ServiceError(
    ErrorCode.INVALID_CREDENTIALS,
    'Identifiant ou mot de passe incorrect',
    401,
  );

const recordLoginAudit = async (data: {
  action: 'LOGIN_FAILED' | 'LOGIN_SUCCESS';
  description: string;
  loginName: string;
  reason?: string;
  userId?: string | null;
}): Promise<void> => {
  await createAuditLogWithHeaders({
    action: data.action,
    category: 'AUTH',
    description: data.description,
    metadata: {
      loginName: data.loginName,
      ...AUTH_CONNECTION_AUDIT_LOCATION,
      ...(data.reason ? { reason: data.reason } : {}),
    },
    targetUserId: data.userId ?? null,
    // A failed attempt is produced by an unauthenticated source, not by the
    // owner of the account being targeted.
    userId: data.action === 'LOGIN_SUCCESS' ? (data.userId ?? null) : null,
  });
};

export type PasswordLoginResult = {
  challengeExpiresAt: string;
  status: 'mfa_required' | 'mfa_setup_required';
};

/**
 * First login step: password check behind the shared rate limiter, then an
 * MFA challenge (or a mandatory MFA setup challenge). No session yet.
 */
export const startPasswordLogin = async (input: {
  clientIp: string | null;
  loginName: string;
  password: string;
  rememberMe: boolean;
}): Promise<PasswordLoginResult> => {
  // Independent buckets prevent rotating either IPs or login names from
  // providing an unlimited supply of fresh password checks. They are the
  // only throttle: no account row is ever locked by failed attempts.
  const rateLimitKeys = createLoginRateLimitKeys(
    input.clientIp ?? 'unknown',
    input.loginName,
  );
  const rateLimit = await reserveLoginRateLimits(rateLimitKeys, {
    actorUserId: null,
    loginName: input.loginName,
    proof: 'password',
    step: 'login',
  });
  if (!rateLimit.allowed) throw serviceErrors.rateLimited(rateLimit.retryAfter);

  const result = await authenticateUser(input.loginName, input.password);
  if (!result.success) {
    await recordLoginAudit({
      action: 'LOGIN_FAILED',
      description: `Connexion échouée: ${input.loginName}`,
      loginName: input.loginName,
      reason: result.error,
      userId: result.userId,
    });
    throw invalidCredentials();
  }

  await recordSuccessfulLogin(rateLimitKeys);

  const hasEnabledMfa = result.user.mfaEnabledAt !== null;
  if (hasEnabledMfa !== (result.user.totpCredential !== null)) {
    await recordLoginAudit({
      action: 'LOGIN_FAILED',
      description: `Connexion interrompue: ${result.user.loginName}`,
      loginName: result.user.loginName,
      reason: 'MFA_STATE_INCONSISTENT',
      userId: result.user.id,
    });
    throw invalidCredentials();
  }
  const challenge = await createMfaChallenge({
    credentialUpdatedAt: result.user.totpCredential?.updatedAt ?? null,
    purpose: hasEnabledMfa ? 'LOGIN' : 'SETUP',
    rememberMe: input.rememberMe && !result.user.isProtected,
    securityVersion: result.user.securityVersion,
    userId: result.user.id,
  });

  return {
    challengeExpiresAt: challenge.expiresAt.toISOString(),
    status: hasEnabledMfa ? 'mfa_required' : 'mfa_setup_required',
  };
};

export type MfaLoginResult = {
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

/**
 * Second login step: an app code or a recovery code consumes the LOGIN
 * challenge and opens the session in one transaction.
 */
export const completeMfaLogin = async (input: {
  clientIp: string | null;
  code: string;
}): Promise<MfaLoginResult> => {
  const challengeToken = await getMfaChallengeToken();
  if (!challengeToken) throw new InvalidMfaChallengeError();
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
  const credential = challenge?.user.totpCredential;
  if (
    !challenge ||
    !credential ||
    challenge.purpose !== 'LOGIN' ||
    challenge.expiresAt <= now ||
    challenge.user.deletedAt !== null ||
    !challenge.user.isActive ||
    challenge.user.securityVersion !== challenge.securityVersion ||
    challenge.user.mfaEnabledAt === null ||
    !challenge.credentialUpdatedAt ||
    credential.updatedAt.getTime() !== challenge.credentialUpdatedAt.getTime()
  ) {
    throw new InvalidMfaChallengeError();
  }

  const rateLimitKeys = createMfaRateLimitKeys(
    input.clientIp,
    challenge.userId,
    tokenHash,
  );
  const rateLimit = await reserveMfaRateLimits(rateLimitKeys, {
    actorUserId: null,
    proof: 'code',
    step: 'login',
    targetUserId: challenge.userId,
  });
  if (!rateLimit.allowed) throw serviceErrors.rateLimited(rateLimit.retryAfter);

  const proof = await verifyMfaProof({
    code: input.code,
    credential,
    recoveryCodes: challenge.user.mfaRecoveryCodes,
    userId: challenge.userId,
  });
  if (!proof) {
    await createAuditLogWithHeaders({
      action: 'LOGIN_FAILED',
      category: 'AUTH',
      description: 'Vérification à deux facteurs échouée',
      metadata: { ...AUTH_CONNECTION_AUDIT_LOCATION, reason: 'MFA_INVALID' },
      targetUserId: challenge.userId,
      userId: null,
    });
    throw serviceErrors.invalidCredentials('Code incorrect ou expiré');
  }

  const session = await createSession(
    generateSessionToken(),
    challenge.userId,
    challenge.securityVersion,
    challenge.rememberMe,
    {
      action: 'LOGIN_SUCCESS',
      category: 'AUTH',
      description: `Connexion réussie: ${challenge.user.loginName}`,
      metadata: {
        ...AUTH_CONNECTION_AUDIT_LOCATION,
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
                metadata: AUTH_CONNECTION_AUDIT_LOCATION,
                targetUserId: challenge.userId,
                userId: challenge.userId,
              },
            ]
          : [],
      mfaMethod: proof.method,
      precondition: async (transaction, authenticatedAt) => {
        const challengeDelete = await transaction.mfaLoginChallenge.deleteMany({
          where: {
            credentialUpdatedAt: challenge.credentialUpdatedAt,
            expiresAt: { gt: authenticatedAt },
            purpose: 'LOGIN',
            securityVersion: challenge.securityVersion,
            tokenHash,
            userId: challenge.userId,
          },
        });
        if (challengeDelete.count !== 1) throw new InvalidMfaChallengeError();

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

  return {
    mustChangePassword: session.user.mustChangePassword,
    session: {
      expiresAt: session.expiresAt.toISOString(),
      idleExpiresAt: session.idleExpiresAt.toISOString(),
      lastSeenAt: session.lastSeenAt.toISOString(),
      rememberMe: session.rememberMe,
    },
    status: 'authenticated',
    user: session.user,
  };
};
