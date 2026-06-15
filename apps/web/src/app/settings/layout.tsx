import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  description: 'Gerez votre compte, votre securite et vos acces.',
  title: 'Compte - Carnet Pro',
};

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return children;
}
