'use client';

import { UserPlus } from 'lucide-react';
import React, { type FC } from 'react';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { PageBackNavigation } from '$components/layout/PageBackNavigation';
import { PageHero } from '$components/layout/PageHero';
import { AccessDeniedState, PageState } from '$components/layout/PageState';
import { FEATURES } from '$constants/feature-registry.constants';
import { useFeatureAvailability } from '$context/FeatureAvailabilityContext';
import { useUser } from '$context/UserContext';
import { PersonCreateForm } from '$features/persons/components/PersonCreateForm';
import { getPersonCapabilities } from '$features/persons/person.permissions';
import { PageCanvas, PageShell } from '$ui/page-shell';
import { Skeleton } from '$ui/skeleton';

const NewPersonContent: FC = () => {
  const {
    featureAvailabilityLoaded,
    operationalFeatureIds,
    refreshFeatureAvailability,
  } = useFeatureAvailability();
  const { userData } = useUser();
  const { canCreate } = getPersonCapabilities(userData);

  if (!canCreate) {
    return (
      <AccessDeniedState
        actionHref={FEATURES.persons.href}
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
        description="La création reste désactivée tant que la migration et la clé de chiffrement d’audit ne sont pas opérationnelles."
        onAction={() => void refreshFeatureAvailability()}
        title="Répertoire temporairement indisponible"
      />
    );
  }

  if (!featureAvailabilityLoaded) {
    return (
      <PageShell className="py-0" width="narrow">
        <PageCanvas>
          <div aria-label="Chargement" className="space-y-3" role="status">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-96 rounded-xl" />
          </div>
        </PageCanvas>
      </PageShell>
    );
  }

  return (
    <PageShell className="py-0" width="narrow">
      <PageCanvas contentClassName="relative space-y-5">
        <PageBackNavigation
          href={FEATURES.persons.href}
          label="Retour au répertoire"
        />
        <PageHero
          description="Créez le socle d'identité ; toutes les informations complémentaires restent facultatives."
          icon={<UserPlus className="size-5" />}
          title="Nouvelle fiche"
          tone="internal"
        />
        <PersonCreateForm />
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
    <NewPersonContent />
  </AuthenticatedLayout>
);

export default NewPersonPage;
