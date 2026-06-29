import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { SITE_CONFIG } from '$constants/app.constants';

export const metadata: Metadata = {
  description: 'Gérez les comptes utilisateurs et leurs permissions.',
  title: `Utilisateurs - ${SITE_CONFIG.name}`,
};

export default function AdministrationUsersLayout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return children;
}
