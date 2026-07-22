import React from 'react';

import {
  PersonDetailPage,
  type PersonDetailSection,
} from '$features/persons/components/PersonDetailPage';

type PersonPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ section?: string | string[] }>;
};

export default async function PersonPage({
  params,
  searchParams,
}: PersonPageProps): Promise<React.ReactNode> {
  const [{ id }, query]: [{ id: string }, { section?: string | string[] }] =
    await Promise.all([params, searchParams ?? Promise.resolve({})]);
  const activeSection: PersonDetailSection =
    query.section === 'coordonnees' ? 'coordonnees' : 'identite';

  return <PersonDetailPage activeSection={activeSection} personId={id} />;
}
