import React from 'react';

import { PersonDetailPage } from '$features/persons/components/PersonDetailPage';

type PersonPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PersonPage({
  params,
}: PersonPageProps): Promise<React.ReactNode> {
  const { id } = await params;

  return <PersonDetailPage personId={id} />;
}
