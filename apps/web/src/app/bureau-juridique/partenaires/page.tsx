'use client';

import { Handshake, Plus } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import React, { type FC, Suspense } from 'react';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { PageHero } from '$components/layout/PageHero';
import { AccessDeniedState, PageState } from '$components/layout/PageState';
import { FEATURES } from '$constants/feature-registry.constants';
import { useFeatureAvailability } from '$context/FeatureAvailabilityContext';
import { useUser } from '$context/UserContext';
import { PartnersList } from '$features/partners/components/PartnersList';
import { getPartnerCapabilities } from '$features/partners/partner.permissions';
import { Button } from '$ui/button';
import { PageCanvas, PageShell } from '$ui/page-shell';
import { Skeleton } from '$ui/skeleton';

const SkeletonPage: FC = () => (
  <PageShell className="py-0">
    <PageCanvas contentClassName="space-y-5">
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-96 rounded-xl" />
    </PageCanvas>
  </PageShell>
);

const PageContent: FC = () => {
  const params = useSearchParams();
  const { userData } = useUser();
  const {
    featureAvailabilityLoaded,
    operationalFeatureIds,
    refreshFeatureAvailability,
  } = useFeatureAvailability();
  const { canManage, canView } = getPartnerCapabilities(userData);
  const query = params.toString();
  const returnHref = `${FEATURES.partners.href}${query ? `?${query}` : ''}`;
  const createHref = `${FEATURES.partners.href}/nouveau?${new URLSearchParams({ returnTo: returnHref })}`;

  if (!canView) {
    return (
      <AccessDeniedState
        actionHref="/"
        actionLabel="Retour à l’accueil"
        description="Vous n’avez pas la permission de consulter les partenaires."
      />
    );
  }
  if (!featureAvailabilityLoaded) return <SkeletonPage />;
  if (!operationalFeatureIds.has(FEATURES.partners.id)) {
    return (
      <PageState
        actionLabel="Revérifier"
        description="La migration du module n’est pas encore disponible."
        onAction={() => void refreshFeatureAvailability()}
        title="Sponsors & partenaires temporairement indisponibles"
      />
    );
  }

  return (
    <PageShell className="py-0">
      <PageCanvas contentClassName="space-y-5">
        <PageHero
          compact
          actions={
            canManage ? (
              <Button asChild size="sm">
                <Link href={createHref}>
                  <Plus className="size-4" />
                  Nouvelle fiche
                </Link>
              </Button>
            ) : null
          }
          description="Organisations, contacts, périodes de relation et suivi interne réunis au même endroit."
          icon={<Handshake className="size-5" />}
          title="Sponsors & partenaires"
          tone="legal"
        />
        <PartnersList createHref={createHref} returnHref={returnHref} />
      </PageCanvas>
    </PageShell>
  );
};

export default function PartnersPage(): React.JSX.Element {
  return (
    <AuthenticatedLayout
      breadcrumbs={[
        { label: FEATURES.partners.audit.poleLabel },
        { label: FEATURES.partners.label },
      ]}
    >
      <Suspense fallback={<SkeletonPage />}>
        <PageContent />
      </Suspense>
    </AuthenticatedLayout>
  );
}
