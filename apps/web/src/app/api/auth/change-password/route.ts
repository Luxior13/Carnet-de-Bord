import { NextResponse } from 'next/server';
import { z } from 'zod';

import { changeOwnPassword } from '$features/auth/server/password-change.service';
import { apiError, apiErrors, parseJsonBody } from '$server/api-response';
import { isSecurityVersionMismatchError } from '$server/auth-errors';
import { serviceErrorResponse } from '$server/service-error';
import { deleteSessionCookie, getAuthSession } from '$server/session';
import { type ApiErrorResponse, ErrorCode } from '$types/api.types';

const changePasswordSchema = z
  .object({
    confirmPassword: z
      .string()
      .min(1, 'La confirmation du mot de passe est requise'),
    currentPassword: z.string().optional(),
    newPassword: z.string().min(1, 'Le nouveau mot de passe est requis'),
  })
  .strict();

/**
 * Changes the signed-in account's password. It reads the session directly:
 * an account that must replace a temporary password is otherwise blocked by
 * `requireAuth`.
 */
export async function POST(
  request: Request,
): Promise<NextResponse<{ success: true } | ApiErrorResponse>> {
  try {
    const { session, user } = await getAuthSession();
    if (!session || !user)
      return apiError(ErrorCode.UNAUTHORIZED, 'Non autorisé', 401);

    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.success) return parsedBody.response;
    const validation = changePasswordSchema.safeParse(parsedBody.data);
    if (!validation.success) {
      return apiErrors.validation(
        'Données invalides',
        validation.error.flatten().fieldErrors,
      );
    }

    await changeOwnPassword(user, session, validation.data);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (isSecurityVersionMismatchError(error)) await deleteSessionCookie();

    return serviceErrorResponse(error, {
      action: 'CHANGE_PASSWORD',
      request,
      sessionExpiredMessage:
        'Votre session a expiré. Veuillez vous reconnecter.',
    });
  }
}
