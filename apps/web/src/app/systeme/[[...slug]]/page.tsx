import { notFound } from 'next/navigation';
import React from 'react';

import PrivateFeaturePage from '$components/private-navigation/PrivateFeaturePage';
import { getNavigationPageBySlug } from '$constants/app.constants';

type SystemePageProps = {
  params: Promise<{ slug?: string[] }>;
};

export default async function SystemePage({
  params,
}: SystemePageProps): Promise<React.ReactNode> {
  const { slug = [] } = await params;
  const match = getNavigationPageBySlug('system', slug);

  if (!match) notFound();

  return <PrivateFeaturePage item={match.item} space={match.space} />;
}
