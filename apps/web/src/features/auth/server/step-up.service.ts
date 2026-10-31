import 'server-only';

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
import {
  getPasswordReauthenticationExpiration,
  getSensitiveActionProofExpiration,
} from '$server/sensitive-action';
import { serviceErrors } from '$server/service-error';
import { authorizeUserAction } from '$server/user-action-authorization';
import type { SessionType } from '$types/auth.types';

/**
 * `password` proves the password alone; `full` proves the password and a
 * fresh TOTP code, the sensitive-action level.
 */
export type StepUpKind = 'full' | 'password';

export type StepUpResult = {
  /** When the server stops accepting the proof just obtained. */
  expiresAt: string;
  kind: StepUpKind;
};

const STEP_UP_AUDIT_LOCATION = {
  pageKey: 'authentication',
  pageLabel: 'Authentification',
  poleKey: 'system',
  poleLabel: 'Système',
  tabKey: 'step-up',
  tabLabel: 'Confirmation renforcée',
} as const;

const sessionChanged = (): Error =>
  serviceErrors.conflict('La session a changé. Rechargez la page.');

const recordStepUpFailure = async (
  userId: string,
  reason: string,
  proofKind: StepUpKind,
): Promise<void> => {
  await createAuditLogWithHeaders({
    action: 'STEP_UP_FAILED',
    category: 'AUTH',
    description: 'Confirmation renforcée échouée',
    metadata: { ...STEP_UP_AUDIT_LOCATION, proofKind, reason },
    targetUserId: userId,
    userId,
  });
};

/**
 * Records a fresh password proof, and for `full` a fresh TOTP proof, on the
 * current session. Every check is repeated under the user lock, and the code
 * is consumed in the same transaction as the session update and its audit.
 */
export const confirmStepUp = async (input: {
  currentPassword: string;
  currentTotpCode?: string;
  kind: StepUpKind;
  session: SessionType;
  userId: string;
}): Promise<StepUpResult> => {
  const { kind, session } = input;
  try {
    const storedUser = await prisma.user.findUnique({
      include: { totpCredential: true },
      where: { deletedAt: null, id: input.userId },
    });
    const totpCredential = storedUser?.totpCredential;
    if (
      !storedUser ||
      !totpCredential ||
      !storedUser.isActive ||
      storedUser.mfaEnabledAt === null ||
      storedUser.securityVersion !== session.securityVersion
    ) {
      await recordStepUpFailure(input.userId, 'SECURITY_STATE_CHANGED', kind);
      throw serviceErrors.unauthorized(
        'La session actuelle doit être renouvelée',
      );
    }

    const verifiesTotp = kind === 'full';
    const passwordRateLimitKey = `sensitive-step-up-password:${storedUser.id}`;
    const rateLimitKeys: string[] = [passwordRateLimitKey];
    const passwordLimit = await reserveSensitiveActionRateLimit(
      passwordRateLimitKey,
      {
        actorUserId: storedUser.id,
        proof: 'password',
        step: 'step_up',
        targetUserId: storedUser.id,
      },
    );
    if (!passwordLimit.allowed)
      throw serviceErrors.rateLimited(passwordLimit.retryAfter);
    if (
      !(await verifyPassword(input.currentPassword, storedUser.passwordHash))
    ) {
      await recordStepUpFailure(storedUser.id, 'PASSWORD_INVALID', kind);
      throw serviceErrors.invalidCredentials('Mot de passe actuel incorrect');
    }
    await clearRateLimit(passwordRateLimitKey);

    let verifiedMfaProof: Awaited<ReturnType<typeof verifyMfaProof>> = null;
    if (verifiesTotp) {
      const totpRateLimitKey = `sensitive-step-up-totp:${storedUser.id}`;
      rateLimitKeys.push(totpRateLimitKey);
      const totpLimit = await reserveSensitiveActionRateLimit(
        totpRateLimitKey,
        {
          actorUserId: storedUser.id,
          proof: 'code',
          step: 'step_up',
          targetUserId: storedUser.id,
        },
      );
      if (!totpLimit.allowed)
        throw serviceErrors.rateLimited(totpLimit.retryAfter);
      verifiedMfaProof = await verifyMfaProof({
        code: input.currentTotpCode ?? '',
        credential: totpCredential,
        recoveryCodes: [],
        userId: storedUser.id,
      });
      if (!verifiedMfaProof || verifiedMfaProof.method !== 'TOTP') {
        await recordStepUpFailure(storedUser.id, 'TOTP_INVALID', kind);
        throw serviceErrors.invalidCredentials(
          'Code actuel incorrect ou expiré',
        );
      }
    }

    let authenticatedAt = new Date();
    await prisma.$transaction(async (transaction) => {
      const authorized = await authorizeUserAction(
        transaction,
        { actorId: input.userId, session },
        null,
      );
      authenticatedAt = authorized.checkedAt;
      const sessionUpdate = await transaction.session.updateMany({
        data: {
          ...(verifiesTotp ? { criticalMfaVerifiedAt: authenticatedAt } : {}),
          lastSeenAt: authenticatedAt,
          passwordReauthenticatedAt: authenticatedAt,
        },
        where: {
          expiresAt: { gt: authenticatedAt },
          idleExpiresAt: { gt: authenticatedAt },
          securityVersion: storedUser.securityVersion,
          token: session.token,
          userId: storedUser.id,
        },
      });
      if (sessionUpdate.count !== 1) throw sessionChanged();

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
              kind === 'password' ? 'PASSWORD' : 'PASSWORD_TOTP',
            proofKind: kind,
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
      ...session,
      criticalMfaVerifiedAt: verifiesTotp
        ? authenticatedAt
        : session.criticalMfaVerifiedAt,
      passwordReauthenticatedAt: authenticatedAt,
    };
    const expiresAt =
      kind === 'password'
        ? getPasswordReauthenticationExpiration(updatedSession, authenticatedAt)
        : getSensitiveActionProofExpiration(updatedSession, authenticatedAt);
    if (!expiresAt) throw sessionChanged();

    return { expiresAt: expiresAt.toISOString(), kind };
  } catch (error) {
    if (error instanceof MfaReplayDetectedError) {
      await recordStepUpFailure(input.userId, 'PROOF_REPLAYED', kind);
      throw serviceErrors.conflict(
        'Cette preuve a expiré. Saisissez un nouveau code.',
      );
    }
    throw error;
  }
};
