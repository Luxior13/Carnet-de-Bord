import React from 'react';

import {
  PersonDetailPage,
  type PersonDetailSection,
} from '$features/persons/components/PersonDetailPage';

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
  const [{ id }, query]: [
    { id: string },
    { returnTo?: string | string[]; section?: string | string[] },
  ] = await Promise.all([params, searchParams ?? Promise.resolve({})]);
  const activeSection: PersonDetailSection =
    query.section === 'coordonnees' ? 'coordonnees' : 'identite';

  return (
    <PersonDetailPage
      activeSection={activeSection}
      personId={id}
      returnHref={getSafeReturnHref(query.returnTo)}
    />
  );
}
