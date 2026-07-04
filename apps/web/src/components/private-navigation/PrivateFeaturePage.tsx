'use client';

import {
  Activity,
  Archive,
  Bell,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  FileCheck2,
  FileText,
  Handshake,
  History,
  Home,
  LayoutDashboard,
  type LucideIcon,
  Newspaper,
  Search,
  Settings,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import React, { type FC } from 'react';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { AccessDeniedState } from '$components/layout/PageState';
import {
  getNavigationSpaceItems,
  type NavigationSpace,
  type NavItem,
} from '$constants/app.constants';
import { getNavigationSpaceToneClasses } from '$constants/navigation-theme.constants';
import {
  hasPermission,
  type PermissionsData,
} from '$constants/permissions.constants';
import { useUser } from '$context/UserContext';
import { type UserType } from '$types/auth.types';
import { Badge } from '$ui/badge';
import { Button } from '$ui/button';
import { PageCanvas, PageShell } from '$ui/page-shell';
import { ServiceIcon } from '$ui/service-icon';
import { cn } from '$utils/css.utils';

type PrivateFeaturePageProps = {
  item: NavItem;
  space: NavigationSpace;
};

type PermissionUser = Pick<
  UserType,
  'isProtected' | 'permissions' | 'role'
> | null;

function canAccessNavItem(user: PermissionUser, item: NavItem): boolean {
  if (!user) return false;
  if (user.isProtected) return true;
  if (!item.requiredPermissions?.length) return true;

  return item.requiredPermissions.some((permissionKey) =>
    hasPermission(
      user.role,
      permissionKey,
      user.permissions as PermissionsData | null,
    ),
  );
}

function canShowNavItem(user: PermissionUser, item: NavItem): boolean {
  return (
    canAccessNavItem(user, item) ||
    (item.children?.some((child) => canShowNavItem(user, child)) ?? false)
  );
}

function filterVisibleNavItems(
  user: PermissionUser,
  items: readonly NavItem[],
): NavItem[] {
  return items
    .map((item) => {
      const children = item.children
        ? filterVisibleNavItems(user, item.children)
        : undefined;

      return {
        ...item,
        ...(children ? { children } : {}),
      };
    })
    .filter((item) => canShowNavItem(user, item));
}

function filterVisibleSpace(
  user: PermissionUser,
  space: NavigationSpace,
): NavigationSpace {
  return {
    ...space,
    sections: space.sections
      .map((section) => ({
        ...section,
        items: filterVisibleNavItems(user, section.items),
      }))
      .filter((section) => section.items.length > 0),
  };
}

const getIcon = (icon: string): LucideIcon => {
  switch (icon) {
    case 'Activity':
      return Activity;
    case 'Archive':
      return Archive;
    case 'Bell':
      return Bell;
    case 'BriefcaseBusiness':
      return BriefcaseBusiness;
    case 'CalendarClock':
      return CalendarClock;
    case 'CheckCircle2':
      return CheckCircle2;
    case 'CircleDollarSign':
      return CircleDollarSign;
    case 'ClipboardList':
      return ClipboardList;
    case 'FileCheck2':
      return FileCheck2;
    case 'FileText':
      return FileText;
    case 'Handshake':
      return Handshake;
    case 'History':
      return History;
    case 'Home':
      return Home;
    case 'LayoutDashboard':
      return LayoutDashboard;
    case 'Newspaper':
      return Newspaper;
    case 'Search':
      return Search;
    case 'ShieldCheck':
      return ShieldCheck;
    case 'UserCheck':
      return UserCheck;
    case 'UserPlus':
      return UserPlus;
    case 'Users':
      return Users;
    case 'Wallet':
      return Wallet;
    default:
      return Settings;
  }
};

const SpaceLinks: FC<{ currentHref: string; space: NavigationSpace }> = ({
  currentHref,
  space,
}) => {
  const links = getNavigationSpaceItems(space).filter(
    (item) => (item.children?.length ?? 0) === 0,
  );

  return (
    <aside className="border-sidebar-border/70 bg-card/90 rounded-lg border p-4">
      <h2 className="text-sm font-semibold">Pages du pole</h2>
      <div className="mt-3 space-y-1.5">
        {links.map((link) => {
          const LinkIcon = getIcon(link.icon);
          const isCurrent = link.href === currentHref;

          return (
            <Button
              key={link.href}
              asChild
              variant={isCurrent ? 'secondary' : 'ghost'}
              className="h-auto w-full justify-start rounded-md px-2.5 py-2 text-left"
            >
              <Link href={link.href}>
                <LinkIcon className="size-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{link.label}</span>
              </Link>
            </Button>
          );
        })}
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
        <section className="border-sidebar-border/70 bg-card/90 rounded-lg border p-4">
          <h2 className="text-sm font-semibold">Sous-pages</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {children.map((child) => {
              const ChildIcon = getIcon(child.icon);

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
      <section className="border-sidebar-border/70 bg-card/90 rounded-lg border p-4">
        <h2 className="text-sm font-semibold">Organisation du pole</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {visibleSections.map((section) => (
            <div
              key={section.id}
              className="border-border/60 bg-popover/60 rounded-md border p-3"
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
  const canAccessPage = canShowNavItem(userData, item);
  const visibleSpace = filterVisibleSpace(userData, space);
  const visibleItem =
    getNavigationSpaceItems(visibleSpace).find(
      (link) => link.href === item.href,
    ) ?? item;
  const tone = getNavigationSpaceToneClasses(space.tone);
  const Icon = getIcon(item.icon);

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
                'overflow-hidden rounded-lg border shadow-sm shadow-black/10',
                tone.hero,
              )}
            >
              <div className={cn('h-1.5 w-full', tone.accent)} />
              <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
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
                    <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">
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
                    Accueil du pole
                  </Link>
                </Button>
              </div>
            </section>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
              <SectionMap item={visibleItem} space={visibleSpace} />
              <SpaceLinks currentHref={item.href} space={visibleSpace} />
            </div>
          </PageCanvas>
        </PageShell>
      )}
    </AuthenticatedLayout>
  );
};

export default PrivateFeaturePage;
