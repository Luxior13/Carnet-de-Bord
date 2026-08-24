'use client';

import { Newspaper, Plus, ShieldCheck } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { type FC, useState } from 'react';

import { PageHero } from '$components/layout/PageHero';
import { AccessDeniedState, PageState } from '$components/layout/PageState';
import { FEATURES } from '$constants/feature-registry.constants';
import { useFeatureAvailability } from '$context/FeatureAvailabilityContext';
import { useUser } from '$context/UserContext';
import { Badge } from '$ui/badge';
import { Button } from '$ui/button';
import { PageCanvas, PageShell } from '$ui/page-shell';
import { Skeleton } from '$ui/skeleton';

import { getInternalNewsCapabilities } from '../internal-news.permissions';
import type {
  InternalNewsFilter,
  InternalNewsResponse,
} from '../internal-news.types';
import { InternalNewsFeed } from './InternalNewsFeed';

const PublishAnnouncementDialog = dynamic(() =>
  import('./PublishAnnouncementDialog').then(
    (module) => module.PublishAnnouncementDialog,
  ),
);

const INTERNAL_NEWS_PATH = '/vie-interne/actualite-interne';

const PageSkeleton: FC = () => (
  <PageShell className="py-0">
    <PageCanvas contentClassName="space-y-5">
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-20 rounded-xl" />
      <Skeleton className="h-52 rounded-2xl" />
    </PageCanvas>
  </PageShell>
);

const readFilter = (
  value: string | null,
  canViewPartners: boolean,
): InternalNewsFilter => {
  if (value === 'announcements') return value;
  if (value === 'partners' && canViewPartners) return value;

  return 'all';
};

type InternalNewsPageProps = {
  initialState?: {
    data: InternalNewsResponse;
    filter: InternalNewsFilter;
  };
};

export const InternalNewsPage: FC<InternalNewsPageProps> = ({
  initialState,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userData } = useUser();
  const {
    featureAvailabilityLoaded,
    operationalFeatureIds,
    refreshFeatureAvailability,
  } = useFeatureAvailability();
  const { canManage, canView, canViewPartners } =
    getInternalNewsCapabilities(userData);
  const filter = readFilter(searchParams.get('filtre'), canViewPartners);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);

  const refreshFeed = (): void => {
    setRefreshVersion((version) => version + 1);
  };

  const updateFilter = (nextFilter: InternalNewsFilter): void => {
    const next = new URLSearchParams(searchParams.toString());
    if (nextFilter === 'all') next.delete('filtre');
    else next.set('filtre', nextFilter);
    router.replace(
      next.size ? `${INTERNAL_NEWS_PATH}?${next}` : INTERNAL_NEWS_PATH,
      {
        scroll: false,
      },
    );
  };

  if (!canView) {
    return (
      <AccessDeniedState
        actionHref="/"
        actionLabel="Retour à l’accueil"
        description="Vous n’avez pas la permission de consulter l’actualité interne."
      />
    );
  }
  if (!featureAvailabilityLoaded && !initialState) return <PageSkeleton />;
  if (
    featureAvailabilityLoaded &&
    !initialState &&
    !operationalFeatureIds.has(FEATURES.internalNews.id)
  ) {
    return (
      <PageState
        actionLabel="Revérifier"
        description="La migration du fil interne n’est pas encore disponible."
        onAction={() => void refreshFeatureAvailability()}
        title="Actualité interne temporairement indisponible"
      />
    );
  }

  return (
    <>
      <PageShell className="py-0">
        <PageCanvas contentClassName="space-y-5">
          <PageHero
            actions={
              canManage ? (
                <Button onClick={() => setPublishDialogOpen(true)} size="sm">
                  <Plus className="size-4" />
                  Publier une actualité
                </Button>
              ) : null
            }
            description="Les annonces partagées et les changements importants de la structure, réunis dans un fil lisible."
            eyebrow={
              <Badge variant="secondary">
                <ShieldCheck className="size-3" />
                Contenu adapté à vos droits
              </Badge>
            }
            icon={<Newspaper className="size-5" />}
            meta={
              <>
                <Badge variant="outline">Annonces internes</Badge>
                {canViewPartners && (
                  <Badge variant="outline">Événements partenaires</Badge>
                )}
              </>
            }
            title="Actualité interne"
            tone="internal"
          />

          <InternalNewsFeed
            canManage={canManage}
            canViewPartners={canViewPartners}
            filter={filter}
            initialState={initialState}
            onContentChanged={refreshFeed}
            onFilterChange={updateFilter}
            refreshVersion={refreshVersion}
          />
        </PageCanvas>
      </PageShell>

      {canManage && (
        <PublishAnnouncementDialog
          onOpenChange={setPublishDialogOpen}
          onPublished={refreshFeed}
          open={publishDialogOpen}
        />
      )}
    </>
  );
};
