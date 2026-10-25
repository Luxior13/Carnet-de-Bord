import 'server-only';

import type { NextResponse } from 'next/server';

import { apiError } from '$server/api-response';
import { isSecurityVersionMismatchError } from '$server/auth-errors';
import {
  clearMfaChallengeCookie,
  InvalidMfaChallengeError,
  MfaReplayDetectedError,
} from '$server/mfa';
import {
  type ServiceErrorContext,
  serviceErrorResponse,
} from '$server/service-error';
import { type ApiErrorResponse, ErrorCode } from '$types/api.types';

/**
 * MFA flows: an invalid, expired or replayed challenge or proof, or a security
 * version that changed meanwhile, answers 401. With `invalidChallengeMessage`
 * the MFA challenge cookie is cleared too; flows that never use that cookie
 * pass `sessionExpiredMessage` instead.
 */
export const mfaFlowErrorResponse = async (
  error: unknown,
  context: ServiceErrorContext & { invalidChallengeMessage?: string },
): Promise<NextResponse<ApiErrorResponse>> => {
  const staleState =
    error instanceof InvalidMfaChallengeError ||
    error instanceof MfaReplayDetectedError ||
    isSecurityVersionMismatchError(error);
  if (staleState && context.invalidChallengeMessage) {
    await clearMfaChallengeCookie();

    return apiError(
      ErrorCode.UNAUTHORIZED,
      context.invalidChallengeMessage,
      401,
    );
  }
  if (staleState && context.sessionExpiredMessage)
    return apiError(ErrorCode.UNAUTHORIZED, context.sessionExpiredMessage, 401);

  return serviceErrorResponse(error, context);
};
