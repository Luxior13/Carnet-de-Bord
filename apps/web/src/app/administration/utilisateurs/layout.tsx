import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  description: 'Gérez les comptes utilisateurs et leurs permissions.',
  title: 'Utilisateurs - Carnet Pro',
};

export default function AdministrationUsersLayout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return children;
}
