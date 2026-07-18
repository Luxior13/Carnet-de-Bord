import 'server-only';

import { NextResponse } from 'next/server';

import { type ApiErrorResponse, ErrorCode } from '$types/api.types';
import type { SessionType } from '$types/auth.types';

export const PASSWORD_REAUTHENTICATION_MAX_AGE_MS = 30 * 60 * 1000;
export const ELEVATED_MFA_PROOF_MAX_AGE_MS = 15 * 60 * 1000;
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

export const hasRecentElevatedMfaProof = (
  session: SessionType | null,
  now = new Date(),
): boolean =>
  hasRecentPasswordReauthentication(session, now) &&
  hasRecentProof(
    session?.criticalMfaVerifiedAt,
    ELEVATED_MFA_PROOF_MAX_AGE_MS,
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

export const getElevatedMfaProofExpiration = (
  session: SessionType | null,
  now = new Date(),
): Date | null =>
  hasRecentPasswordReauthentication(session, now) &&
  hasRecentElevatedMfaProof(session, now) &&
  session?.criticalMfaVerifiedAt
    ? new Date(
        new Date(session.criticalMfaVerifiedAt).getTime() +
          ELEVATED_MFA_PROOF_MAX_AGE_MS,
      )
    : null;

export const requireRecentPasswordReauthentication = (
  session: SessionType | null,
):
  | { response?: never; success: true }
  | {
      response: NextResponse<ApiErrorResponse>;
      success: false;
    } => {
  if (hasRecentPasswordReauthentication(session)) return { success: true };

  return {
    response: NextResponse.json(
      {
        error: {
          code: ErrorCode.PASSWORD_REAUTHENTICATION_REQUIRED,
          message:
            'Confirmez votre mot de passe pour enregistrer cette modification importante',
        },
        success: false,
      },
      { status: 403 },
    ),
    success: false,
  };
};

export const requireRecentElevatedMfaProof = (
  session: SessionType | null,
):
  | { response?: never; success: true }
  | {
      response: NextResponse<ApiErrorResponse>;
      success: false;
    } => {
  if (hasRecentElevatedMfaProof(session)) return { success: true };

  return {
    response: NextResponse.json(
      {
        error: {
          code: ErrorCode.CRITICAL_REAUTHENTICATION_REQUIRED,
          message:
            'Confirmez votre double authentification pour cette élévation critique',
        },
        success: false,
      },
      { status: 403 },
    ),
    success: false,
  };
};

export const requireRecentSensitiveActionProof = (
  session: SessionType | null,
):
  | { response?: never; success: true }
  | {
      response: NextResponse<ApiErrorResponse>;
      success: false;
    } => {
  if (hasRecentSensitiveActionProof(session)) return { success: true };

  return {
    response: NextResponse.json(
      {
        error: {
          code: ErrorCode.REAUTHENTICATION_REQUIRED,
          message:
            'Confirmez votre mot de passe et votre double authentification pour continuer',
        },
        success: false,
      },
      { status: 403 },
    ),
    success: false,
  };
};
