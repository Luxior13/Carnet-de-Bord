'use client';

import { Plus, Users } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import React, { type FC, Suspense, useCallback, useState } from 'react';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { PageAsideLayout } from '$components/layout/PageAsideLayout';
import { PageIdentityHero } from '$components/layout/PageIdentityHero';
import { AccessDeniedState, PageState } from '$components/layout/PageState';
import { FEATURES } from '$constants/feature-registry.constants';
import { PAGE_PATHS } from '$constants/routes.constants';
import { useFeatureAvailability } from '$context/FeatureAvailabilityContext';
import { useUser } from '$context/UserContext';
import { PersonOverview } from '$features/persons/components/PersonOverview';
import { PersonsDirectorySkeleton } from '$features/persons/components/PersonsDirectorySkeleton';
import { PersonsList } from '$features/persons/components/PersonsList';
import { getPersonCapabilities } from '$features/persons/person.permissions';
import type { PersonsListRequest } from '$features/persons/person-list-state';
import type {
  PersonOverview as PersonOverviewStats,
  PersonsListResponse,
} from '$features/persons/types/person.types';
import { Button } from '$ui/button';
import directoryStyles from '$ui/directory.module.css';
import { PageCanvas, PageShell } from '$ui/page-shell';
import { cn } from '$utils/css.utils';

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
  const returnHref = `${PAGE_PATHS.persons}${searchParamsString ? `?${searchParamsString}` : ''}`;
  const createHref = `${PAGE_PATHS.newPerson}?${new URLSearchParams({ returnTo: returnHref })}`;
  const [overview, setOverview] = useState<{
    isLoading: boolean;
    stats: PersonOverviewStats | null;
  }>(() => ({
    isLoading: !initialState,
    stats: initialState?.data.overview ?? null,
  }));

  const handleOverviewChange = useCallback(
    (next: { isLoading: boolean; stats: PersonOverviewStats | null }) => {
      setOverview(next);
    },
    [],
  );

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
        description="Ce service ne peut pas être confirmé comme disponible pour le moment. Réessayez dans quelques instants."
        onAction={() => void refreshFeatureAvailability()}
        title="Répertoire temporairement indisponible"
      />
    );
  }

  return (
    <PageShell className="py-0">
      <PageCanvas contentClassName="py-6">
        <div className={cn(directoryStyles.directory, 'space-y-[18px]')}>
          <PageAsideLayout
            aside={
              <PersonOverview
                isLoading={overview.isLoading}
                stats={overview.stats}
              />
            }
            header={
              <PageIdentityHero
                actions={
                  canCreate ? (
                    <Button asChild className={directoryStyles.addButton}>
                      <Link href={createHref}>
                        <Plus aria-hidden="true" />
                        Ajouter une fiche
                      </Link>
                    </Button>
                  ) : undefined
                }
                description="Profils, coordonnées et rattachement à la structure."
                icon={<Users aria-hidden="true" />}
                title={FEATURES.persons.label}
              />
            }
          >
            <PersonsList
              canCreate={canCreate}
              createHref={createHref}
              initialState={initialState}
              onOverviewChange={handleOverviewChange}
              returnHref={returnHref}
            />
          </PageAsideLayout>
        </div>
      </PageCanvas>
    </PageShell>
  );
};

const ListPageSkeleton: FC = () => (
  <PageShell className="py-0">
    <PageCanvas contentClassName="space-y-[18px]">
      <PersonsDirectorySkeleton />
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
