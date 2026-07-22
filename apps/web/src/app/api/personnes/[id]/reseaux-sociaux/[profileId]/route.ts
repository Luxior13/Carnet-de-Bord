import type { NextRequest, NextResponse } from 'next/server';

import { PERMISSIONS } from '$constants/permissions.constants';
import {
  deletePersonChildSchema,
  updatePersonSocialProfileSchema,
} from '$features/persons/schemas/person.schemas';
import {
  deletePersonSocialProfile,
  updatePersonSocialProfile,
} from '$features/persons/server/person.service';
import {
  handlePersonApiError,
  withPrivateNoStore,
  zodErrorDetails,
} from '$features/persons/server/person-api';
import { assertPersonFeatureReady } from '$features/persons/server/person-deletion';
import { requireAuth, requirePermission } from '$server/api-auth';
import { apiErrors, apiSuccess, parseJsonBody } from '$server/api-response';

type RouteContext = { params: Promise<{ id: string; profileId: string }> };

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const permission = requirePermission(auth.user, PERMISSIONS.PERSONS.UPDATE);
  if (!permission.success) return permission.response;
  const body = await parseJsonBody(request);
  if (!body.success) return body.response;
  const parsed = updatePersonSocialProfileSchema.safeParse(body.data);
  if (!parsed.success) {
    return apiErrors.validation(
      'Profil social invalide',
      zodErrorDetails(parsed.error),
    );
  }
  const { id, profileId } = await context.params;

  try {
    await assertPersonFeatureReady();

    return withPrivateNoStore(
      apiSuccess(
        await updatePersonSocialProfile(id, profileId, parsed.data, auth.user),
      ),
    );
  } catch (error) {
    return handlePersonApiError('PERSON_SOCIAL_UPDATE', error, request);
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const permission = requirePermission(auth.user, PERMISSIONS.PERSONS.UPDATE);
  if (!permission.success) return permission.response;
  const body = await parseJsonBody(request);
  if (!body.success) return body.response;
  const parsed = deletePersonChildSchema.safeParse(body.data);
  if (!parsed.success) {
    return apiErrors.validation(
      'Suppression invalide',
      zodErrorDetails(parsed.error),
    );
  }
  const { id, profileId } = await context.params;

  try {
    await assertPersonFeatureReady();

    return withPrivateNoStore(
      apiSuccess({
        person: await deletePersonSocialProfile(
          id,
          profileId,
          parsed.data,
          auth.user,
        ),
      }),
    );
  } catch (error) {
    return handlePersonApiError('PERSON_SOCIAL_DELETE', error, request);
  }
}
