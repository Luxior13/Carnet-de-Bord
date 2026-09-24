import { PersonsPageClient } from '$features/persons/components/PersonsPageClient';
import { getPersonCapabilities } from '$features/persons/person.permissions';
import type { PersonsListRequest } from '$features/persons/person-list-state';
import { personsListQuerySchema } from '$features/persons/schemas/person.schemas';
import { listPersons } from '$features/persons/server/person.service';
import { assertPersonFeatureReady } from '$features/persons/server/person-deletion';
import { getPageAuthSession } from '$server/auth';

type PersonsPageQuery = {
  cursor?: string | string[];
  q?: string | string[];
  sort?: string | string[];
  structureStatus?: string | string[];
};

type PersonsPageProps = {
  searchParams?: Promise<PersonsPageQuery>;
};

const firstValue = (
  value: string | string[] | undefined,
): string | undefined => (Array.isArray(value) ? value[0] : value);

export default async function PersonsPage({
  searchParams,
}: PersonsPageProps): Promise<React.ReactNode> {
  const [params, { user }] = await Promise.all([
    searchParams ?? Promise.resolve<PersonsPageQuery>({}),
    getPageAuthSession(),
  ]);
  const parsed = personsListQuerySchema.safeParse({
    cursor: firstValue(params.cursor),
    limit: 25,
    q: firstValue(params.q),
    sort: firstValue(params.sort),
    structureStatus: firstValue(params.structureStatus),
  });
  const capabilities = getPersonCapabilities(user);
  let initialState:
    | {
        data: Awaited<ReturnType<typeof listPersons>>;
        request: PersonsListRequest;
      }
    | undefined;

  if (
    user &&
    !user.mustChangePassword &&
    capabilities.canView &&
    parsed.success
  ) {
    try {
      await assertPersonFeatureReady();
      const data = await listPersons(parsed.data);
      initialState = {
        data,
        request: {
          cursor: parsed.data.cursor,
          q: parsed.data.q,
          sort: parsed.data.sort,
          structureStatus: parsed.data.structureStatus,
        },
      };
    } catch {
      // The client preserves the existing unavailable/retry states when the
      // server cannot produce a safe initial snapshot.
    }
  }

  return <PersonsPageClient initialState={initialState} />;
}
