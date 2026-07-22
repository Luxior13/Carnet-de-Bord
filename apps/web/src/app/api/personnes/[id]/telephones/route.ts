import type { NextRequest, NextResponse } from 'next/server';

import { PERMISSIONS } from '$constants/permissions.constants';
import { createPersonPhoneSchema } from '$features/persons/schemas/person.schemas';
import { addPersonPhone } from '$features/persons/server/person.service';
import {
  handlePersonApiError,
  withPrivateNoStore,
  zodErrorDetails,
} from '$features/persons/server/person-api';
import { assertPersonFeatureReady } from '$features/persons/server/person-deletion';
import { requireAuth, requirePermission } from '$server/api-auth';
import { apiErrors, apiSuccess, parseJsonBody } from '$server/api-response';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const permission = requirePermission(auth.user, PERMISSIONS.PERSONS.UPDATE);
  if (!permission.success) return permission.response;
  const body = await parseJsonBody(request);
  if (!body.success) return body.response;
  const parsed = createPersonPhoneSchema.safeParse(body.data);
  if (!parsed.success) {
    return apiErrors.validation(
      'Téléphone invalide',
      zodErrorDetails(parsed.error),
    );
  }
  const { id } = await context.params;

  try {
    await assertPersonFeatureReady();

    return withPrivateNoStore(
      apiSuccess(await addPersonPhone(id, parsed.data, auth.user), 201),
    );
  } catch (error) {
    return handlePersonApiError('PERSON_PHONE_CREATE', error, request);
  }
}
