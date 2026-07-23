import type { NextRequest, NextResponse } from 'next/server';

import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import { createPartnerFollowUpSchema } from '$features/partners/schemas/partner.schemas';
import { addPartnerFollowUp } from '$features/partners/server/partner.service';
import {
  handlePartnerApiError,
  partnerZodErrorDetails,
  withPartnerNoStore,
} from '$features/partners/server/partner-api';
import { assertPartnerFeatureReady } from '$features/partners/server/partner-readiness';
import { requireAuth, requirePermission } from '$server/api-auth';
import { apiErrors, apiSuccess, parseJsonBody } from '$server/api-response';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const permission = requirePermission(auth.user, PERMISSIONS.PARTNERS.MANAGE);
  if (!permission.success) return permission.response;
  const body = await parseJsonBody(request);
  if (!body.success) return body.response;
  const parsed = createPartnerFollowUpSchema.safeParse(body.data);
  if (!parsed.success) {
    return apiErrors.validation(
      'Suivi invalide',
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
      apiSuccess({
        partner: await addPartnerFollowUp(
          id,
          parsed.data,
          auth.user,
          canViewPersons,
        ),
      }),
    );
  } catch (error) {
    return handlePartnerApiError('PARTNER_FOLLOW_UP_CREATE', error, request);
  }
}
