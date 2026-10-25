import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { PERMISSIONS } from '$constants/permissions.constants';
import {
  MFA_ACCOUNT_SESSION_EXPIRED_MESSAGE,
  type RecoveryCodesRegeneration,
  regenerateRecoveryCodes,
} from '$features/auth/server/mfa-account.service';
import { mfaFlowErrorResponse } from '$features/auth/server/mfa-flow-error';
import { requireAuth, requirePermission } from '$server/api-auth';
import {
  apiError,
  apiErrors,
  apiSuccess,
  parseJsonBody,
} from '$server/api-response';
import { MFA_TOTP_CODE_PATTERN } from '$server/mfa';
import {
  type ApiErrorResponse,
  type ApiSuccessResponse,
  ErrorCode,
} from '$types/api.types';
import { isPasswordWithinLengthLimit } from '$utils/password.utils';

const regenerateSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, 'Mot de passe actuel requis')
      .refine(isPasswordWithinLengthLimit, 'Mot de passe trop long'),
    currentTotpCode: z
      .string()
      .trim()
      .regex(MFA_TOTP_CODE_PATTERN, "Code d'authentification invalide"),
  })
  .strict();

/** Replaces every recovery code after password and app-code proofs. */
export async function POST(
  request: NextRequest,
): Promise<
  NextResponse<ApiSuccessResponse<RecoveryCodesRegeneration> | ApiErrorResponse>
> {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth.response;
    const permission = requirePermission(
      auth.user,
      PERMISSIONS.ACCOUNT.MANAGE_MFA,
    );
    if (!permission.success) return permission.response;
    if (!auth.session) {
      return apiError(
        ErrorCode.UNAUTHORIZED,
        'Session actuelle introuvable',
        401,
      );
    }

    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.success) return parsedBody.response;
    const validation = regenerateSchema.safeParse(parsedBody.data);
    if (!validation.success) {
      return apiErrors.validation(
        'Données invalides',
        validation.error.flatten().fieldErrors,
      );
    }

    return apiSuccess(
      await regenerateRecoveryCodes({
        ...validation.data,
        session: auth.session,
        userId: auth.user.id,
      }),
    );
  } catch (error) {
    return mfaFlowErrorResponse(error, {
      action: 'MFA_RECOVERY_CODES_REGENERATE',
      request,
      sessionExpiredMessage: MFA_ACCOUNT_SESSION_EXPIRED_MESSAGE,
    });
  }
}
