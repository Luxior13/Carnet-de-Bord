import type { NextRequest, NextResponse } from 'next/server';

import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import { createPartnerContactSchema } from '$features/partners/schemas/partner.schemas';
import { addPartnerContact } from '$features/partners/server/partner.service';
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
  for (const key of [PERMISSIONS.PARTNERS.MANAGE, PERMISSIONS.PERSONS.VIEW]) {
    const permission = requirePermission(auth.user, key);
    if (!permission.success) return permission.response;
  }
  const body = await parseJsonBody(request);
  if (!body.success) return body.response;
  const parsed = createPartnerContactSchema.safeParse(body.data);
  if (!parsed.success) {
    return apiErrors.validation(
      'Contact invalide',
      partnerZodErrorDetails(parsed.error),
    );
  }
  try {
    await assertPartnerFeatureReady();
    const { id } = await context.params;

    return withPartnerNoStore(
      apiSuccess({
        partner: await addPartnerContact(
          id,
          parsed.data,
          auth.user,
          auth.user.isProtected ||
            hasPermission(
              auth.user.role,
              PERMISSIONS.PERSONS.VIEW,
              auth.user.permissions,
            ),
        ),
      }),
    );
  } catch (error) {
    return handlePartnerApiError('PARTNER_CONTACT_CREATE', error, request);
  }
}
