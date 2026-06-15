import './globals.css';

import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import React, { type FC, type ReactNode } from 'react';

import ReactScan from '$components/ReactScan';
import { SITE_CONFIG } from '$constants/app.constants';
import { UserProvider } from '$context/UserContext';
import { env } from '$env';
import { Toaster } from '$ui/sonner';
import { cn } from '$utils/css.utils';

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
});

export const metadata: Metadata = {
  description: SITE_CONFIG.description,
  icons: {
    icon: '/assets/noc.png',
  },
  title: `${SITE_CONFIG.name}${env.NODE_ENV === 'development' ? ' - Dev' : ''}`,
};

type RootLayoutProps = {
  children: ReactNode;
};

const RootLayout: FC<RootLayoutProps> = ({ children }) => {
  return (
    <html lang="fr" className="dark">
      <body
        className={cn(
          geistSans.variable,
          geistMono.variable,
          'bg-background min-h-svh antialiased',
        )}
      >
        {env.NODE_ENV === 'development' && <ReactScan />}
        <Toaster closeButton={true} />
        <UserProvider>{children}</UserProvider>
      </body>
    </html>
  );
};

export default RootLayout;
