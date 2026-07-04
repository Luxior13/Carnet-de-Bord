import React from 'react';

import PrivateFeaturePage from '$components/private-navigation/PrivateFeaturePage';
import {
  getDefaultNavigationSpace,
  type NavItem,
} from '$constants/app.constants';

const searchPage: NavItem = {
  description:
    'Recherche transversale dans le site prive avec resultats limites par permissions.',
  href: '/recherche',
  icon: 'Search',
  label: 'Recherche globale',
};

export default function RecherchePage(): React.ReactNode {
  return (
    <PrivateFeaturePage item={searchPage} space={getDefaultNavigationSpace()} />
  );
}
