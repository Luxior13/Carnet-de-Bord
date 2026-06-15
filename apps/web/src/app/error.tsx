'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import React, { type FC, useEffect } from 'react';

import { Button } from '$ui/button';

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

const ErrorPage: FC<ErrorPageProps> = ({ error, reset }) => {
  useEffect(() => {
    console.error('Unhandled error:', error);
  }, [error]);

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <div className="max-w-md space-y-4 text-center">
        <div className="bg-destructive/10 mx-auto flex h-16 w-16 items-center justify-center rounded-full">
          <AlertTriangle className="text-destructive h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold">Une erreur est survenue</h1>
        <p className="text-muted-foreground">
          Quelque chose s&apos;est mal passé. Veuillez réessayer ou contacter un
          administrateur si le problème persiste.
        </p>
        {error.digest && (
          <p className="text-muted-foreground font-mono text-xs">
            Code: {error.digest}
          </p>
        )}
        <Button onClick={reset} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Réessayer
        </Button>
      </div>
    </div>
  );
};

export default ErrorPage;
