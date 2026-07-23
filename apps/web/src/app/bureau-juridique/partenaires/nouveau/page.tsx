'use client';

import { Handshake } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import React, { type FC, Suspense } from 'react';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { PageBackNavigation } from '$components/layout/PageBackNavigation';
import { PageHero } from '$components/layout/PageHero';
import { AccessDeniedState, PageState } from '$components/layout/PageState';
import { FEATURES } from '$constants/feature-registry.constants';
import { useFeatureAvailability } from '$context/FeatureAvailabilityContext';
import { useUser } from '$context/UserContext';
import { PartnerCreateForm } from '$features/partners/components/PartnerCreateForm';
import { getPartnerCapabilities } from '$features/partners/partner.permissions';
import { PageCanvas, PageShell } from '$ui/page-shell';
import { Skeleton } from '$ui/skeleton';

const safeReturnHref = (value: string | null): string => {
  if (!value?.startsWith(FEATURES.partners.href)) return FEATURES.partners.href;
  try {
    const url = new URL(value, 'https://team-control.local');

    return url.origin === 'https://team-control.local' &&
      url.pathname === FEATURES.partners.href
      ? `${url.pathname}${url.search}`
      : FEATURES.partners.href;
  } catch {
    return FEATURES.partners.href;
  }
};

const SkeletonPage: FC = () => (
  <PageShell className="max-w-4xl py-0" width="narrow">
    <PageCanvas>
      <Skeleton className="h-[34rem] rounded-xl" />
    </PageCanvas>
  </PageShell>
);

const Content: FC = () => {
  const params = useSearchParams();
  const { userData } = useUser();
  const {
    featureAvailabilityLoaded,
    operationalFeatureIds,
    refreshFeatureAvailability,
  } = useFeatureAvailability();
  const { canManage } = getPartnerCapabilities(userData);
  const returnHref = safeReturnHref(params.get('returnTo'));
  if (!canManage) {
    return (
      <AccessDeniedState
        actionHref={returnHref}
        actionLabel="Retour aux partenaires"
        description="Vous n’avez pas la permission de créer une fiche."
      />
    );
  }
  if (!featureAvailabilityLoaded) return <SkeletonPage />;
  if (!operationalFeatureIds.has(FEATURES.partners.id)) {
    return (
      <PageState
        actionLabel="Revérifier"
        description="La migration du module doit être déployée avant la création."
        onAction={() => void refreshFeatureAvailability()}
        title="Module temporairement indisponible"
      />
    );
  }

  return (
    <PageShell className="max-w-4xl py-0" width="narrow">
      <PageCanvas contentClassName="relative space-y-5">
        <PageBackNavigation href={returnHref} label="Retour aux partenaires" />
        <PageHero
          compact
          description="Créez les informations essentielles, puis complétez les contacts et le suivi."
          icon={<Handshake className="size-5" />}
          title="Nouveau partenaire"
          tone="legal"
        />
        <PartnerCreateForm returnHref={returnHref} />
      </PageCanvas>
    </PageShell>
  );
};

export default function NewPartnerPage(): React.JSX.Element {
  return (
    <AuthenticatedLayout
      breadcrumbs={[
        { label: FEATURES.partners.audit.poleLabel },
        { href: FEATURES.partners.href, label: FEATURES.partners.label },
        { label: 'Nouveau partenaire' },
      ]}
    >
      <Suspense fallback={<SkeletonPage />}>
        <Content />
      </Suspense>
    </AuthenticatedLayout>
  );
}
