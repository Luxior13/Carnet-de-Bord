import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  description: 'Gerez votre profil, votre securite et vos sessions.',
  title: 'Mon compte - Carnet Pro',
};

export default function MyAccountLayout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return children;
}
