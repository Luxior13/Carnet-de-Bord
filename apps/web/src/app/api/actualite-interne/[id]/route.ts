import type { NextRequest, NextResponse } from 'next/server';

import { PERMISSIONS } from '$constants/permissions.constants';
import { updateInternalAnnouncementPinSchema } from '$features/internal-news/internal-news.schemas';
import { updateInternalAnnouncementPin } from '$features/internal-news/server/internal-news.service';
import {
  handleInternalNewsApiError,
  internalNewsZodErrorDetails,
  withInternalNewsNoStore,
} from '$features/internal-news/server/internal-news-api';
import { assertInternalNewsFeatureReady } from '$features/internal-news/server/internal-news-readiness';
import { requireAuth, requirePermission } from '$server/api-auth';
import { apiErrors, apiSuccess, parseJsonBody } from '$server/api-response';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const permission = requirePermission(
    auth.user,
    PERMISSIONS.INTERNAL_NEWS.MANAGE,
  );
  if (!permission.success) return permission.response;

  const body = await parseJsonBody(request);
  if (!body.success) return body.response;
  const parsed = updateInternalAnnouncementPinSchema.safeParse(body.data);
  if (!parsed.success) {
    return apiErrors.validation(
      "Modification de l'actualité interne invalide",
      internalNewsZodErrorDetails(parsed.error),
    );
  }
  const { id } = await context.params;
  if (!id || id.length > 191) {
    return apiErrors.validation('Identifiant invalide');
  }

  try {
    await assertInternalNewsFeatureReady();

    return withInternalNewsNoStore(
      apiSuccess(
        await updateInternalAnnouncementPin(
          id,
          parsed.data.isPinned,
          auth.user,
        ),
      ),
    );
  } catch (error) {
    return handleInternalNewsApiError(
      'INTERNAL_NEWS_PIN_UPDATE',
      error,
      request,
    );
  }
}
