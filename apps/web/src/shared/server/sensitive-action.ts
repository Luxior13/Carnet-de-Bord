import 'server-only';

import { NextResponse } from 'next/server';

import { type ApiErrorResponse, ErrorCode } from '$types/api.types';
import type { SessionType } from '$types/auth.types';

export const ADMIN_MODE_PROOF_MAX_AGE_MS = 30 * 60 * 1000;
export const CRITICAL_PERMISSION_PROOF_MAX_AGE_MS = 15 * 60 * 1000;
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

export const hasRecentAdminModeProof = (
  session: SessionType | null,
  now = new Date(),
): boolean =>
  hasRecentProof(
    session?.passwordReauthenticatedAt,
    ADMIN_MODE_PROOF_MAX_AGE_MS,
    now,
  );

export const hasRecentSensitiveActionProof = (
  session: SessionType | null,
  now = new Date(),
): boolean =>
  hasRecentAdminModeProof(session, now) &&
  hasRecentProof(
    session?.criticalMfaVerifiedAt,
    SENSITIVE_ACTION_PROOF_MAX_AGE_MS,
    now,
  );

export const hasRecentCriticalPermissionProof = (
  session: SessionType | null,
  now = new Date(),
): boolean =>
  hasRecentAdminModeProof(session, now) &&
  hasRecentProof(
    session?.criticalMfaVerifiedAt,
    CRITICAL_PERMISSION_PROOF_MAX_AGE_MS,
    now,
  );

export const getAdminModeExpiration = (
  session: SessionType | null,
  now = new Date(),
): Date | null =>
  hasRecentAdminModeProof(session, now) && session?.passwordReauthenticatedAt
    ? new Date(
        new Date(session.passwordReauthenticatedAt).getTime() +
          ADMIN_MODE_PROOF_MAX_AGE_MS,
      )
    : null;

export const getCriticalProofExpiration = (
  session: SessionType | null,
  now = new Date(),
): Date | null =>
  hasRecentAdminModeProof(session, now) &&
  hasRecentCriticalPermissionProof(session, now) &&
  session?.criticalMfaVerifiedAt
    ? new Date(
        new Date(session.criticalMfaVerifiedAt).getTime() +
          CRITICAL_PERMISSION_PROOF_MAX_AGE_MS,
      )
    : null;

export const requireRecentAdminModeProof = (
  session: SessionType | null,
):
  | { response?: never; success: true }
  | {
      response: NextResponse<ApiErrorResponse>;
      success: false;
    } => {
  if (hasRecentAdminModeProof(session)) return { success: true };

  return {
    response: NextResponse.json(
      {
        error: {
          code: ErrorCode.ADMIN_MODE_REQUIRED,
          message:
            'Déverrouillez le mode administration avec votre mot de passe pour continuer',
        },
        success: false,
      },
      { status: 403 },
    ),
    success: false,
  };
};

export const requireRecentCriticalPermissionProof = (
  session: SessionType | null,
):
  | { response?: never; success: true }
  | {
      response: NextResponse<ApiErrorResponse>;
      success: false;
    } => {
  if (hasRecentCriticalPermissionProof(session)) return { success: true };

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
