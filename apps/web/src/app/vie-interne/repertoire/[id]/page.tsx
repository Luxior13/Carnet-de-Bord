import React from 'react';

import {
  PersonDetailPage,
  type PersonDetailSection,
} from '$features/persons/components/PersonDetailPage';
import { getPersonCapabilities } from '$features/persons/person.permissions';
import { getPerson } from '$features/persons/server/person.service';
import { assertPersonFeatureReady } from '$features/persons/server/person-deletion';
import type { PersonDetail } from '$features/persons/types/person.types';
import { getPageAuthSession } from '$server/auth';

type PersonPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    returnTo?: string | string[];
    section?: string | string[];
  }>;
};

const DIRECTORY_PATH = '/vie-interne/repertoire';

const getSafeReturnHref = (value: string | string[] | undefined): string => {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate?.startsWith('/')) return DIRECTORY_PATH;
  try {
    const parsed = new URL(candidate, 'https://team-control.local');
    if (
      parsed.origin !== 'https://team-control.local' ||
      parsed.pathname !== DIRECTORY_PATH
    ) {
      return DIRECTORY_PATH;
    }

    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return DIRECTORY_PATH;
  }
};

export default async function PersonPage({
  params,
  searchParams,
}: PersonPageProps): Promise<React.ReactNode> {
  const [{ id }, query, { user }]: [
    { id: string },
    { returnTo?: string | string[]; section?: string | string[] },
    Awaited<ReturnType<typeof getPageAuthSession>>,
  ] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({}),
    getPageAuthSession(),
  ]);
  const activeSection: PersonDetailSection =
    query.section === 'coordonnees' ? 'coordonnees' : 'identite';
  const capabilities = getPersonCapabilities(user);
  let initialPerson: PersonDetail | undefined;

  if (user && !user.mustChangePassword && capabilities.canView) {
    try {
      await assertPersonFeatureReady();
      initialPerson = await getPerson(id);
    } catch {
      // The client preserves the established not-found/unavailable/retry
      // states when the server cannot produce a safe initial snapshot.
    }
  }

  return (
    <PersonDetailPage
      activeSection={activeSection}
      initialPerson={initialPerson}
      personId={id}
      returnHref={getSafeReturnHref(query.returnTo)}
    />
  );
}
