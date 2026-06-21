import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  description: 'Gérez votre compte, votre sécurité et vos accès.',
  title: 'Mon compte - Carnet Pro',
};

export default function SettingsLayout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return children;
}
