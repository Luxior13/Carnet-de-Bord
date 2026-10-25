import { NextRequest, NextResponse } from 'next/server';

import { PERMISSIONS } from '$constants/permissions.constants';
import {
  deleteUserForActor,
  updateUserForActor,
} from '$features/users/server/user-admin.service';
import { getUserForActor } from '$features/users/server/user-detail.service';
import { updateUserSchema } from '$features/users/user-update.schema';
import { requireAuth, requirePermission } from '$server/api-auth';
import { apiErrors, apiSuccess, parseJsonBody } from '$server/api-response';
import { serviceErrorResponse } from '$server/service-error';
import type { ApiErrorResponse, ApiSuccessResponse } from '$types/api.types';
import type { UserType } from '$types/auth.types';

type RouteParams = {
  params: Promise<{ id: string }>;
};

/** GET /api/users/[id]: one account, projected for the actor. */
export async function GET(
  request: NextRequest,
  { params }: RouteParams,
): Promise<
  NextResponse<ApiSuccessResponse<{ user: UserType }> | ApiErrorResponse>
> {
  try {
    const { id } = await params;
    const auth = await requireAuth();
    if (!auth.success) return auth.response;
    const permCheck = requirePermission(auth.user, PERMISSIONS.USERS.VIEW);
    if (!permCheck.success) return permCheck.response;

    const user = await getUserForActor(id, auth.user);
    if (!user) return apiErrors.notFound('Utilisateur non trouvé');

    return apiSuccess({ user });
  } catch (error) {
    return serviceErrorResponse(error, { action: 'USER_GET', request });
  }
}

/** PATCH /api/users/[id]: delegated update; each field has its permission. */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams,
): Promise<
  NextResponse<ApiSuccessResponse<{ user: UserType }> | ApiErrorResponse>
> {
  try {
    const { id } = await params;
    const auth = await requireAuth();
    if (!auth.success) return auth.response;

    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.success) return parsedBody.response;
    const validation = updateUserSchema.safeParse(parsedBody.data);
    if (!validation.success) {
      return apiErrors.validation(
        'Données invalides',
        validation.error.flatten().fieldErrors,
      );
    }

    const user = await updateUserForActor(
      { actor: auth.user, session: auth.session },
      id,
      validation.data,
    );

    return apiSuccess({ user });
  } catch (error) {
    return serviceErrorResponse(error, { action: 'USER_UPDATE', request });
  }
}

/** DELETE /api/users/[id]: irreversibly deletes and anonymizes the account. */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams,
): Promise<
  NextResponse<ApiSuccessResponse<{ message: string }> | ApiErrorResponse>
> {
  try {
    const { id } = await params;
    const auth = await requireAuth();
    if (!auth.success) return auth.response;
    const permCheck = requirePermission(
      auth.user,
      PERMISSIONS.USERS.DELETE_ACCOUNT,
    );
    if (!permCheck.success) return permCheck.response;

    await deleteUserForActor({ actor: auth.user, session: auth.session }, id);

    return apiSuccess({ message: 'Utilisateur supprimé définitivement' });
  } catch (error) {
    return serviceErrorResponse(error, { action: 'USER_DELETE', request });
  }
}
