import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  completeMfaLogin,
  LOGIN_INVALID_CHALLENGE_MESSAGE,
  type MfaLoginResult,
} from '$features/auth/server/login.service';
import { mfaFlowErrorResponse } from '$features/auth/server/mfa-flow-error';
import { apiErrors, apiSuccess, parseJsonBody } from '$server/api-response';
import { clearMfaChallengeCookie } from '$server/mfa';
import { getClientIp } from '$server/request-context';
import type { ApiErrorResponse, ApiSuccessResponse } from '$types/api.types';

const verifySchema = z
  .object({
    code: z.string().trim().min(1, 'Code requis').max(64, 'Code invalide'),
  })
  .strict();

/** Second login step: an app or recovery code opens the session. */
export async function POST(
  request: NextRequest,
): Promise<
  NextResponse<ApiSuccessResponse<MfaLoginResult> | ApiErrorResponse>
> {
  try {
    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.success) return parsedBody.response;
    const validation = verifySchema.safeParse(parsedBody.data);
    if (!validation.success) {
      return apiErrors.validation(
        'Données invalides',
        validation.error.flatten().fieldErrors,
      );
    }

    const result = await completeMfaLogin({
      clientIp: getClientIp(request.headers),
      code: validation.data.code,
    });
    await clearMfaChallengeCookie();

    return apiSuccess(result);
  } catch (error) {
    return mfaFlowErrorResponse(error, {
      action: 'MFA_VERIFY',
      invalidChallengeMessage: LOGIN_INVALID_CHALLENGE_MESSAGE,
      request,
    });
  }
}
