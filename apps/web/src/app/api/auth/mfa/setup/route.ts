import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { PERMISSIONS } from '$constants/permissions.constants';
import { mfaFlowErrorResponse } from '$features/auth/server/mfa-flow-error';
import {
  confirmMfaSetup,
  findMandatorySetup,
  loadSetupChallenge,
  MFA_SETUP_INVALID_CHALLENGE_MESSAGE,
  type MfaSetupConfirmation,
  type MfaSetupStart,
  startMfaSetup,
} from '$features/auth/server/mfa-setup.service';
import { requireAuth, requirePermission } from '$server/api-auth';
import { apiErrors, apiSuccess, parseJsonBody } from '$server/api-response';
import { clearMfaChallengeCookie, InvalidMfaChallengeError } from '$server/mfa';
import { getClientIp } from '$server/request-context';
import type { ApiErrorResponse, ApiSuccessResponse } from '$types/api.types';
import { isPasswordWithinLengthLimit } from '$utils/password.utils';

const startSetupSchema = z
  .object({
    currentCode: z.string().trim().min(1).max(64).optional(),
    currentPassword: z
      .string()
      .refine(isPasswordWithinLengthLimit, 'Mot de passe trop long')
      .optional(),
  })
  .strict();

const confirmSetupSchema = z
  .object({
    code: z
      .string()
      .trim()
      .regex(/^\d{6}$/, 'Code à six chiffres requis'),
  })
  .strict();

/** Starts a mandatory first enrollment or an authenticated re-enrollment. */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiSuccessResponse<MfaSetupStart> | ApiErrorResponse>> {
  try {
    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.success) return parsedBody.response;
    const validation = startSetupSchema.safeParse(parsedBody.data);
    if (!validation.success) {
      return apiErrors.validation(
        'Données invalides',
        validation.error.flatten().fieldErrors,
      );
    }

    const mandatorySetup = await findMandatorySetup();
    if (mandatorySetup) {
      return apiSuccess(
        await startMfaSetup({ kind: 'mandatory', setup: mandatorySetup }),
      );
    }

    const auth = await requireAuth();
    if (!auth.success) return auth.response;
    if (!auth.session) throw new InvalidMfaChallengeError();
    const permission = requirePermission(
      auth.user,
      PERMISSIONS.ACCOUNT.MANAGE_MFA,
    );
    if (!permission.success) return permission.response;

    return apiSuccess(
      await startMfaSetup({
        kind: 'authenticated',
        proofs: validation.data,
        session: auth.session,
        userId: auth.user.id,
      }),
    );
  } catch (error) {
    return mfaFlowErrorResponse(error, {
      action: 'MFA_SETUP_START',
      invalidChallengeMessage: MFA_SETUP_INVALID_CHALLENGE_MESSAGE,
      request,
    });
  }
}

/** Confirms the pending enrollment with its first code. */
export async function PUT(
  request: NextRequest,
): Promise<
  NextResponse<ApiSuccessResponse<MfaSetupConfirmation> | ApiErrorResponse>
> {
  try {
    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.success) return parsedBody.response;
    const validation = confirmSetupSchema.safeParse(parsedBody.data);
    if (!validation.success) {
      return apiErrors.validation(
        'Données invalides',
        validation.error.flatten().fieldErrors,
      );
    }

    const setupChallenge = await loadSetupChallenge();
    if (!setupChallenge) throw new InvalidMfaChallengeError();

    let sourceSessionToken: string | undefined;
    if (!setupChallenge.isMandatoryBootstrap) {
      const auth = await requireAuth();
      if (!auth.success) return auth.response;
      const permission = requirePermission(
        auth.user,
        PERMISSIONS.ACCOUNT.MANAGE_MFA,
      );
      if (!permission.success) return permission.response;
      if (
        !auth.session ||
        auth.user.id !== setupChallenge.challenge.userId ||
        auth.session.securityVersion !==
          setupChallenge.challenge.securityVersion
      ) {
        throw new InvalidMfaChallengeError();
      }
      sourceSessionToken = auth.session.token;
    }

    const confirmation = await confirmMfaSetup(
      setupChallenge,
      validation.data.code,
      { clientIp: getClientIp(request.headers), sourceSessionToken },
    );
    await clearMfaChallengeCookie();

    return apiSuccess(confirmation);
  } catch (error) {
    return mfaFlowErrorResponse(error, {
      action: 'MFA_SETUP_CONFIRM',
      invalidChallengeMessage: MFA_SETUP_INVALID_CHALLENGE_MESSAGE,
      request,
    });
  }
}
