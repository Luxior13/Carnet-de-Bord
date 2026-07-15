'use client';

import { ArrowRight, Settings } from 'lucide-react';
import Link from 'next/link';
import React, { useMemo } from 'react';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { PageHero } from '$components/layout/PageHero';
import { AccessDeniedState } from '$components/layout/PageState';
import {
  canAccessNavigationItem,
  getNavigationItemByHref,
  type NavItem,
} from '$constants/app.constants';
import { getNavigationIcon } from '$constants/navigation-icon.constants';
import { useUser } from '$context/UserContext';
import { Badge } from '$ui/badge';
import { Button } from '$ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '$ui/card';
import { PageCanvas, PageShell } from '$ui/page-shell';
import { ServiceIcon } from '$ui/service-icon';

const SYSTEM_TOOL_HREFS = [
  '/administration/utilisateurs',
  '/systeme/journal-activite',
] as const;

function getSystemTools(): NavItem[] {
  return SYSTEM_TOOL_HREFS.flatMap((href) => {
    const item = getNavigationItemByHref(href);

    return item ? [item] : [];
  });
}

export function SystemHomePage(): React.ReactNode {
  const { userData } = useUser();
  const visibleTools = useMemo(
    () =>
      getSystemTools().filter((item) =>
        canAccessNavigationItem(userData, item),
      ),
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
              meta={<Badge variant="secondary">Outils opérationnels</Badge>}
              tone="system"
            />
            <section aria-labelledby="system-tools-title">
              <div className="mb-3">
                <h2 className="text-base font-semibold" id="system-tools-title">
                  Outils disponibles
                </h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Seuls les outils actifs autorisés pour votre compte sont
                  présentés ici.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {visibleTools.map((item) => {
                  const Icon = getNavigationIcon(item.icon);

                  return (
                    <Card
                      className="border-border/70 rounded-md py-0"
                      key={item.href}
                    >
                      <CardHeader className="p-4 pb-2">
                        <div className="flex items-center gap-3">
                          <ServiceIcon className="bg-primary/10 text-primary-emphasis size-9">
                            <Icon className="size-4" />
                          </ServiceIcon>
                          <div className="min-w-0">
                            <Badge variant="outline">Opérationnel</Badge>
                            <CardTitle className="mt-2 text-sm">
                              {item.label}
                            </CardTitle>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4 p-4 pt-0">
                        <p className="text-muted-foreground text-sm leading-6">
                          {item.description}
                        </p>
                        <Button asChild size="sm" variant="outline">
                          <Link href={item.href}>
                            Ouvrir
                            <ArrowRight className="size-4" />
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
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
