import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { SITE_CONFIG } from '$constants/app.constants';

export const metadata: Metadata = {
  description: 'Gérez votre profil, votre sécurité et vos sessions.',
  title: `Mon compte - ${SITE_CONFIG.name}`,
};

export default function MyAccountLayout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return children;
}
