import 'server-only';

import { FEATURES } from '$constants/feature-registry.constants';
import { PERMISSIONS } from '$constants/permissions.constants';
import { createAuditLogWithHeaders } from '$server/audit-log';
import {
  consumeVerifiedMfaProof,
  MfaReplayDetectedError,
  verifyMfaProof,
} from '$server/mfa';
import { verifyPassword } from '$server/password';
import { prisma } from '$server/prisma';
import {
  clearRateLimit,
  reserveSensitiveActionRateLimit,
} from '$server/rate-limiter';
import { serviceErrors } from '$server/service-error';
import { authorizeUserAction } from '$server/user-action-authorization';
import { mapUserToUserType } from '$server/user-projection';
import type { SessionType, UserType } from '$types/auth.types';

const USERS_SECURITY_AUDIT_LOCATION = {
  ...FEATURES.users.audit,
  tabKey: 'security',
  tabLabel: 'Sécurité',
} as const;

const targetStateChanged = (): Error =>
  serviceErrors.conflict(
    'La sécurité de ce compte a changé. Rechargez la fiche avant de réessayer.',
  );

/**
 * Recovery of a member who lost the authenticator and every recovery code:
 * an actor holding `users:reset_mfa` (the root always does) removes the
 * target's double authentication after proving its own password and a fresh
 * TOTP code. Only the root may reset another administrator; the root itself
 * keeps the offline procedure. The target loses its credential, sessions,
 * challenges and recovery codes in the same transaction as the audit.
 * Throws `ServiceError` refusals.
 */
export const resetUserMfaForActor = async (input: {
  actor: UserType;
  currentPassword: string;
  currentTotpCode: string;
  session: SessionType;
  userId: string;
}): Promise<UserType> => {
  const { actor, session } = input;
  const [actorRow, target] = await Promise.all([
    prisma.user.findUnique({
      include: { totpCredential: true },
      where: { deletedAt: null, id: actor.id },
    }),
    prisma.user.findUnique({
      include: { totpCredential: true },
      where: { deletedAt: null, id: input.userId },
    }),
  ]);

  if (
    !actorRow ||
    actorRow.isProtected !== actor.isProtected ||
    !actorRow.isActive ||
    actorRow.mfaEnabledAt === null ||
    !actorRow.totpCredential ||
    actorRow.securityVersion !== session.securityVersion
  ) {
    throw serviceErrors.unauthorized(
      'La session actuelle doit être renouvelée',
    );
  }
  if (!target) throw serviceErrors.notFound('Utilisateur non trouvé');
  if (target.isProtected || target.id === actorRow.id) {
    throw serviceErrors.forbidden(
      'La double authentification de ce compte ne peut pas être réinitialisée administrativement',
    );
  }
  // Same boundary as every other delegated action on an administrator.
  if (target.role === 'ADMIN' && !actorRow.isProtected) {
    throw serviceErrors.forbidden(
      "Seul le superadmin peut réinitialiser la double authentification d'un administrateur",
    );
  }
  if (target.mfaEnabledAt === null || !target.totpCredential)
    throw serviceErrors.conflict(
      "La double authentification n'est pas activée",
    );

  const passwordRateLimitKey = `admin-mfa-reset-password:${actorRow.id}`;
  // The administrator's own proof is refused: they are actor and target.
  const passwordLimit = await reserveSensitiveActionRateLimit(
    passwordRateLimitKey,
    {
      actorUserId: actorRow.id,
      proof: 'password',
      step: 'mfa_reset',
      targetUserId: actorRow.id,
    },
  );
  if (!passwordLimit.allowed)
    throw serviceErrors.rateLimited(passwordLimit.retryAfter);
  if (!(await verifyPassword(input.currentPassword, actorRow.passwordHash)))
    throw serviceErrors.invalidCredentials('Mot de passe actuel incorrect');
  await clearRateLimit(passwordRateLimitKey);

  const totpRateLimitKey = `admin-mfa-reset-totp:${actorRow.id}`;
  const totpLimit = await reserveSensitiveActionRateLimit(totpRateLimitKey, {
    actorUserId: actorRow.id,
    proof: 'code',
    step: 'mfa_reset',
    targetUserId: actorRow.id,
  });
  if (!totpLimit.allowed) throw serviceErrors.rateLimited(totpLimit.retryAfter);
  const proof = await verifyMfaProof({
    code: input.currentTotpCode,
    credential: actorRow.totpCredential,
    recoveryCodes: [],
    userId: actorRow.id,
  });
  if (!proof || proof.method !== 'TOTP')
    throw serviceErrors.invalidCredentials('Code actuel incorrect ou expiré');

  const targetName =
    target.firstName && target.lastName
      ? `${target.firstName} ${target.lastName}`
      : target.loginName;
  const credentialUpdatedAt = actorRow.totpCredential.updatedAt;

  try {
    const updatedUser = await prisma.$transaction(async (transaction) => {
      const authorized = await authorizeUserAction(
        transaction,
        { actorId: actor.id, authorization: actor, session },
        PERMISSIONS.USERS.RESET_MFA,
        target.id,
      );
      const authenticatedAt = authorized.checkedAt;
      // Recheck and lock the exact authenticated session. A concurrently
      // revoked session cannot authorize this operation.
      const sessionLock = await transaction.session.updateMany({
        data: {
          criticalMfaVerifiedAt: authenticatedAt,
          lastSeenAt: authenticatedAt,
          passwordReauthenticatedAt: authenticatedAt,
        },
        where: {
          expiresAt: { gt: authenticatedAt },
          idleExpiresAt: { gt: authenticatedAt },
          securityVersion: actorRow.securityVersion,
          token: session.token,
          userId: actorRow.id,
        },
      });
      if (sessionLock.count !== 1) throw new MfaReplayDetectedError();

      // Conditional version advance serializes this reset against target-side
      // setup, disable, password and access mutations.
      const targetUpdate = await transaction.user.updateMany({
        data: { mfaEnabledAt: null, securityVersion: { increment: 1 } },
        where: {
          deletedAt: null,
          id: target.id,
          isProtected: false,
          mfaEnabledAt: { not: null },
          role: target.role,
          securityVersion: target.securityVersion,
        },
      });
      if (targetUpdate.count !== 1) throw targetStateChanged();

      await consumeVerifiedMfaProof(transaction, {
        authenticatedAt,
        credentialUpdatedAt,
        proof,
        userId: actorRow.id,
      });

      const credentialDelete = await transaction.totpCredential.deleteMany({
        where: { userId: target.id },
      });
      if (credentialDelete.count !== 1) throw targetStateChanged();

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
          action: 'MFA_RESET',
          category: 'AUTH',
          description: `Double authentification réinitialisée pour: ${target.loginName}`,
          metadata: {
            ...USERS_SECURITY_AUDIT_LOCATION,
            actorIsProtected: actorRow.isProtected,
            adminRecovery: true,
            authenticationMethod: 'TOTP',
            targetName,
          },
          targetUserId: target.id,
          userId: actorRow.id,
        },
        { client: transaction, required: true },
      );
      await transaction.rateLimit.deleteMany({
        where: { key: { in: [passwordRateLimitKey, totpRateLimitKey] } },
      });

      const nextUser = await transaction.user.findUnique({
        where: { id: target.id },
      });
      if (!nextUser) throw targetStateChanged();

      return nextUser;
    });

    return mapUserToUserType(updatedUser);
  } catch (error) {
    if (error instanceof MfaReplayDetectedError) {
      throw serviceErrors.unauthorized(
        'Votre session a expiré. Veuillez vous reconnecter.',
      );
    }
    throw error;
  }
};
