import type { NextRequest, NextResponse } from 'next/server';

import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import {
  createPartnerSchema,
  partnersListQuerySchema,
} from '$features/partners/schemas/partner.schemas';
import {
  createPartner,
  listPartners,
} from '$features/partners/server/partner.service';
import {
  handlePartnerApiError,
  partnerZodErrorDetails,
  withPartnerNoStore,
} from '$features/partners/server/partner-api';
import { assertPartnerFeatureReady } from '$features/partners/server/partner-readiness';
import { requireAuth, requirePermission } from '$server/api-auth';
import { apiErrors, apiSuccess, parseJsonBody } from '$server/api-response';

const canViewPersons = (
  user: Awaited<ReturnType<typeof requireAuth>>,
): boolean =>
  user.success &&
  (user.user.isProtected ||
    hasPermission(
      user.user.role,
      PERMISSIONS.PERSONS.VIEW,
      user.user.permissions,
    ));

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const permission = requirePermission(auth.user, PERMISSIONS.PARTNERS.VIEW);
  if (!permission.success) return permission.response;
  const params = request.nextUrl.searchParams;
  const parsed = partnersListQuerySchema.safeParse({
    category: params.get('category') ?? undefined,
    cursor: params.get('cursor') ?? undefined,
    limit: params.get('limit') ?? undefined,
    q: params.get('q') ?? undefined,
    sort: params.get('sort') ?? undefined,
    status: params.get('status') ?? undefined,
  });
  if (!parsed.success) {
    return apiErrors.validation(
      'Paramètres de recherche invalides',
      partnerZodErrorDetails(parsed.error),
    );
  }
  try {
    await assertPartnerFeatureReady();

    return withPartnerNoStore(
      apiSuccess(await listPartners(parsed.data, canViewPersons(auth))),
    );
  } catch (error) {
    return handlePartnerApiError('PARTNER_LIST', error, request);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const permission = requirePermission(auth.user, PERMISSIONS.PARTNERS.MANAGE);
  if (!permission.success) return permission.response;
  const body = await parseJsonBody(request);
  if (!body.success) return body.response;
  const parsed = createPartnerSchema.safeParse(body.data);
  if (!parsed.success) {
    return apiErrors.validation(
      'Informations du partenaire invalides',
      partnerZodErrorDetails(parsed.error),
    );
  }
  try {
    await assertPartnerFeatureReady();

    return withPartnerNoStore(
      apiSuccess(
        await createPartner(parsed.data, auth.user, canViewPersons(auth)),
        201,
      ),
    );
  } catch (error) {
    return handlePartnerApiError('PARTNER_CREATE', error, request);
  }
}
