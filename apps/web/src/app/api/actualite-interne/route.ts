import type { NextRequest, NextResponse } from 'next/server';

import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import {
  internalNewsListQuerySchema,
  publishInternalAnnouncementSchema,
} from '$features/internal-news/internal-news.schemas';
import {
  listInternalNews,
  publishInternalAnnouncement,
} from '$features/internal-news/server/internal-news.service';
import {
  handleInternalNewsApiError,
  internalNewsZodErrorDetails,
  withInternalNewsNoStore,
} from '$features/internal-news/server/internal-news-api';
import { assertInternalNewsFeatureReady } from '$features/internal-news/server/internal-news-readiness';
import { requireAuth, requirePermission } from '$server/api-auth';
import { apiErrors, apiSuccess, parseJsonBody } from '$server/api-response';

const canViewPartners = (
  user: Awaited<ReturnType<typeof requireAuth>>,
): boolean =>
  user.success &&
  (user.user.isProtected ||
    hasPermission(
      user.user.role,
      PERMISSIONS.PARTNERS.VIEW,
      user.user.permissions,
    ));

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const permission = requirePermission(
    auth.user,
    PERMISSIONS.INTERNAL_NEWS.VIEW,
  );
  if (!permission.success) return permission.response;

  const params = request.nextUrl.searchParams;
  const parsed = internalNewsListQuerySchema.safeParse({
    cursor: params.get('cursor') ?? undefined,
    filter: params.get('filter') ?? undefined,
    limit: params.get('limit') ?? undefined,
  });
  if (!parsed.success) {
    return apiErrors.validation(
      "Paramètres de l'actualité interne invalides",
      internalNewsZodErrorDetails(parsed.error),
    );
  }

  try {
    await assertInternalNewsFeatureReady();

    return withInternalNewsNoStore(
      apiSuccess(
        await listInternalNews(parsed.data, {
          canViewPartners: canViewPartners(auth),
        }),
      ),
    );
  } catch (error) {
    return handleInternalNewsApiError('INTERNAL_NEWS_LIST', error, request);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const permission = requirePermission(
    auth.user,
    PERMISSIONS.INTERNAL_NEWS.MANAGE,
  );
  if (!permission.success) return permission.response;

  const body = await parseJsonBody(request);
  if (!body.success) return body.response;
  const parsed = publishInternalAnnouncementSchema.safeParse(body.data);
  if (!parsed.success) {
    return apiErrors.validation(
      'Actualité interne invalide',
      internalNewsZodErrorDetails(parsed.error),
    );
  }

  try {
    await assertInternalNewsFeatureReady();

    return withInternalNewsNoStore(
      apiSuccess(
        await publishInternalAnnouncement(parsed.data, auth.user),
        201,
      ),
    );
  } catch (error) {
    return handleInternalNewsApiError('INTERNAL_NEWS_PUBLISH', error, request);
  }
}
