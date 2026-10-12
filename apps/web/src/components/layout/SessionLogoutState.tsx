'use client';

import { LogOut } from 'lucide-react';
import React, { useEffect, useRef } from 'react';

import type { LogoutStatus } from '$context/session-logout';
import { Button } from '$ui/button';
import { Card, CardContent } from '$ui/card';

export function SessionLogoutState({
  onRetry,
  status,
}: {
  onRetry: () => Promise<void>;
  status: Exclude<LogoutStatus, 'idle'>;
}): React.JSX.Element {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, [status]);
  const pending = status === 'pending';
  const confirmed = status === 'confirmed';

  return (
    <main className="route-state relative isolate flex items-center justify-center p-4">
      <div aria-hidden="true" className="site-background-column" />
      <Card className="border-border-content bg-surface-panel relative z-10 w-full max-w-md">
        <CardContent className="space-y-4 p-6">
          <LogOut aria-hidden="true" className="text-muted-foreground size-6" />
          <h1 ref={headingRef} tabIndex={-1} className="text-xl font-semibold">
            {pending
              ? 'Déconnexion en cours'
              : confirmed
                ? 'Déconnexion confirmée'
                : 'Déconnexion non confirmée'}
          </h1>
          <p className="text-muted-foreground text-sm leading-6">
            {confirmed
              ? 'Votre session est fermée. Vous pouvez revenir à la connexion.'
              : pending
                ? 'Vos informations sont masquées pendant la fermeture de votre session.'
                : 'Vos informations restent masquées, mais la fermeture de votre session n’a pas pu être confirmée. Réessayez pour terminer la déconnexion.'}
          </p>
          {confirmed ? (
            <Button asChild variant="outline">
              {/* Keep this exit usable if the router failed after confirmation. */}
              <a href="/login">Retour à la connexion</a>
            </Button>
          ) : (
            <Button
              loading={pending}
              onClick={() => void onRetry()}
              type="button"
            >
              {pending ? 'Déconnexion…' : 'Réessayer la déconnexion'}
            </Button>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
