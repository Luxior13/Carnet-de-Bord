'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import React, { type FC } from 'react';

import { Button } from '$ui/button';
import { Card, CardContent } from '$ui/card';

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

const ErrorPage: FC<ErrorPageProps> = ({ error, reset }) => {
  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="space-y-5 p-6">
          <div className="bg-destructive/10 mx-auto flex h-14 w-14 items-center justify-center rounded-lg">
            <AlertTriangle className="text-destructive h-7 w-7" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Une erreur est survenue</h1>
            <p className="text-muted-foreground">
              Quelque chose s&apos;est mal passé. Veuillez réessayer ou
              contacter un administrateur si le problème persiste.
            </p>
          </div>
          {error.digest && (
            <p className="text-muted-foreground font-mono text-xs">
              Code: {error.digest}
            </p>
          )}
          <Button onClick={reset} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Réessayer
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ErrorPage;
