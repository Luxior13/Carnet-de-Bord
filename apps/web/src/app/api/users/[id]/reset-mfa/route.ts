import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { PERMISSIONS } from '$constants/permissions.constants';
import { resetUserMfaForActor } from '$features/users/server/user-mfa-reset.service';
import { requireAuth, requirePermission } from '$server/api-auth';
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
import type { UserType } from '$types/auth.types';
import { isPasswordWithinLengthLimit } from '$utils/password.utils';

type RouteParams = {
  params: Promise<{ id: string }>;
};

type ResetMfaResponse = {
  user: UserType;
};

const resetMfaSchema = z
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

export async function POST(
  request: NextRequest,
  { params }: RouteParams,
): Promise<
  NextResponse<ApiSuccessResponse<ResetMfaResponse> | ApiErrorResponse>
> {
  try {
    const { id } = await params;
    const auth = await requireAuth();
    if (!auth.success) return auth.response;

    // Delegable since 25 October 2026 (REV-11): the root always holds it, and
    // the service keeps another administrator's MFA reserved to the root.
    const permCheck = requirePermission(auth.user, PERMISSIONS.USERS.RESET_MFA);
    if (!permCheck.success) return permCheck.response;
    if (!auth.session) {
      return apiError(
        ErrorCode.UNAUTHORIZED,
        'Session actuelle introuvable',
        401,
      );
    }

    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.success) return parsedBody.response;
    const validation = resetMfaSchema.safeParse(parsedBody.data);
    if (!validation.success) {
      return apiErrors.validation(
        'Données invalides',
        validation.error.flatten().fieldErrors,
      );
    }

    const user = await resetUserMfaForActor({
      ...validation.data,
      actor: auth.user,
      session: auth.session,
      userId: id,
    });

    return apiSuccess({ user });
  } catch (error) {
    return serviceErrorResponse(error, { action: 'USER_MFA_RESET', request });
  }
}
