import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import { PartnersPageClient } from '$features/partners/components/PartnersPageClient';
import type { PartnersListFilters } from '$features/partners/partner-list-state';
import { partnersListQuerySchema } from '$features/partners/schemas/partner.schemas';
import { listPartners } from '$features/partners/server/partner.service';
import { isPartnerSchemaReady } from '$features/partners/server/partner-readiness';
import { getPageAuthSession } from '$server/auth';

type PartnersPageQuery = {
  category?: string | string[];
  q?: string | string[];
  sort?: string | string[];
  status?: string | string[];
};

type PartnersPageProps = {
  searchParams?: Promise<PartnersPageQuery>;
};

const firstValue = (
  value: string | string[] | undefined,
): string | undefined => (Array.isArray(value) ? value[0] : value);

export default async function PartnersPage({
  searchParams,
}: PartnersPageProps): Promise<React.ReactNode> {
  const [params, auth] = await Promise.all([
    searchParams ?? Promise.resolve<PartnersPageQuery>({}),
    getPageAuthSession(),
  ]);
  const parsed = partnersListQuerySchema.safeParse({
    category: firstValue(params.category),
    q: firstValue(params.q),
    sort: firstValue(params.sort),
    status: firstValue(params.status),
  });
  const canViewPartners = Boolean(
    auth.user &&
    !auth.user.mustChangePassword &&
    (auth.user.isProtected ||
      hasPermission(
        auth.user.role,
        PERMISSIONS.PARTNERS.VIEW,
        auth.user.permissions,
      )),
  );
  const canViewPersons = Boolean(
    auth.user &&
    (auth.user.isProtected ||
      hasPermission(
        auth.user.role,
        PERMISSIONS.PERSONS.VIEW,
        auth.user.permissions,
      )),
  );
  let initialState:
    | {
        data: Awaited<ReturnType<typeof listPartners>>;
        filters: PartnersListFilters;
      }
    | undefined;

  if (canViewPartners && parsed.success) {
    try {
      const [ready, data] = await Promise.all([
        isPartnerSchemaReady(),
        listPartners(parsed.data, canViewPersons),
      ]);
      if (ready) {
        initialState = {
          data,
          filters: {
            category: parsed.data.category,
            q: parsed.data.q,
            sort: parsed.data.sort,
            status: parsed.data.status,
          },
        };
      }
    } catch {
      // The client keeps the established unavailable/error states when the
      // database cannot provide a safe initial snapshot.
    }
  }

  return <PartnersPageClient initialState={initialState} />;
}
