'use client';

import { Home } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { PageIdentityHero } from '$components/layout/PageIdentityHero';
import { FEATURES } from '$constants/feature-registry.constants';
import { useUser } from '$context/UserContext';
import { Button } from '$ui/button';
import { PageCanvas, PageShell } from '$ui/page-shell';

export default function HomePage(): React.ReactNode {
  const { userData } = useUser();
  const firstName = userData?.firstName?.trim();

  return (
    <AuthenticatedLayout
      breadcrumbs={[
        { label: FEATURES.dashboard.audit.poleLabel },
        { label: FEATURES.dashboard.label },
      ]}
    >
      <PageShell className="py-0">
        <PageCanvas>
          <PageIdentityHero
            actions={
              <Button asChild variant="outline">
                <Link href="/mon-compte">Mon compte</Link>
              </Button>
            }
            description="Votre espace personnel est en préparation. Retrouvez vos informations et vos réglages dans Mon compte."
            eyebrow={FEATURES.dashboard.label}
            icon={<Home aria-hidden="true" />}
            title={firstName ? `Bonjour ${firstName}` : 'Bienvenue'}
          />
        </PageCanvas>
      </PageShell>
    </AuthenticatedLayout>
  );
}
