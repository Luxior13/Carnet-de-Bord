import { notFound, redirect } from 'next/navigation';
import React from 'react';

import PrivateFeaturePage from '$components/private-navigation/PrivateFeaturePage';
import { getNavigationPageBySlug } from '$constants/app.constants';

type TableauDeBordPageProps = {
  params: Promise<{ slug?: string[] }>;
};

export default async function TableauDeBordPage({
  params,
}: TableauDeBordPageProps): Promise<React.ReactNode> {
  const { slug = [] } = await params;

  // The live dashboard is the application home page. Keep the historical
  // route as a stable alias without rendering the preparation template.
  if (slug.length === 0) redirect('/');

  const match = getNavigationPageBySlug('dashboard', slug);

  if (!match) notFound();

  return <PrivateFeaturePage item={match.item} space={match.space} />;
}
