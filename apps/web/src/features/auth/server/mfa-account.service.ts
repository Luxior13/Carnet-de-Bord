import 'server-only';

import { PERMISSIONS } from '$constants/permissions.constants';
import { createAuditLogWithHeaders } from '$server/audit-log';
import {
  consumeVerifiedMfaProof,
  generateRecoveryCodes,
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

/** A concurrent security change or a replayed code ends the operation. */
export const MFA_ACCOUNT_SESSION_EXPIRED_MESSAGE =
  'Votre session a expiré. Veuillez vous reconnecter.';

const SECURITY_AUDIT_LOCATION = {
  pageKey: 'account',
  pageLabel: 'Mon compte',
  poleKey: 'account',
  poleLabel: 'Espace personnel',
  tabKey: 'security',
  tabLabel: 'Sécurité',
} as const;

export type MfaStatus = {
  enabledAt: string | null;
  recoveryCodesRemaining: number;
  required: true;
};

export const getMfaStatus = async (user: UserType): Promise<MfaStatus> => {
  const [credential, recoveryCodesRemaining] = await Promise.all([
    prisma.totpCredential.findUnique({
      select: { userId: true },
      where: { userId: user.id },
    }),
    prisma.mfaRecoveryCode.count({
      where: { usedAt: null, userId: user.id },
    }),
  ]);
  if ((user.mfaEnabledAt !== null) !== (credential !== null)) {
    throw serviceErrors.conflict(
      'La configuration de double authentification est incohérente',
    );
  }

  return {
    enabledAt: user.mfaEnabledAt?.toISOString() ?? null,
    recoveryCodesRemaining,
    required: true,
  };
};

export type RecoveryCodesRegeneration = {
  recoveryCodes: string[];
  user: UserType;
};

/**
 * Replaces every recovery code. Regenerating the last-resort proofs requires
 * the password and the normal authenticator: accepting one recovery code to
 * replace all the others could strand the user if the response were lost.
 * Sessions are kept (owner decision of 25 October 2026): new codes are not a
 * sign of compromise; "sign out other sessions" covers that case.
 */
export const regenerateRecoveryCodes = async (input: {
  currentPassword: string;
  currentTotpCode: string;
  session: SessionType;
  userId: string;
}): Promise<RecoveryCodesRegeneration> => {
  const storedUser = await prisma.user.findUnique({
    include: { totpCredential: true },
    where: { deletedAt: null, id: input.userId },
  });
  const credential = storedUser?.totpCredential;
  if (!storedUser || !credential || storedUser.mfaEnabledAt === null) {
    throw serviceErrors.conflict(
      'La double authentification n’est pas activée',
    );
  }

  const reauthKey = `account-reauth:${storedUser.id}`;
  const passwordLimit = await reserveSensitiveActionRateLimit(reauthKey, {
    actorUserId: storedUser.id,
    proof: 'password',
    step: 'mfa_manage',
    targetUserId: storedUser.id,
  });
  if (!passwordLimit.allowed)
    throw serviceErrors.rateLimited(passwordLimit.retryAfter);
  if (!(await verifyPassword(input.currentPassword, storedUser.passwordHash)))
    throw serviceErrors.invalidCredentials('Mot de passe actuel incorrect');
  await clearRateLimit(reauthKey);

  const mfaManageKey = `account-mfa-manage:${storedUser.id}`;
  const mfaLimit = await reserveSensitiveActionRateLimit(mfaManageKey, {
    actorUserId: storedUser.id,
    proof: 'code',
    step: 'mfa_manage',
    targetUserId: storedUser.id,
  });
  if (!mfaLimit.allowed) throw serviceErrors.rateLimited(mfaLimit.retryAfter);
  const proof = await verifyMfaProof({
    code: input.currentTotpCode,
    credential,
    recoveryCodes: [],
    userId: storedUser.id,
  });
  if (!proof || proof.method !== 'TOTP')
    throw serviceErrors.invalidCredentials('Code actuel incorrect ou expiré');
  await clearRateLimit(mfaManageKey);

  const generatedCodes = generateRecoveryCodes(storedUser.id);
  const updatedUser = await prisma.$transaction(async (transaction) => {
    // Session, security version and permission are checked again under lock.
    const authorized = await authorizeUserAction(
      transaction,
      { actorId: storedUser.id, session: input.session },
      PERMISSIONS.ACCOUNT.MANAGE_MFA,
    );
    const current = await transaction.user.findUnique({
      select: { mfaEnabledAt: true },
      where: { id: storedUser.id },
    });
    if (!current?.mfaEnabledAt) {
      throw serviceErrors.conflict(
        'La double authentification n’est pas activée',
      );
    }
    await consumeVerifiedMfaProof(transaction, {
      authenticatedAt: authorized.checkedAt,
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
    await createAuditLogWithHeaders(
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
      { client: transaction, required: true },
    );

    return transaction.user.findUniqueOrThrow({
      where: { id: storedUser.id },
    });
  });

  return {
    recoveryCodes: generatedCodes.map((code) => code.plaintext),
    user: mapUserToUserType(updatedUser),
  };
};
