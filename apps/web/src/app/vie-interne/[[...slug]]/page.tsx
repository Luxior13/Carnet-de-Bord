import { notFound } from 'next/navigation';
import React from 'react';

import PrivateFeaturePage from '$components/private-navigation/PrivateFeaturePage';
import { getNavigationPageBySlug } from '$constants/app.constants';

type VieInternePageProps = {
  params: Promise<{ slug?: string[] }>;
};

export default async function VieInternePage({
  params,
}: VieInternePageProps): Promise<React.ReactNode> {
  const { slug = [] } = await params;
  const match = getNavigationPageBySlug('internal', slug);

  if (!match) notFound();

  return <PrivateFeaturePage item={match.item} space={match.space} />;
}
