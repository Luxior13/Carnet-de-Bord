'use client';

import { Newspaper, Plus } from 'lucide-react';
import dynamic from 'next/dynamic';
import React, { type FC, useState } from 'react';

import { PageHero } from '$components/layout/PageHero';
import { AccessDeniedState, PageState } from '$components/layout/PageState';
import { FEATURES } from '$constants/feature-registry.constants';
import { useFeatureAvailability } from '$context/FeatureAvailabilityContext';
import { useUser } from '$context/UserContext';
import { Button } from '$ui/button';
import { PageCanvas, PageShell } from '$ui/page-shell';
import { Skeleton } from '$ui/skeleton';

import { getInternalNewsCapabilities } from '../internal-news.permissions';
import type { InternalNewsResponse } from '../internal-news.types';
import { InternalNewsFeed } from './InternalNewsFeed';

const PublishAnnouncementDialog = dynamic(() =>
  import('./PublishAnnouncementDialog').then(
    (module) => module.PublishAnnouncementDialog,
  ),
);

const PageSkeleton: FC = () => (
  <PageShell className="py-0" width="reading">
    <PageCanvas contentClassName="space-y-5">
      <Skeleton className="h-32 rounded-lg" />
      <Skeleton className="h-20 rounded-lg" />
      <Skeleton className="h-52 rounded-lg" />
    </PageCanvas>
  </PageShell>
);

type InternalNewsPageProps = {
  initialState?: { data: InternalNewsResponse };
};

export const InternalNewsPage: FC<InternalNewsPageProps> = ({
  initialState,
}) => {
  const { userData } = useUser();
  const {
    featureAvailabilityLoaded,
    operationalFeatureIds,
    refreshFeatureAvailability,
  } = useFeatureAvailability();
  const { canManage, canView } = getInternalNewsCapabilities(userData);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);

  const refreshFeed = (): void => {
    setRefreshVersion((version) => version + 1);
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
        description="Ce service ne peut pas être confirmé comme disponible pour le moment. Réessayez dans quelques instants."
        onAction={() => void refreshFeatureAvailability()}
        title="Actualité interne temporairement indisponible"
      />
    );
  }

  return (
    <>
      <PageShell className="py-0" width="reading">
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
            description="Les annonces et les nouvelles de votre structure."
            icon={<Newspaper className="size-5" />}
            title="Actualité interne"
            tone="activity"
          />

          <InternalNewsFeed
            canManage={canManage}
            initialState={initialState}
            onContentChanged={refreshFeed}
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
