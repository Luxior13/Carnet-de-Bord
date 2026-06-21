'use client';

import { Home, UserRound } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { SITE_CONFIG } from '$constants/app.constants';
import { useUser } from '$context/UserContext';
import { Button } from '$ui/button';
import { PageShell } from '$ui/page-shell';
import { ServiceIcon } from '$ui/service-icon';

export default function HomePage(): React.ReactNode {
  const { userData } = useUser();
  const firstName = userData?.firstName?.trim();

  return (
    <AuthenticatedLayout fullHeight>
      <PageShell className="flex h-full items-center justify-center py-0">
        <section className="mx-auto flex w-full max-w-2xl flex-col items-center text-center">
          <ServiceIcon className="bg-primary/10 text-primary mb-5 size-14">
            <Home className="size-6" />
          </ServiceIcon>
          <p className="text-muted-foreground text-sm font-medium">
            {SITE_CONFIG.name}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Bonjour{firstName ? ` ${firstName}` : ''}
          </h1>
          <p className="text-muted-foreground mt-3 max-w-md text-sm leading-6">
            Bienvenue dans votre espace.
          </p>
          <Button asChild className="mt-7">
            <Link href="/mon-compte">
              <UserRound className="size-4" />
              Mon compte
            </Link>
          </Button>
        </section>
      </PageShell>
    </AuthenticatedLayout>
  );
}
