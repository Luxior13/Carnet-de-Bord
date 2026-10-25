import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  confirmStepUp,
  type StepUpResult,
} from '$features/auth/server/step-up.service';
import { requireAuth } from '$server/api-auth';
import {
  apiError,
  apiErrors,
  apiSuccess,
  parseJsonBody,
} from '$server/api-response';
import { MFA_TOTP_CODE_PATTERN } from '$server/mfa';
import { serviceErrorResponse } from '$server/service-error';
import {
  type ApiErrorResponse,
  type ApiSuccessResponse,
  ErrorCode,
} from '$types/api.types';
import { isPasswordWithinLengthLimit } from '$utils/password.utils';

const currentPasswordSchema = z
  .string()
  .min(1, 'Mot de passe actuel requis')
  .refine(isPasswordWithinLengthLimit, 'Mot de passe trop long');
const currentTotpCodeSchema = z
  .string()
  .trim()
  .regex(MFA_TOTP_CODE_PATTERN, "Code d'authentification invalide");

const stepUpSchema = z.union([
  z
    .object({
      currentPassword: currentPasswordSchema,
      kind: z.literal('password'),
    })
    .strict(),
  z
    .object({
      currentPassword: currentPasswordSchema,
      currentTotpCode: currentTotpCodeSchema,
      kind: z.literal('full').optional(),
    })
    .strict()
    .transform((value) => ({ ...value, kind: 'full' as const })),
]);

/** Records a fresh password (and code) proof on the current session. */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiSuccessResponse<StepUpResult> | ApiErrorResponse>> {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth.response;
    if (!auth.session) {
      return apiError(
        ErrorCode.UNAUTHORIZED,
        'Session actuelle introuvable',
        401,
      );
    }

    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.success) return parsedBody.response;
    const validation = stepUpSchema.safeParse(parsedBody.data);
    if (!validation.success) {
      return apiErrors.validation(
        'Données invalides',
        validation.error.flatten().fieldErrors,
      );
    }

    return apiSuccess(
      await confirmStepUp({
        ...validation.data,
        session: auth.session,
        userId: auth.user.id,
      }),
    );
  } catch (error) {
    return serviceErrorResponse(error, { action: 'AUTH_STEP_UP', request });
  }
}
