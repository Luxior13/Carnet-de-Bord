import { notFound } from 'next/navigation';
import React from 'react';

import PrivateFeaturePage from '$components/private-navigation/PrivateFeaturePage';
import { getNavigationPageBySlug } from '$constants/app.constants';

type SportTeamControlPageProps = {
  params: Promise<{ slug?: string[] }>;
};

export default async function SportTeamControlPage({
  params,
}: SportTeamControlPageProps): Promise<React.ReactNode> {
  const { slug = [] } = await params;
  const match = getNavigationPageBySlug('sport', slug);

  if (!match) notFound();

  return <PrivateFeaturePage item={match.item} space={match.space} />;
}
