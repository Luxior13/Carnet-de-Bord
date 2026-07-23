import type { NextRequest, NextResponse } from 'next/server';

import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import {
  deletePartnerChildSchema,
  updatePartnerFollowUpSchema,
} from '$features/partners/schemas/partner.schemas';
import {
  deletePartnerFollowUp,
  updatePartnerFollowUp,
} from '$features/partners/server/partner.service';
import {
  handlePartnerApiError,
  partnerZodErrorDetails,
  withPartnerNoStore,
} from '$features/partners/server/partner-api';
import { assertPartnerFeatureReady } from '$features/partners/server/partner-readiness';
import { requireAuth, requirePermission } from '$server/api-auth';
import { apiErrors, apiSuccess, parseJsonBody } from '$server/api-response';

const canViewPersons = (user: {
  isProtected: boolean;
  permissions: Record<string, boolean> | null;
  role: 'ADMIN' | 'USER';
}): boolean =>
  user.isProtected ||
  hasPermission(user.role, PERMISSIONS.PERSONS.VIEW, user.permissions);

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ entryId: string; id: string }> },
): Promise<NextResponse> {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const permission = requirePermission(auth.user, PERMISSIONS.PARTNERS.MANAGE);
  if (!permission.success) return permission.response;
  const body = await parseJsonBody(request);
  if (!body.success) return body.response;
  const parsed = updatePartnerFollowUpSchema.safeParse(body.data);
  if (!parsed.success) {
    return apiErrors.validation(
      'Suivi invalide',
      partnerZodErrorDetails(parsed.error),
    );
  }
  try {
    await assertPartnerFeatureReady();
    const { entryId, id } = await context.params;

    return withPartnerNoStore(
      apiSuccess({
        partner: await updatePartnerFollowUp(
          id,
          entryId,
          parsed.data,
          auth.user,
          canViewPersons(auth.user),
        ),
      }),
    );
  } catch (error) {
    return handlePartnerApiError('PARTNER_FOLLOW_UP_UPDATE', error, request);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ entryId: string; id: string }> },
): Promise<NextResponse> {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const permission = requirePermission(auth.user, PERMISSIONS.PARTNERS.MANAGE);
  if (!permission.success) return permission.response;
  const body = await parseJsonBody(request);
  if (!body.success) return body.response;
  const parsed = deletePartnerChildSchema.safeParse(body.data);
  if (!parsed.success) {
    return apiErrors.validation(
      'Confirmation invalide',
      partnerZodErrorDetails(parsed.error),
    );
  }
  try {
    await assertPartnerFeatureReady();
    const { entryId, id } = await context.params;

    return withPartnerNoStore(
      apiSuccess({
        partner: await deletePartnerFollowUp(
          id,
          entryId,
          parsed.data.version,
          auth.user,
          canViewPersons(auth.user),
        ),
      }),
    );
  } catch (error) {
    return handlePartnerApiError('PARTNER_FOLLOW_UP_DELETE', error, request);
  }
}
