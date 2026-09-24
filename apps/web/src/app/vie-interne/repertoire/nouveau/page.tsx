'use client';

import { UserPlus } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import React, { type FC, Suspense } from 'react';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { PageBackNavigation } from '$components/layout/PageBackNavigation';
import { PageHero } from '$components/layout/PageHero';
import { AccessDeniedState, PageState } from '$components/layout/PageState';
import { FEATURES } from '$constants/feature-registry.constants';
import { useFeatureAvailability } from '$context/FeatureAvailabilityContext';
import { useUser } from '$context/UserContext';
import { PersonCreateForm } from '$features/persons/components/PersonCreateForm';
import { getPersonCapabilities } from '$features/persons/person.permissions';
import { getSafePersonReturnHref } from '$features/persons/person.ui';
import { PageCanvas, PageShell } from '$ui/page-shell';
import { Skeleton } from '$ui/skeleton';

const NewPersonPageSkeleton: FC = () => (
  <PageShell className="py-0" width="form">
    <PageCanvas>
      <div aria-label="Chargement" className="space-y-3" role="status">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </PageCanvas>
  </PageShell>
);

const NewPersonContent: FC = () => {
  const searchParams = useSearchParams();
  const {
    featureAvailabilityLoaded,
    operationalFeatureIds,
    refreshFeatureAvailability,
  } = useFeatureAvailability();
  const { userData } = useUser();
  const { canCreate } = getPersonCapabilities(userData);
  const returnHref = getSafePersonReturnHref(
    searchParams?.get('returnTo') ?? null,
  );

  if (!canCreate) {
    return (
      <AccessDeniedState
        actionHref={returnHref}
        actionLabel="Retour au répertoire"
        description="Vous n'avez pas la permission de créer une fiche."
      />
    );
  }

  if (
    featureAvailabilityLoaded &&
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

  if (!featureAvailabilityLoaded) {
    return <NewPersonPageSkeleton />;
  }

  return (
    <PageShell className="py-0" width="form">
      <PageCanvas contentClassName="relative space-y-5">
        <PageBackNavigation href={returnHref} label="Retour au répertoire" />
        <PageHero
          compact
          description="Créez l'identité essentielle, puis complétez la fiche si nécessaire."
          icon={<UserPlus className="size-5" />}
          title="Nouvelle fiche"
          tone="internal"
        />
        <PersonCreateForm returnHref={returnHref} />
      </PageCanvas>
    </PageShell>
  );
};

const NewPersonPage: FC = () => (
  <AuthenticatedLayout
    breadcrumbs={[
      { label: FEATURES.persons.audit.poleLabel },
      { href: FEATURES.persons.href, label: FEATURES.persons.label },
      { label: 'Nouvelle fiche' },
    ]}
  >
    <Suspense fallback={<NewPersonPageSkeleton />}>
      <NewPersonContent />
    </Suspense>
  </AuthenticatedLayout>
);

export default NewPersonPage;
