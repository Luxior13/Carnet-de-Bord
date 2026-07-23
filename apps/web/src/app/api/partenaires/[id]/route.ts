import type { NextRequest, NextResponse } from 'next/server';

import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import {
  deletePartnerChildSchema,
  updatePartnerSchema,
} from '$features/partners/schemas/partner.schemas';
import {
  deletePartner,
  getPartner,
  updatePartner,
} from '$features/partners/server/partner.service';
import {
  handlePartnerApiError,
  partnerZodErrorDetails,
  withPartnerNoStore,
} from '$features/partners/server/partner-api';
import { assertPartnerFeatureReady } from '$features/partners/server/partner-readiness';
import { requireAuth, requirePermission } from '$server/api-auth';
import { apiErrors, apiSuccess, parseJsonBody } from '$server/api-response';

type Context = { params: Promise<{ id: string }> };

const personAccess = (user: {
  isProtected: boolean;
  permissions: Record<string, boolean> | null;
  role: 'ADMIN' | 'USER';
}): boolean =>
  user.isProtected ||
  hasPermission(user.role, PERMISSIONS.PERSONS.VIEW, user.permissions);

export async function GET(
  _request: NextRequest,
  context: Context,
): Promise<NextResponse> {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const permission = requirePermission(auth.user, PERMISSIONS.PARTNERS.VIEW);
  if (!permission.success) return permission.response;
  try {
    await assertPartnerFeatureReady();
    const { id } = await context.params;

    return withPartnerNoStore(
      apiSuccess(await getPartner(id, personAccess(auth.user))),
    );
  } catch (error) {
    return handlePartnerApiError('PARTNER_GET', error);
  }
}

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
  const parsed = updatePartnerSchema.safeParse(body.data);
  if (!parsed.success) {
    return apiErrors.validation(
      'Informations du partenaire invalides',
      partnerZodErrorDetails(parsed.error),
    );
  }
  try {
    await assertPartnerFeatureReady();
    const { id } = await context.params;

    return withPartnerNoStore(
      apiSuccess({
        partner: await updatePartner(
          id,
          parsed.data,
          auth.user,
          personAccess(auth.user),
        ),
      }),
    );
  } catch (error) {
    return handlePartnerApiError('PARTNER_UPDATE', error, request);
  }
}

export async function DELETE(
  request: NextRequest,
  context: Context,
): Promise<NextResponse> {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const permission = requirePermission(auth.user, PERMISSIONS.PARTNERS.DELETE);
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
  const idempotencyKey = request.headers.get('idempotency-key')?.trim();
  if (!idempotencyKey || idempotencyKey.length > 191) {
    return apiErrors.badRequest("Clé d'idempotence invalide");
  }
  try {
    await assertPartnerFeatureReady();
    const { id } = await context.params;
    await deletePartner({
      actor: auth.user,
      idempotencyKey,
      partnerId: id,
      version: parsed.data.version,
    });

    return withPartnerNoStore(
      new Response(null, { status: 204 }) as NextResponse,
    );
  } catch (error) {
    return handlePartnerApiError('PARTNER_DELETE', error, request);
  }
}
