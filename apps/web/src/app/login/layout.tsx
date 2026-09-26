import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { SITE_CONFIG } from '$constants/app.constants';

export const metadata: Metadata = {
  title: `Connexion · ${SITE_CONFIG.name}`,
};

export default function LoginLayout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return children;
}
