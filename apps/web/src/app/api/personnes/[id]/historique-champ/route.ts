import type { NextRequest, NextResponse } from 'next/server';

import { PERMISSIONS } from '$constants/permissions.constants';
import { personFieldHistoryQuerySchema } from '$features/persons/schemas/person.schemas';
import { getPersonFieldHistory } from '$features/persons/server/person.service';
import {
  handlePersonApiError,
  withPrivateNoStore,
  zodErrorDetails,
} from '$features/persons/server/person-api';
import { assertPersonFeatureReady } from '$features/persons/server/person-deletion';
import { requireAuth, requirePermission } from '$server/api-auth';
import { apiErrors, apiSuccess } from '$server/api-response';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  for (const permissionKey of [
    PERMISSIONS.AUDIT.VIEW_FIELD_HISTORY,
    PERMISSIONS.PERSONS.VIEW,
  ]) {
    const permission = requirePermission(auth.user, permissionKey);
    if (!permission.success) return permission.response;
  }

  const params = request.nextUrl.searchParams;
  const parsed = personFieldHistoryQuerySchema.safeParse({
    fieldKey: params.get('fieldKey') ?? undefined,
    recordId: params.get('recordId') ?? undefined,
    sectionKey: params.get('sectionKey') ?? undefined,
  });
  if (!parsed.success) {
    return apiErrors.validation(
      "Paramètres d'historique invalides",
      zodErrorDetails(parsed.error),
    );
  }
  const { id } = await context.params;

  try {
    await assertPersonFeatureReady();

    return withPrivateNoStore(
      apiSuccess(await getPersonFieldHistory(id, parsed.data)),
    );
  } catch (error) {
    return withPrivateNoStore(
      await handlePersonApiError('PERSON_FIELD_HISTORY', error, request),
    );
  }
}
