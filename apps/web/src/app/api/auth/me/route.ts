import { NextResponse } from 'next/server';
import { z } from 'zod';

import { PERMISSIONS } from '$constants/permissions.constants';
import { updateOwnProfile } from '$features/account/server/profile.service';
import { requireAuth, requirePermission } from '$server/api-auth';
import { apiErrors, apiSuccess, parseJsonBody } from '$server/api-response';
import { serviceErrorResponse } from '$server/service-error';
import type { ApiErrorResponse, ApiSuccessResponse } from '$types/api.types';
import type { UserType } from '$types/auth.types';
import { trimmedStringMinMax } from '$utils/zod.utils';

type MeResponseData = {
  session: {
    expiresAt: string;
    idleExpiresAt: string;
    lastSeenAt: string;
    rememberMe: boolean;
  } | null;
  user: UserType;
};

const updateProfileSchema = z
  .object({
    expectedUpdatedAt: z
      .string()
      .datetime({ offset: true })
      .transform((value) => new Date(value)),
    firstName: trimmedStringMinMax(
      1,
      50,
      'Le prénom est requis',
      'Prénom trop long',
    ),
    lastName: trimmedStringMinMax(0, 50, undefined, 'Nom trop long'),
  })
  .strict();

/** The signed-in account and its session deadlines. */
export async function GET(
  request: Request,
): Promise<
  NextResponse<ApiSuccessResponse<MeResponseData> | ApiErrorResponse>
> {
  try {
    const auth = await requireAuth({ allowPasswordChangeRequired: true });
    if (!auth.success) return auth.response;
    const { session, user } = auth;

    return apiSuccess({
      session: session
        ? {
            expiresAt: session.expiresAt.toISOString(),
            idleExpiresAt: session.idleExpiresAt.toISOString(),
            lastSeenAt: session.lastSeenAt.toISOString(),
            rememberMe: session.rememberMe,
          }
        : null,
      user,
    });
  } catch (error) {
    return serviceErrorResponse(error, { action: 'ME_GET', request });
  }
}

/** Updates the signed-in account's own first and last name. */
export async function PATCH(
  request: Request,
): Promise<
  NextResponse<ApiSuccessResponse<{ user: UserType }> | ApiErrorResponse>
> {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth.response;

    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.success) return parsedBody.response;
    const validation = updateProfileSchema.safeParse(parsedBody.data);
    if (!validation.success) {
      return apiErrors.validation(
        'Données invalides',
        validation.error.flatten().fieldErrors,
      );
    }

    const permission = requirePermission(
      auth.user,
      PERMISSIONS.ACCOUNT.UPDATE_PROFILE,
    );
    if (!permission.success) return permission.response;

    return apiSuccess({
      user: await updateOwnProfile(auth.user, auth.session, validation.data),
    });
  } catch (error) {
    return serviceErrorResponse(error, { action: 'ME_UPDATE', request });
  }
}
