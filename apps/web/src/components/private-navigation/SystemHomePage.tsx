'use client';

import { ArrowRight, Settings } from 'lucide-react';
import Link from 'next/link';
import React, { useMemo } from 'react';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { PageHero } from '$components/layout/PageHero';
import { AccessDeniedState } from '$components/layout/PageState';
import { getLiveNavigationSpaceTools } from '$constants/app.constants';
import { getNavigationIcon } from '$constants/navigation-icon.constants';
import { useUser } from '$context/UserContext';
import { Badge } from '$ui/badge';
import { Card, CardContent } from '$ui/card';
import { PageCanvas, PageShell } from '$ui/page-shell';
import { ServiceIcon } from '$ui/service-icon';
import { cn } from '$utils/css.utils';

export function SystemHomePage(): React.ReactNode {
  const { userData } = useUser();
  const visibleTools = useMemo(
    () => getLiveNavigationSpaceTools('system', userData),
    [userData],
  );

  return (
    <AuthenticatedLayout breadcrumbs={[{ label: 'Système' }]}>
      {visibleTools.length === 0 ? (
        <AccessDeniedState
          actionHref="/"
          actionLabel="Retour au tableau de bord"
          description="Vous n'avez accès à aucun outil système opérationnel."
        />
      ) : (
        <PageShell className="py-0">
          <PageCanvas contentClassName="space-y-5">
            <PageHero
              title="Système"
              description="Administration des comptes et consultation des actions sensibles."
              icon={<Settings className="size-5" />}
              meta={
                <Badge variant="secondary">
                  {visibleTools.length} outil
                  {visibleTools.length > 1 ? 's' : ''} disponible
                  {visibleTools.length > 1 ? 's' : ''}
                </Badge>
              }
              tone="system"
            />
            <section aria-labelledby="system-tools-title">
              <div className="mb-3">
                <h2 className="text-base font-semibold" id="system-tools-title">
                  Accès rapides
                </h2>
              </div>
              <div
                className={cn(
                  'grid gap-3 md:grid-cols-2',
                  visibleTools.length === 1 &&
                    'mx-auto w-full max-w-2xl md:grid-cols-1',
                )}
              >
                {visibleTools.map((item) => {
                  const Icon = getNavigationIcon(item.icon);
                  const actionLabel =
                    item.hubActionLabel ?? `Ouvrir ${item.label}`;

                  return (
                    <Link
                      aria-label={actionLabel}
                      className="group focus-visible:ring-ring/45 focus-visible:ring-offset-background block h-full rounded-md outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                      href={item.href}
                      key={item.href}
                    >
                      <Card className="border-border/70 group-hover:border-ring/35 group-focus-visible:border-ring/40 h-full transition-[border-color,background-color,box-shadow] group-hover:shadow-[var(--shadow-panel-strong)] motion-reduce:transition-none">
                        <CardContent className="flex h-full flex-col p-4 sm:p-5">
                          <div className="flex items-start gap-3">
                            <ServiceIcon className="bg-primary/10 text-primary-emphasis size-9">
                              <Icon className="size-4" />
                            </ServiceIcon>
                            <div className="min-w-0 flex-1">
                              <h3 className="text-base leading-6 font-semibold">
                                {item.label}
                              </h3>
                              <p className="text-muted-foreground mt-1 text-sm leading-6">
                                {item.description}
                              </p>
                            </div>
                          </div>
                          <span className="text-primary-emphasis mt-5 inline-flex min-h-11 items-center gap-2 self-start text-sm font-medium lg:min-h-9">
                            {actionLabel}
                            <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none" />
                          </span>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </section>
          </PageCanvas>
        </PageShell>
      )}
    </AuthenticatedLayout>
  );
}
