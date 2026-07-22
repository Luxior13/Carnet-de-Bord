'use client';

import { Plus, Users } from 'lucide-react';
import Link from 'next/link';
import React, { type FC, Suspense } from 'react';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { PageHero } from '$components/layout/PageHero';
import { AccessDeniedState, PageState } from '$components/layout/PageState';
import { FEATURES } from '$constants/feature-registry.constants';
import { useFeatureAvailability } from '$context/FeatureAvailabilityContext';
import { useUser } from '$context/UserContext';
import { PersonsList } from '$features/persons/components/PersonsList';
import { getPersonCapabilities } from '$features/persons/person.permissions';
import { Button } from '$ui/button';
import { PageCanvas, PageShell } from '$ui/page-shell';
import { Skeleton } from '$ui/skeleton';

const PersonsPageContent: FC = () => {
  const {
    featureAvailabilityLoaded,
    operationalFeatureIds,
    refreshFeatureAvailability,
  } = useFeatureAvailability();
  const { userData } = useUser();
  const { canCreate, canView } = getPersonCapabilities(userData);

  if (!canView) {
    return (
      <AccessDeniedState
        actionHref="/"
        actionLabel="Retour à l'accueil"
        description="Vous n'avez pas la permission de consulter le répertoire."
      />
    );
  }

  if (!featureAvailabilityLoaded) return <ListPageSkeleton />;

  if (!operationalFeatureIds.has(FEATURES.persons.id)) {
    return (
      <PageState
        actionLabel="Revérifier"
        description="La migration ou la clé de chiffrement d’audit n’est pas encore prête. La fonctionnalité reste masquée jusqu’à la fin de sa configuration."
        onAction={() => void refreshFeatureAvailability()}
        title="Répertoire temporairement indisponible"
      />
    );
  }

  return (
    <PageShell className="py-0">
      <PageCanvas contentClassName="space-y-5">
        <PageHero
          actions={
            canCreate ? (
              <Button asChild size="sm">
                <Link href="/vie-interne/repertoire/nouveau">
                  <Plus className="size-4" />
                  Nouvelle fiche
                </Link>
              </Button>
            ) : null
          }
          description="Identité, statut dans la structure et coordonnées utiles, réunis dans un répertoire unique."
          icon={<Users className="size-5" />}
          title="Répertoire"
          tone="internal"
        />
        <Suspense
          fallback={
            <div className="space-y-3" role="status" aria-label="Chargement">
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-96 rounded-xl" />
            </div>
          }
        >
          <PersonsList canCreate={canCreate} />
        </Suspense>
      </PageCanvas>
    </PageShell>
  );
};

const ListPageSkeleton: FC = () => (
  <PageShell className="py-0">
    <PageCanvas contentClassName="space-y-3">
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-96 rounded-xl" />
    </PageCanvas>
  </PageShell>
);

const PersonsPage: FC = () => (
  <AuthenticatedLayout
    breadcrumbs={[
      { label: FEATURES.persons.audit.poleLabel },
      { label: FEATURES.persons.label },
    ]}
  >
    <PersonsPageContent />
  </AuthenticatedLayout>
);

export default PersonsPage;
