import type { NextRequest, NextResponse } from 'next/server';

import { PERMISSIONS } from '$constants/permissions.constants';
import {
  createPersonSchema,
  personsListQuerySchema,
} from '$features/persons/schemas/person.schemas';
import {
  createPerson,
  listPersons,
} from '$features/persons/server/person.service';
import {
  handlePersonApiError,
  withPrivateNoStore,
  zodErrorDetails,
} from '$features/persons/server/person-api';
import { assertPersonFeatureReady } from '$features/persons/server/person-deletion';
import { requireAuth, requirePermission } from '$server/api-auth';
import { apiErrors, apiSuccess, parseJsonBody } from '$server/api-response';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const permission = requirePermission(auth.user, PERMISSIONS.PERSONS.VIEW);
  if (!permission.success) return permission.response;

  const searchParams = request.nextUrl.searchParams;
  const parsed = personsListQuerySchema.safeParse({
    cursor: searchParams.get('cursor') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
    q: searchParams.get('q') ?? undefined,
    structureStatus: searchParams.get('structureStatus') ?? undefined,
  });
  if (!parsed.success) {
    return apiErrors.validation(
      'Paramètres de recherche invalides',
      zodErrorDetails(parsed.error),
    );
  }

  try {
    await assertPersonFeatureReady();

    return withPrivateNoStore(apiSuccess(await listPersons(parsed.data)));
  } catch (error) {
    return handlePersonApiError('PERSON_LIST', error, request);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const permission = requirePermission(auth.user, PERMISSIONS.PERSONS.CREATE);
  if (!permission.success) return permission.response;
  const body = await parseJsonBody(request);
  if (!body.success) return body.response;
  const parsed = createPersonSchema.safeParse(body.data);
  if (!parsed.success) {
    return apiErrors.validation(
      'Informations de la personne invalides',
      zodErrorDetails(parsed.error),
    );
  }

  try {
    await assertPersonFeatureReady();

    return withPrivateNoStore(
      apiSuccess(await createPerson(parsed.data, auth.user), 201),
    );
  } catch (error) {
    return handlePersonApiError('PERSON_CREATE', error, request);
  }
}
