import './globals.css';

import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import React, { type ReactNode } from 'react';

import { SITE_CONFIG } from '$constants/app.constants';
import { isPublicPagePath } from '$constants/security.constants';
import { UserProvider } from '$context/UserContext';
import { env } from '$env';
import { getPageAuthSession } from '$server/auth';
import type { UserType } from '$types/auth.types';
import { Toaster } from '$ui/sonner';
import { cn } from '$utils/css.utils';
import { getSafeReturnPath } from '$utils/navigation.utils';
import {
  REQUEST_PATH_HEADER,
  REQUEST_TARGET_HEADER,
} from '$utils/request-context.utils';

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
  robots: {
    follow: false,
    index: false,
  },
  title: `${SITE_CONFIG.name}${env.NODE_ENV === 'development' ? ' - Dev' : ''}`,
};

// Every page request must be evaluated with its real middleware context. The
// private application must never be emitted as anonymous static HTML.
export const dynamic = 'force-dynamic';

type RootLayoutProps = {
  children: ReactNode;
};

const RootLayout = async ({
  children,
}: RootLayoutProps): Promise<ReactNode> => {
  const requestHeaders = await headers();
  const requestPath = requestHeaders.get(REQUEST_PATH_HEADER) ?? '/';
  let initialSessionRememberMe = false;
  let initialUser: UserType | null = null;

  if (!isPublicPagePath(requestPath)) {
    const { session, user } = await getPageAuthSession();

    if (!user) {
      const requestTarget = getSafeReturnPath(
        requestHeaders.get(REQUEST_TARGET_HEADER),
      );

      redirect(`/login?next=${encodeURIComponent(requestTarget)}`);
    }

    initialUser = user;
    initialSessionRememberMe = session?.rememberMe ?? false;
  }

  return (
    <html
      lang="fr"
      className={cn('dark', geistSans.variable, geistMono.variable)}
    >
      <body>
        <Toaster closeButton={true} />
        <UserProvider
          initialSessionRememberMe={initialSessionRememberMe}
          initialUser={initialUser}
        >
          {children}
        </UserProvider>
      </body>
    </html>
  );
};

export default RootLayout;
