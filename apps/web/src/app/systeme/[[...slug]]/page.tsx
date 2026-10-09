import { notFound, redirect } from 'next/navigation';
import React from 'react';

import {
  getNavigationAvailability,
  getNavigationPageBySlug,
  getVisibleNavigationSpaces,
} from '$constants/app.constants';
import { SystemSettingsPage } from '$features/settings/SystemSettingsPage';
import { getPageAuthSession } from '$server/auth';

type SystemePageProps = {
  params: Promise<{ slug?: string[] }>;
};

export default async function SystemePage({
  params,
}: SystemePageProps): Promise<React.ReactNode> {
  const { slug = [] } = await params;

  if (slug.length === 0) {
    const { user } = await getPageAuthSession();
    if (!user) redirect('/login');
    const systemSpace = getVisibleNavigationSpaces(user).find(
      (space) => space.id === 'system',
    );
    redirect(systemSpace?.href ?? '/');
  }

  const match = getNavigationPageBySlug('system', slug);

  if (!match || getNavigationAvailability(match.item) !== 'live') notFound();

  if (match.item.href === '/systeme/parametres') {
    return <SystemSettingsPage item={match.item} space={match.space} />;
  }

  notFound();
}
