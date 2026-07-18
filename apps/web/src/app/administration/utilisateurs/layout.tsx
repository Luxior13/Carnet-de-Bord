import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { SITE_CONFIG } from '$constants/app.constants';
import { FEATURES } from '$constants/feature-registry.constants';

export const metadata: Metadata = {
  description: 'Gérez les comptes, rôles et autorisations administratives.',
  title: `${FEATURES.users.label} - ${SITE_CONFIG.name}`,
};

export default function AdministrationUsersLayout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return children;
}
