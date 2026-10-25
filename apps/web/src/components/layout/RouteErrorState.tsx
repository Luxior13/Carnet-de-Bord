'use client';

import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import { Button } from '$ui/button';
import { Card, CardContent } from '$ui/card';

type RouteErrorStateProps = {
  digest?: string;
  standalone?: boolean;
};

// This fallback also renders outside the root layout: it must not need the
// router, a user provider or a working server to offer its recovery actions.
export function RouteErrorState({
  digest,
  standalone = false,
}: RouteErrorStateProps): React.JSX.Element {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const reloadingRef = useRef(false);
  const [isReloading, setIsReloading] = useState(false);
  const Container = standalone ? 'main' : 'div';

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <Container className="route-state relative isolate flex items-center justify-center p-4">
      <div aria-hidden="true" className="site-background-column" />
      <Card className="border-border-content bg-surface-panel rounded-panel relative z-10 w-full max-w-md text-center">
        <CardContent className="space-y-5 p-6">
          <div
            aria-hidden="true"
            className="bg-destructive/10 mx-auto flex size-14 items-center justify-center rounded-lg"
          >
            <AlertTriangle className="text-destructive size-7" />
          </div>
          <div className="space-y-2">
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="text-xl leading-7 font-semibold sm:text-2xl sm:leading-8"
            >
              Une erreur est survenue
            </h1>
            <p className="text-muted-foreground">
              La page n&apos;a pas pu s&apos;afficher. Vous pouvez la recharger
              ou revenir à l&apos;accueil. Si le problème persiste, contactez un
              administrateur.
            </p>
          </div>
          {digest ? (
            <p className="text-muted-foreground font-mono text-xs break-all">
              Référence : {digest}
            </p>
          ) : null}
          <div className="flex flex-col gap-2">
            <Button
              loading={isReloading}
              onClick={() => {
                if (reloadingRef.current) return;

                reloadingRef.current = true;
                setIsReloading(true);
                // A document GET also retries Server Components and the root
                // layout. Next 15's reset alone reuses the failed RSC payload.
                window.location.reload();
              }}
            >
              <RefreshCw aria-hidden="true" className="size-4" />
              {isReloading ? 'Rechargement…' : 'Recharger la page'}
            </Button>
            <Button asChild variant="outline">
              {/* A native link must remain usable when the router has failed. */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/">
                <ArrowLeft aria-hidden="true" className="size-4" />
                Retour à l&apos;accueil
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </Container>
  );
}
