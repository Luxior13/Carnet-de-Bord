import { notFound } from 'next/navigation';
import React from 'react';

import PrivateFeaturePage from '$components/private-navigation/PrivateFeaturePage';
import {
  getDefaultNavigationSpace,
  getNavigationItemByHref,
} from '$constants/app.constants';

export default function RecherchePage(): React.ReactNode {
  const searchPage = getNavigationItemByHref('/recherche');

  if (!searchPage) notFound();

  return (
    <PrivateFeaturePage item={searchPage} space={getDefaultNavigationSpace()} />
  );
}
