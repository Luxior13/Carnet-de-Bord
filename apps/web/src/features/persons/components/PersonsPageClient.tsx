'use client';

import { Plus, Users } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import React, { type FC, Suspense } from 'react';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { AccessDeniedState, PageState } from '$components/layout/PageState';
import { FEATURES } from '$constants/feature-registry.constants';
import { PAGE_PATHS } from '$constants/routes.constants';
import { useFeatureAvailability } from '$context/FeatureAvailabilityContext';
import { useUser } from '$context/UserContext';
import { PersonsList } from '$features/persons/components/PersonsList';
import { getPersonCapabilities } from '$features/persons/person.permissions';
import type { PersonsListRequest } from '$features/persons/person-list-state';
import type { PersonsListResponse } from '$features/persons/types/person.types';
import { PageCanvas, PageShell } from '$ui/page-shell';
import { Skeleton } from '$ui/skeleton';

import styles from './PersonsDirectory.module.css';

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
        <div className={styles.directory}>
          <div className={styles.page}>
            <header className={styles.hero}>
              <div className={styles.heroIdentity}>
                <span aria-hidden="true" className={styles.heroLogo}>
                  <Users />
                </span>
                <div>
                  <div className={styles.titleLine}>
                    <h1>{FEATURES.persons.label}</h1>
                  </div>
                  <p>Profils, coordonnées et statut dans la structure.</p>
                </div>
              </div>
              {canCreate ? (
                <Link className={styles.addButton} href={createHref}>
                  <Plus aria-hidden="true" />
                  Ajouter une fiche
                </Link>
              ) : null}
            </header>
            <PersonsList
              canCreate={canCreate}
              createHref={createHref}
              initialState={initialState}
              returnHref={returnHref}
            />
          </div>
        </div>
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
