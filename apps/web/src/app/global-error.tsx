'use client';

import './globals.css';

import React from 'react';

import { RouteErrorState } from '$components/layout/RouteErrorState';
import { cn } from '$utils/css.utils';

import { geistMono, geistSans } from './fonts';

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}): React.JSX.Element {
  // The root layout may have failed before creating the document or providers.
  return (
    <html
      lang="fr"
      className={cn('dark', geistSans.variable, geistMono.variable)}
    >
      <head>
        <title>Une erreur est survenue</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex, nofollow" />
      </head>
      <body>
        <RouteErrorState digest={error.digest} standalone />
      </body>
    </html>
  );
}
