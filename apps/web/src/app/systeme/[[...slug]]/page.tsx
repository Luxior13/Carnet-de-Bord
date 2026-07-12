import { notFound } from 'next/navigation';
import React from 'react';

import PrivateFeaturePage from '$components/private-navigation/PrivateFeaturePage';
import { SystemHomePage } from '$components/private-navigation/SystemHomePage';
import { getNavigationPageBySlug } from '$constants/app.constants';
import { SystemActivityJournalPage } from '$features/audit/SystemActivityJournalPage';

type SystemePageProps = {
  params: Promise<{ slug?: string[] }>;
};

export default async function SystemePage({
  params,
}: SystemePageProps): Promise<React.ReactNode> {
  const { slug = [] } = await params;

  if (slug.length === 0) {
    return <SystemHomePage />;
  }

  const match = getNavigationPageBySlug('system', slug);

  if (!match) notFound();

  if (match.item.href === '/systeme/journal-activite') {
    return <SystemActivityJournalPage item={match.item} space={match.space} />;
  }

  return <PrivateFeaturePage item={match.item} space={match.space} />;
}
