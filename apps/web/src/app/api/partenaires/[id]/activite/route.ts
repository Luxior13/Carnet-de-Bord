import type { NextRequest, NextResponse } from 'next/server';

import { PERMISSIONS } from '$constants/permissions.constants';
import { getPartnerActivity } from '$features/partners/server/partner.service';
import {
  handlePartnerApiError,
  withPartnerNoStore,
} from '$features/partners/server/partner-api';
import { assertPartnerFeatureReady } from '$features/partners/server/partner-readiness';
import { requireAuth, requirePermission } from '$server/api-auth';
import { apiSuccess } from '$server/api-response';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const permission = requirePermission(auth.user, PERMISSIONS.PARTNERS.VIEW);
  if (!permission.success) return permission.response;
  try {
    await assertPartnerFeatureReady();
    const { id } = await context.params;

    return withPartnerNoStore(apiSuccess(await getPartnerActivity(id)));
  } catch (error) {
    return handlePartnerApiError('PARTNER_ACTIVITY', error, request);
  }
}
