import { type NextRequest, NextResponse } from 'next/server';

import { PERMISSIONS } from '$constants/permissions.constants';
import {
  deletePersonSchema,
  updatePersonSchema,
} from '$features/persons/schemas/person.schemas';
import {
  getPerson,
  updatePerson,
} from '$features/persons/server/person.service';
import {
  handlePersonApiError,
  withPrivateNoStore,
  zodErrorDetails,
} from '$features/persons/server/person-api';
import {
  assertPersonFeatureReady,
  deletePerson,
} from '$features/persons/server/person-deletion';
import { requireAuth, requirePermission } from '$server/api-auth';
import { apiErrors, apiSuccess, parseJsonBody } from '$server/api-response';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const permission = requirePermission(auth.user, PERMISSIONS.PERSONS.VIEW);
  if (!permission.success) return permission.response;
  const { id } = await context.params;

  try {
    await assertPersonFeatureReady();

    return withPrivateNoStore(apiSuccess(await getPerson(id)));
  } catch (error) {
    return withPrivateNoStore(
      await handlePersonApiError('PERSON_GET', error, request),
    );
  }
}

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
  const parsed = updatePersonSchema.safeParse(body.data);
  if (!parsed.success) {
    return apiErrors.validation(
      'Informations de la fiche invalides',
      zodErrorDetails(parsed.error),
    );
  }
  const { id } = await context.params;

  try {
    await assertPersonFeatureReady();

    return withPrivateNoStore(
      apiSuccess({ person: await updatePerson(id, parsed.data, auth.user) }),
    );
  } catch (error) {
    return handlePersonApiError('PERSON_UPDATE', error, request);
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const permission = requirePermission(auth.user, PERMISSIONS.PERSONS.DELETE);
  if (!permission.success) return permission.response;
  const idempotencyKey = request.headers.get('Idempotency-Key')?.trim() ?? '';
  if (
    idempotencyKey.length < 8 ||
    idempotencyKey.length > 191 ||
    !/^[\w.:-]+$/.test(idempotencyKey)
  ) {
    return apiErrors.validation("Clé d'idempotence invalide");
  }
  const body = await parseJsonBody(request);
  if (!body.success) return body.response;
  const parsed = deletePersonSchema.safeParse(body.data);
  if (!parsed.success) {
    return apiErrors.validation(
      'Suppression invalide',
      zodErrorDetails(parsed.error),
    );
  }
  const { id } = await context.params;

  try {
    await assertPersonFeatureReady();
    await deletePerson({
      actor: auth.user,
      idempotencyKey,
      personId: id,
      version: parsed.data.version,
    });

    return withPrivateNoStore(new NextResponse(null, { status: 204 }));
  } catch (error) {
    return handlePersonApiError('PERSON_DELETE', error, request);
  }
}
