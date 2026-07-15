import 'server-only';

import { NextResponse } from 'next/server';

import { type ApiErrorResponse, ErrorCode } from '$types/api.types';
import type { SessionType } from '$types/auth.types';

export const SENSITIVE_ACTION_PROOF_MAX_AGE_MS = 5 * 60 * 1000;

export const hasRecentSensitiveActionProof = (
  session: SessionType | null,
  now = new Date(),
): boolean => {
  if (!session?.mfaVerifiedAt) return false;

  const verifiedAt = new Date(session.mfaVerifiedAt);
  const age = now.getTime() - verifiedAt.getTime();

  return age >= 0 && age <= SENSITIVE_ACTION_PROOF_MAX_AGE_MS;
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
