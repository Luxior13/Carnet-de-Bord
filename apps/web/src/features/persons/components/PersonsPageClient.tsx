'use client';

import { Plus, Users } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import React, { type FC, Suspense } from 'react';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { PageHero } from '$components/layout/PageHero';
import { AccessDeniedState, PageState } from '$components/layout/PageState';
import { FEATURES } from '$constants/feature-registry.constants';
import { useFeatureAvailability } from '$context/FeatureAvailabilityContext';
import { useUser } from '$context/UserContext';
import { PersonsList } from '$features/persons/components/PersonsList';
import { getPersonCapabilities } from '$features/persons/person.permissions';
import type { PersonsListRequest } from '$features/persons/person-list-state';
import type { PersonsListResponse } from '$features/persons/types/person.types';
import { Button } from '$ui/button';
import { PageCanvas, PageShell } from '$ui/page-shell';
import { Skeleton } from '$ui/skeleton';

type PersonsPageClientProps = {
  initialState?: {
    data: PersonsListResponse;
    request: PersonsListRequest;
  };
};

const PersonsPageContent: FC<PersonsPageClientProps> = ({ initialState }) => {
  const searchParams = useSearchParams();
  const {
    featureAvailabilityLoaded,
    operationalFeatureIds,
    refreshFeatureAvailability,
  } = useFeatureAvailability();
  const { userData } = useUser();
  const { canCreate, canView } = getPersonCapabilities(userData);
  const searchParamsString = searchParams?.toString() ?? '';
  const returnHref = `/vie-interne/repertoire${searchParamsString ? `?${searchParamsString}` : ''}`;
  const createHref = `/vie-interne/repertoire/nouveau?${new URLSearchParams({ returnTo: returnHref })}`;

  if (!canView) {
    return (
      <AccessDeniedState
        actionHref="/"
        actionLabel="Retour à l'accueil"
        description="Vous n'avez pas la permission de consulter le répertoire."
      />
    );
  }

  if (!featureAvailabilityLoaded && !initialState) return <ListPageSkeleton />;

  if (
    featureAvailabilityLoaded &&
    !initialState &&
    !operationalFeatureIds.has(FEATURES.persons.id)
  ) {
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
          compact
          actions={
            canCreate ? (
              <Button asChild size="sm">
                <Link href={createHref}>
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
        <PersonsList
          canCreate={canCreate}
          createHref={createHref}
          initialState={initialState}
          returnHref={returnHref}
        />
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

export const PersonsPageClient: FC<PersonsPageClientProps> = ({
  initialState,
}) => (
  <AuthenticatedLayout
    breadcrumbs={[
      { label: FEATURES.persons.audit.poleLabel },
      { label: FEATURES.persons.label },
    ]}
  >
    <Suspense fallback={<ListPageSkeleton />}>
      <PersonsPageContent initialState={initialState} />
    </Suspense>
  </AuthenticatedLayout>
);
