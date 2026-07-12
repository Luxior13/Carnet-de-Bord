'use client';

import { ClipboardList } from 'lucide-react';
import React, { useMemo } from 'react';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { ContentState } from '$components/layout/ContentState';
import { PageHero } from '$components/layout/PageHero';
import {
  getNavigationSpaceItems,
  getPlannedNavigationSpaces,
} from '$constants/app.constants';
import { getNavigationIcon } from '$constants/navigation-icon.constants';
import { getNavigationSpaceToneClasses } from '$constants/navigation-theme.constants';
import { useUser } from '$context/UserContext';
import { Badge } from '$ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '$ui/card';
import { PageCanvas, PageShell } from '$ui/page-shell';
import { ServiceIcon } from '$ui/service-icon';
import { cn } from '$utils/css.utils';

export default function RoadmapPage(): React.ReactNode {
  const { userData } = useUser();
  const plannedSpaces = useMemo(
    () => getPlannedNavigationSpaces(userData),
    [userData],
  );
  const plannedItemsCount = useMemo(
    () =>
      plannedSpaces.reduce(
        (count, space) => count + getNavigationSpaceItems(space).length,
        0,
      ),
    [plannedSpaces],
  );

  return (
    <AuthenticatedLayout breadcrumbs={[{ label: 'Feuille de route' }]}>
      <PageShell className="py-0">
        <PageCanvas contentClassName="space-y-5">
          <PageHero
            title="Feuille de route"
            description="Fonctionnalités prévues, visibles selon vos droits actuels. Ces modules ne sont pas encore opérationnels."
            icon={<ClipboardList className="size-5" />}
            meta={
              <Badge variant="outline">
                {plannedItemsCount} fonctionnalité
                {plannedItemsCount > 1 ? 's' : ''} planifiée
                {plannedItemsCount > 1 ? 's' : ''}
              </Badge>
            }
          />

          <ContentState
            description="Les cartes ci-dessous décrivent l'organisation cible. Elles ne contiennent encore aucune donnée métier et ne lancent aucune action."
            kind="warning"
            role="status"
            title="Aperçu non interactif"
          />

          {plannedSpaces.length > 0 ? (
            <div className="space-y-5">
              {plannedSpaces.map((space) => {
                const tone = getNavigationSpaceToneClasses(space.tone);
                const SpaceIcon = getNavigationIcon(space.icon);

                return (
                  <section key={space.id} aria-labelledby={`${space.id}-title`}>
                    <div className="mb-3 flex items-start gap-3">
                      <ServiceIcon className={cn('size-9', tone.icon)}>
                        <SpaceIcon className="size-4" />
                      </ServiceIcon>
                      <div>
                        <h2
                          className="text-base font-semibold"
                          id={`${space.id}-title`}
                        >
                          {space.label}
                        </h2>
                        <p className="text-muted-foreground text-sm">
                          {space.description}
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {space.sections.flatMap((section) =>
                        section.items.map((item) => {
                          const ItemIcon = getNavigationIcon(item.icon);

                          return (
                            <Card
                              className="border-sidebar-border/70 rounded-md py-0"
                              key={item.href}
                            >
                              <CardHeader className="p-4 pb-2">
                                <div className="flex items-start justify-between gap-3">
                                  <ServiceIcon
                                    className={cn('size-8', tone.icon)}
                                  >
                                    <ItemIcon className="size-4" />
                                  </ServiceIcon>
                                  <Badge variant="warning">
                                    {item.status ?? 'Planifié'}
                                  </Badge>
                                </div>
                                <CardTitle className="pt-2 text-sm">
                                  {item.label}
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-3 p-4 pt-0">
                                <p className="text-muted-foreground text-sm leading-6">
                                  {item.description ?? space.description}
                                </p>
                                {(item.children?.length ?? 0) > 0 && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {item.children?.map((child) => (
                                      <Badge key={child.href} variant="outline">
                                        {child.label}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        }),
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          ) : (
            <ContentState
              description="La feuille de route respecte les droits de votre compte."
              layout="panel"
              title="Aucune fonctionnalité planifiée visible"
            />
          )}
        </PageCanvas>
      </PageShell>
    </AuthenticatedLayout>
  );
}
