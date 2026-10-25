import 'server-only';

import { ErrorCode } from '$types/api.types';
import type { SessionType } from '$types/auth.types';

import { ServiceError } from './service-error';

export const PASSWORD_REAUTHENTICATION_MAX_AGE_MS = 30 * 60 * 1000;
export const SENSITIVE_ACTION_PROOF_MAX_AGE_MS = 5 * 60 * 1000;

const hasRecentProof = (
  verifiedAtValue: Date | null | undefined,
  maxAgeMs: number,
  now: Date,
): boolean => {
  if (!verifiedAtValue) return false;

  const verifiedAt = new Date(verifiedAtValue);
  const age = now.getTime() - verifiedAt.getTime();

  return age >= 0 && age <= maxAgeMs;
};

export const hasRecentPasswordReauthentication = (
  session: SessionType | null,
  now = new Date(),
): boolean =>
  hasRecentProof(
    session?.passwordReauthenticatedAt,
    PASSWORD_REAUTHENTICATION_MAX_AGE_MS,
    now,
  );

export const hasRecentSensitiveActionProof = (
  session: SessionType | null,
  now = new Date(),
): boolean =>
  hasRecentPasswordReauthentication(session, now) &&
  hasRecentProof(
    session?.criticalMfaVerifiedAt,
    SENSITIVE_ACTION_PROOF_MAX_AGE_MS,
    now,
  );

export const getPasswordReauthenticationExpiration = (
  session: SessionType | null,
  now = new Date(),
): Date | null =>
  hasRecentPasswordReauthentication(session, now) &&
  session?.passwordReauthenticatedAt
    ? new Date(
        new Date(session.passwordReauthenticatedAt).getTime() +
          PASSWORD_REAUTHENTICATION_MAX_AGE_MS,
      )
    : null;

/** The sensitive proof ends with whichever of its two proofs expires first. */
export const getSensitiveActionProofExpiration = (
  session: SessionType | null,
  now = new Date(),
): Date | null => {
  const passwordExpiration = getPasswordReauthenticationExpiration(
    session,
    now,
  );
  if (
    !passwordExpiration ||
    !hasRecentSensitiveActionProof(session, now) ||
    !session?.criticalMfaVerifiedAt
  )
    return null;

  return new Date(
    Math.min(
      passwordExpiration.getTime(),
      new Date(session.criticalMfaVerifiedAt).getTime() +
        SENSITIVE_ACTION_PROOF_MAX_AGE_MS,
    ),
  );
};

/** Throws unless the session proved its password within thirty minutes. */
export const assertRecentPasswordReauthentication = (
  session: SessionType | null,
): void => {
  if (hasRecentPasswordReauthentication(session)) return;
  throw new ServiceError(
    ErrorCode.PASSWORD_REAUTHENTICATION_REQUIRED,
    'Confirmez votre mot de passe pour enregistrer cette modification importante',
    403,
  );
};

/** Throws unless the session proved its password and a fresh TOTP code. */
export const assertRecentSensitiveActionProof = (
  session: SessionType | null,
): void => {
  if (hasRecentSensitiveActionProof(session)) return;
  throw new ServiceError(
    ErrorCode.REAUTHENTICATION_REQUIRED,
    'Confirmez votre mot de passe et votre double authentification pour continuer',
    403,
  );
};
