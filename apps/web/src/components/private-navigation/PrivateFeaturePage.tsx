'use client';

import { Home } from 'lucide-react';
import Link from 'next/link';
import React, { type FC } from 'react';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { AccessDeniedState } from '$components/layout/PageState';
import {
  canShowNavigationItem,
  filterNavigationSpace,
  getNavigationSpaceItems,
  type NavigationSpace,
  type NavItem,
} from '$constants/app.constants';
import { getNavigationIcon } from '$constants/navigation-icon.constants';
import { getNavigationSpaceToneClasses } from '$constants/navigation-theme.constants';
import { useUser } from '$context/UserContext';
import { Badge } from '$ui/badge';
import { Button } from '$ui/button';
import { PageCanvas, PageShell } from '$ui/page-shell';
import { ServiceIcon } from '$ui/service-icon';
import { cn } from '$utils/css.utils';

type PrivateFeaturePageProps = {
  item: NavItem;
  space: NavigationSpace;
};

const SpaceNavigationLink: FC<{
  currentHref: string;
  item: NavItem;
  nested?: boolean;
}> = ({ currentHref, item, nested = false }) => {
  const LinkIcon = getNavigationIcon(item.icon);
  const isCurrent = item.href === currentHref;

  return (
    <Button
      asChild
      variant={isCurrent ? 'secondary' : 'ghost'}
      className={cn(
        'h-auto w-full justify-start rounded-md px-2.5 py-2 text-left',
        nested && 'pl-7',
      )}
    >
      <Link href={item.href} aria-current={isCurrent ? 'page' : undefined}>
        <LinkIcon className="size-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
      </Link>
    </Button>
  );
};

const SpaceNavigation: FC<{ currentHref: string; space: NavigationSpace }> = ({
  currentHref,
  space,
}) => {
  const sections = space.sections.filter((section) => section.items.length > 0);

  return (
    <aside
      aria-label={`Navigation du pôle ${space.label}`}
      className="border-border/80 bg-surface rounded-md border p-4 shadow-[var(--shadow-panel)]"
    >
      <h2 className="text-sm font-semibold">Navigation du pôle</h2>
      <div className="mt-3 space-y-3">
        {sections.map((section) => (
          <div key={section.id} className="space-y-1.5">
            {section.label && (
              <p className="text-muted-foreground px-2 text-[11px] font-semibold uppercase">
                {section.label}
              </p>
            )}
            <div className="space-y-1">
              {section.items.map((sectionItem) => (
                <div key={sectionItem.href} className="space-y-1">
                  <SpaceNavigationLink
                    currentHref={currentHref}
                    item={sectionItem}
                  />
                  {sectionItem.children?.map((child) => (
                    <SpaceNavigationLink
                      key={child.href}
                      currentHref={currentHref}
                      item={child}
                      nested
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};

const SectionMap: FC<{ item: NavItem; space: NavigationSpace }> = ({
  item,
  space,
}) => {
  const tone = getNavigationSpaceToneClasses(space.tone);
  const children = item.children ?? [];
  const visibleSections = space.sections.filter(
    (section) => section.items.length > 0,
  );

  return (
    <div className="space-y-4">
      {children.length > 0 && (
        <section className="border-border/80 bg-surface rounded-md border p-4 shadow-[var(--shadow-panel)]">
          <h2 className="text-sm font-semibold">Sous-pages</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {children.map((child) => {
              const ChildIcon = getNavigationIcon(child.icon);

              return (
                <Button
                  key={child.href}
                  asChild
                  variant="outline"
                  className="h-9 rounded-md"
                >
                  <Link href={child.href}>
                    <ChildIcon className="size-4" />
                    {child.label}
                  </Link>
                </Button>
              );
            })}
          </div>
        </section>
      )}
      <section className="border-border/80 bg-surface rounded-md border p-4 shadow-[var(--shadow-panel)]">
        <h2 className="text-sm font-semibold">Organisation du pôle</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {visibleSections.map((section) => (
            <div
              key={section.id}
              className="border-border/65 bg-surface-muted/55 rounded-md border p-3"
            >
              <p className="text-sm font-medium">{section.label}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {section.items.map((sectionItem) => (
                  <Badge
                    key={sectionItem.href}
                    variant="outline"
                    className={cn('rounded-md', tone.soft)}
                  >
                    {sectionItem.label}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

const PrivateFeaturePage: FC<PrivateFeaturePageProps> = ({ item, space }) => {
  const { userData } = useUser();
  const canAccessPage = canShowNavigationItem(userData, item);
  const visibleSpace = filterNavigationSpace(space, userData);
  const visibleItem =
    getNavigationSpaceItems(visibleSpace).find(
      (link) => link.href === item.href,
    ) ?? item;
  const tone = getNavigationSpaceToneClasses(space.tone);
  const Icon = getNavigationIcon(item.icon);

  return (
    <AuthenticatedLayout
      breadcrumbs={[
        { href: space.href, label: space.label },
        { label: item.label },
      ]}
    >
      {!canAccessPage ? (
        <AccessDeniedState
          actionHref="/tableau-de-bord"
          actionLabel="Retour au tableau de bord"
          description="Vous n'avez pas les permissions necessaires pour acceder a cette page."
        />
      ) : (
        <PageShell className="py-0">
          <PageCanvas contentClassName="space-y-5">
            <section
              className={cn(
                'overflow-hidden rounded-md border shadow-[var(--shadow-panel)]',
                tone.hero,
              )}
            >
              <div className={cn('h-1 w-full', tone.accent)} />
              <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                  <ServiceIcon className={cn('mt-0.5 size-11', tone.icon)}>
                    <Icon className="size-5" />
                  </ServiceIcon>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={tone.soft}>
                        {space.label}
                      </Badge>
                      {item.status && (
                        <Badge variant="outline">{item.status}</Badge>
                      )}
                    </div>
                    <h1 className="mt-2 text-2xl font-semibold tracking-normal sm:text-3xl">
                      {item.label}
                    </h1>
                    <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-6">
                      {item.description ?? space.description}
                    </p>
                  </div>
                </div>
                <Button asChild variant="outline" className="rounded-md">
                  <Link href={space.href}>
                    <Home className="size-4" />
                    Accueil du pôle
                  </Link>
                </Button>
              </div>
            </section>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
              <SectionMap item={visibleItem} space={visibleSpace} />
              <SpaceNavigation currentHref={item.href} space={visibleSpace} />
            </div>
          </PageCanvas>
        </PageShell>
      )}
    </AuthenticatedLayout>
  );
};

export default PrivateFeaturePage;
