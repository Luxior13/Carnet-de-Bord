import type { NextRequest, NextResponse } from 'next/server';

import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import { partnerTimelineQuerySchema } from '$features/partners/schemas/partner.schemas';
import {
  handlePartnerApiError,
  partnerZodErrorDetails,
  withPartnerNoStore,
} from '$features/partners/server/partner-api';
import { assertPartnerFeatureReady } from '$features/partners/server/partner-readiness';
import { listPartnerTimeline } from '$features/partners/server/partner-timeline.service';
import { requireAuth, requirePermission } from '$server/api-auth';
import { apiErrors, apiSuccess } from '$server/api-response';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const permission = requirePermission(auth.user, PERMISSIONS.PARTNERS.VIEW);
  if (!permission.success) return permission.response;

  const parsed = partnerTimelineQuerySchema.safeParse({
    cursor: request.nextUrl.searchParams.get('cursor') ?? undefined,
    limit: request.nextUrl.searchParams.get('limit') ?? undefined,
  });
  if (!parsed.success) {
    return apiErrors.validation(
      'Pagination du suivi invalide',
      partnerZodErrorDetails(parsed.error),
    );
  }

  try {
    await assertPartnerFeatureReady();
    const { id } = await context.params;
    const canViewPersons =
      auth.user.isProtected ||
      hasPermission(
        auth.user.role,
        PERMISSIONS.PERSONS.VIEW,
        auth.user.permissions,
      );

    return withPartnerNoStore(
      apiSuccess(await listPartnerTimeline(id, parsed.data, canViewPersons)),
    );
  } catch (error) {
    return handlePartnerApiError('PARTNER_TIMELINE_LIST', error, request);
  }
}
