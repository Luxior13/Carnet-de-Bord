import { NextResponse } from 'next/server';
import { z } from 'zod';

import { PERMISSIONS } from '$constants/permissions.constants';
import { updateOwnContactEmail } from '$features/account/server/contact-email.service';
import { requireAuth, requirePermission } from '$server/api-auth';
import { apiErrors, apiSuccess, parseJsonBody } from '$server/api-response';
import { serviceErrorResponse } from '$server/service-error';
import type { ApiErrorResponse, ApiSuccessResponse } from '$types/api.types';
import type { UserType } from '$types/auth.types';
import { isPasswordWithinLengthLimit } from '$utils/password.utils';

const validContactEmailSchema = z.string().email();
const contactEmailSchema = z.union([
  z.null(),
  z
    .string()
    .trim()
    .max(254, 'Adresse de contact trop longue')
    .refine(
      (value) =>
        value.length === 0 || validContactEmailSchema.safeParse(value).success,
      'Adresse de contact invalide',
    ),
]);

const updateContactEmailSchema = z
  .object({
    contactEmail: contactEmailSchema,
    currentPassword: z
      .string()
      .min(1, 'Le mot de passe actuel est requis')
      .refine(isPasswordWithinLengthLimit, {
        message: 'Mot de passe trop long',
      }),
    expectedUpdatedAt: z
      .string()
      .datetime({ offset: true })
      .transform((value) => new Date(value)),
  })
  .strict();

/** Replaces the signed-in account's own contact address. */
export async function PATCH(
  request: Request,
): Promise<
  NextResponse<ApiSuccessResponse<{ user: UserType }> | ApiErrorResponse>
> {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth.response;
    const permission = requirePermission(
      auth.user,
      PERMISSIONS.ACCOUNT.UPDATE_CONTACT,
    );
    if (!permission.success) return permission.response;

    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.success) return parsedBody.response;
    const validation = updateContactEmailSchema.safeParse(parsedBody.data);
    if (!validation.success) {
      return apiErrors.validation(
        'Données invalides',
        validation.error.flatten().fieldErrors,
      );
    }

    return apiSuccess({
      user: await updateOwnContactEmail(
        auth.user.id,
        auth.session,
        validation.data,
      ),
    });
  } catch (error) {
    return serviceErrorResponse(error, {
      action: 'CONTACT_EMAIL_UPDATE',
      request,
    });
  }
}
