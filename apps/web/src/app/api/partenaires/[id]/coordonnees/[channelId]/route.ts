import type { NextRequest, NextResponse } from 'next/server';

import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import {
  deletePartnerChannelSchema,
  updatePartnerChannelSchema,
} from '$features/partners/schemas/partner.schemas';
import {
  deletePartnerChannel,
  updatePartnerChannel,
} from '$features/partners/server/partner.service';
import {
  handlePartnerApiError,
  partnerZodErrorDetails,
  withPartnerNoStore,
} from '$features/partners/server/partner-api';
import { assertPartnerFeatureReady } from '$features/partners/server/partner-readiness';
import { requireAuth, requirePermission } from '$server/api-auth';
import { apiErrors, apiSuccess, parseJsonBody } from '$server/api-response';

type Context = { params: Promise<{ channelId: string; id: string }> };

const canViewPersons = (user: {
  isProtected: boolean;
  permissions: Record<string, boolean> | null;
  role: 'ADMIN' | 'USER';
}): boolean =>
  user.isProtected ||
  hasPermission(user.role, PERMISSIONS.PERSONS.VIEW, user.permissions);

export async function PATCH(
  request: NextRequest,
  context: Context,
): Promise<NextResponse> {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const permission = requirePermission(auth.user, PERMISSIONS.PARTNERS.MANAGE);
  if (!permission.success) return permission.response;
  const body = await parseJsonBody(request);
  if (!body.success) return body.response;
  const parsed = updatePartnerChannelSchema.safeParse(body.data);
  if (!parsed.success) {
    return apiErrors.validation(
      'Coordonnée invalide',
      partnerZodErrorDetails(parsed.error),
    );
  }
  try {
    await assertPartnerFeatureReady();
    const { channelId, id } = await context.params;

    return withPartnerNoStore(
      apiSuccess({
        partner: await updatePartnerChannel(
          id,
          channelId,
          parsed.data,
          auth.user,
          canViewPersons(auth.user),
        ),
      }),
    );
  } catch (error) {
    return handlePartnerApiError('PARTNER_CHANNEL_UPDATE', error, request);
  }
}

export async function DELETE(
  request: NextRequest,
  context: Context,
): Promise<NextResponse> {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const permission = requirePermission(auth.user, PERMISSIONS.PARTNERS.MANAGE);
  if (!permission.success) return permission.response;
  const body = await parseJsonBody(request);
  if (!body.success) return body.response;
  const parsed = deletePartnerChannelSchema.safeParse(body.data);
  if (!parsed.success) {
    return apiErrors.validation(
      'Suppression invalide',
      partnerZodErrorDetails(parsed.error),
    );
  }
  try {
    await assertPartnerFeatureReady();
    const { channelId, id } = await context.params;

    return withPartnerNoStore(
      apiSuccess({
        partner: await deletePartnerChannel(
          id,
          channelId,
          parsed.data,
          auth.user,
          canViewPersons(auth.user),
        ),
      }),
    );
  } catch (error) {
    return handlePartnerApiError('PARTNER_CHANNEL_DELETE', error, request);
  }
}
