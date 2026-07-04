'use client';

import {
  Activity,
  Archive,
  Bell,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ChevronsUpDown,
  CircleDollarSign,
  ClipboardList,
  FileCheck2,
  FileText,
  Handshake,
  History,
  Home,
  LayoutDashboard,
  LogOut,
  type LucideIcon,
  Newspaper,
  Settings,
  ShieldCheck,
  User,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { type FC, useEffect, useMemo, useState } from 'react';

import { UserAvatar } from '$components/users/UserAvatar';
import {
  getAccessLabel,
  getActiveNavigationSpace,
  getDesktopSidebarSections,
  getVisibleNavigationSpaces,
  type NavigationSpace,
  type NavItem,
  SITE_CONFIG,
} from '$constants/app.constants';
import {
  getNavigationSpaceBadgeClasses,
  getNavigationSpaceToneClasses,
} from '$constants/navigation-theme.constants';
import { useUser } from '$context/UserContext';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '$ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '$ui/dropdown-menu';
import {
  Sidebar as SidebarRoot,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from '$ui/sidebar';
import { cn } from '$utils/css.utils';

const iconMap: Record<string, LucideIcon> = {
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
  Newspaper,
  Settings,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
};

type SidebarProps = {
  className?: string;
};

function isActivePath(pathname: string, href: string, exact = false): boolean {
  if (exact) return pathname === href;

  return pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));
}

function isNavItemActive(
  pathname: string,
  item: NavItem,
  spaceRootHref: string,
): boolean {
  if (isActivePath(pathname, item.href, item.href === spaceRootHref)) {
    return true;
  }

  return (
    item.children?.some((child) =>
      isNavItemActive(pathname, child, spaceRootHref),
    ) ?? false
  );
}

function getActiveGroupHref(
  items: readonly NavItem[],
  pathname: string,
  spaceRootHref: string,
): string | null {
  const activeGroup = items.find(
    (item) =>
      (item.children?.length ?? 0) > 0 &&
      isNavItemActive(pathname, item, spaceRootHref),
  );

  return activeGroup?.href ?? null;
}

const SpaceSwitcher: FC<{
  activeSpace: NavigationSpace;
  spaces: NavigationSpace[];
}> = ({ activeSpace, spaces }) => {
  const { setOpenMobile, state: sidebarState } = useSidebar();
  const ActiveIcon = iconMap[activeSpace.icon] ?? Settings;
  const activeTone = getNavigationSpaceToneClasses(activeSpace.tone);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Espace actif : ${activeSpace.label}`}
          title={activeSpace.label}
          className={cn(
            'border-sidebar-border/65 hover:border-sidebar-ring/30 focus-visible:ring-sidebar-ring data-[state=open]:border-sidebar-ring/40 flex h-11 w-full min-w-0 items-center gap-3 rounded-xl border bg-[#101827]/75 px-2.5 text-left transition-[background-color,border-color,box-shadow] outline-none hover:bg-[#162238]/85 focus-visible:ring-2 data-[state=open]:bg-[#172238]',
            'group-data-[collapsible=icon]/sidebar:justify-start group-data-[collapsible=icon]/sidebar:gap-0 group-data-[collapsible=icon]/sidebar:border-transparent group-data-[collapsible=icon]/sidebar:bg-transparent group-data-[collapsible=icon]/sidebar:px-0 group-data-[collapsible=icon]/sidebar:pl-2.5',
          )}
        >
          <span
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-lg border',
              activeTone.icon,
            )}
          >
            <ActiveIcon className="size-4" />
          </span>
          <span className="min-w-0 flex-1 overflow-hidden transition-opacity duration-100 group-data-[collapsible=icon]/sidebar:max-w-0 group-data-[collapsible=icon]/sidebar:opacity-0 group-data-[collapsible=icon]/sidebar:delay-0 group-data-[state=expanded]/sidebar:delay-150">
            <span className="text-sidebar-foreground/60 block truncate text-[11px] font-medium uppercase">
              Espace
            </span>
            <span className="block truncate text-sm font-semibold">
              {activeSpace.label}
            </span>
          </span>
          <ChevronsUpDown className="text-sidebar-foreground/60 size-4 shrink-0 group-data-[collapsible=icon]/sidebar:hidden" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="right"
        align="start"
        sideOffset={10}
        alignOffset={sidebarState === 'collapsed' ? 0 : -2}
        className={cn(
          'border-sidebar-border text-sidebar-foreground w-[calc(100vw-2rem)] max-w-80 overflow-hidden rounded-xl bg-[linear-gradient(180deg,rgba(18,23,30,0.96),rgba(25,33,50,0.96))] p-1.5 shadow-2xl shadow-black/25 sm:w-80',
        )}
      >
        <DropdownMenuLabel className="text-sidebar-foreground/60 px-2 py-1.5 text-xs font-medium">
          Espaces de gestion
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-sidebar-border/70 mx-1 my-1" />
        {spaces.map((space) => {
          const SpaceIcon = iconMap[space.icon] ?? Settings;
          const isActive = activeSpace.id === space.id;
          const tone = getNavigationSpaceToneClasses(space.tone);

          return (
            <DropdownMenuItem
              key={space.id}
              asChild
              className={cn(
                'focus:text-sidebar-foreground relative cursor-pointer rounded-lg p-2.5',
                tone.row,
                isActive && tone.activeItem,
              )}
            >
              <Link
                aria-current={isActive ? 'page' : undefined}
                href={space.href}
                onClick={() => setOpenMobile(false)}
                className="flex min-w-0 items-center gap-3"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute top-2 bottom-2 left-1 w-1 rounded-full',
                    tone.dot,
                  )}
                />
                <span
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-lg border',
                    tone.icon,
                  )}
                >
                  <SpaceIcon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate text-sm font-medium">
                      {space.label}
                    </span>
                    {isActive && (
                      <span className="border-sidebar-ring/35 bg-sidebar-ring/12 text-sidebar-foreground/85 inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] leading-none font-medium">
                        <CheckCircle2 className="size-3" />
                        Actif
                      </span>
                    )}
                    {space.badge && (
                      <span
                        className={cn(
                          'inline-flex shrink-0 items-center rounded-full border px-1.5 py-0.5 text-[10px] leading-none font-medium',
                          getNavigationSpaceBadgeClasses(space.badge),
                        )}
                      >
                        {space.badge}
                      </span>
                    )}
                  </span>
                  <span className="text-sidebar-foreground/60 mt-0.5 block truncate text-xs leading-4">
                    {space.summary}
                  </span>
                </span>
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const Sidebar: FC<SidebarProps> = ({ className }) => {
  const pathname = usePathname();
  const { logout, userData } = useUser();
  const { setOpenMobile, state: sidebarState } = useSidebar();

  const visibleSpaces = useMemo(
    () => getVisibleNavigationSpaces(userData),
    [userData],
  );
  const activeSpace = useMemo(
    () => getActiveNavigationSpace(pathname, visibleSpaces),
    [pathname, visibleSpaces],
  );
  const activeTone = useMemo(
    () => getNavigationSpaceToneClasses(activeSpace.tone),
    [activeSpace.tone],
  );
  const sections = useMemo(
    () => getDesktopSidebarSections(userData, pathname),
    [pathname, userData],
  );

  const topSections = sections.filter(
    (section) => section.position !== 'bottom',
  );
  const bottomSections = sections.filter(
    (section) => section.position === 'bottom',
  );

  const navItems = useMemo(
    () => sections.flatMap((section) => section.items),
    [sections],
  );
  const activeGroupHref = useMemo(
    () => getActiveGroupHref(navItems, pathname, activeSpace.href),
    [activeSpace.href, navItems, pathname],
  );
  const [openGroupHref, setOpenGroupHref] = useState<string | null>(
    activeGroupHref,
  );
  const userDisplayName = userData
    ? `${userData.firstName} ${userData.lastName}`
    : '';
  const userAccessLabel = userData ? getAccessLabel(userData) : '';

  useEffect(() => {
    setOpenGroupHref(activeGroupHref);
  }, [activeGroupHref]);

  const renderSubNavItem = (item: NavItem): React.ReactNode => {
    const Icon = iconMap[item.icon] ?? Settings;
    const isActive = isActivePath(
      pathname,
      item.href,
      item.href === activeSpace.href,
    );

    return (
      <SidebarMenuSubItem key={item.href}>
        <SidebarMenuSubButton
          asChild
          isActive={isActive}
          className={activeTone.subButton}
        >
          <Link
            aria-current={isActive ? 'page' : undefined}
            aria-label={item.label}
            href={item.href}
            onClick={() => setOpenMobile(false)}
            title={item.label}
          >
            <Icon className="size-4" />
            <span>{item.label}</span>
          </Link>
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    );
  };

  const renderNavItem = (item: NavItem): React.ReactNode => {
    const Icon = iconMap[item.icon] ?? Settings;
    const children = item.children ?? [];
    const hasActiveChild = children.some((child) =>
      isNavItemActive(pathname, child, activeSpace.href),
    );
    const isActive = isActivePath(
      pathname,
      item.href,
      item.href === activeSpace.href,
    );

    if (children.length > 0) {
      return (
        <Collapsible
          key={item.href}
          asChild
          open={openGroupHref === item.href}
          onOpenChange={(open) => setOpenGroupHref(open ? item.href : null)}
          className="group/collapsible"
        >
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive && !hasActiveChild}
              tooltip={item.label}
              className={cn(
                activeTone.menuButton,
                hasActiveChild && activeTone.branchButton,
              )}
            >
              <CollapsibleTrigger
                aria-label={item.label}
                title={item.label}
                type="button"
              >
                <Icon className="size-4" />
                <span>{item.label}</span>
                <ChevronRight className="ml-auto size-4 shrink-0 transition-transform duration-150 group-data-[collapsible=icon]/sidebar:hidden group-data-[state=open]/collapsible:rotate-90" />
              </CollapsibleTrigger>
            </SidebarMenuButton>
            <CollapsibleContent>
              <SidebarMenuSub>{children.map(renderSubNavItem)}</SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      );
    }

    return (
      <SidebarMenuItem key={item.href}>
        <SidebarMenuButton
          asChild
          isActive={isActive}
          tooltip={item.label}
          className={activeTone.menuButton}
        >
          <Link
            aria-current={isActive ? 'page' : undefined}
            aria-label={item.label}
            href={item.href}
            onClick={() => setOpenMobile(false)}
            title={item.label}
          >
            <Icon className="size-4" />
            <span>{item.label}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <SidebarRoot collapsible="icon" variant="sidebar" className={className}>
      <SidebarHeader className="border-sidebar-border/70 border-b bg-[linear-gradient(180deg,rgba(10,15,24,0.12),rgba(10,15,24,0))] p-3 group-data-[collapsible=icon]/sidebar:px-0">
        <Link
          href="/tableau-de-bord"
          onClick={() => setOpenMobile(false)}
          className={cn(
            'border-sidebar-border/70 hover:border-sidebar-ring/35 flex h-11 w-full min-w-0 items-center gap-3 overflow-hidden rounded-xl border bg-[linear-gradient(180deg,rgba(95,132,200,0.12),rgba(34,49,74,0.8))] px-2.5 transition-[background-color,border-color,box-shadow] hover:bg-[linear-gradient(180deg,rgba(95,132,200,0.16),rgba(34,49,74,0.9))] hover:shadow-[inset_0_0_0_1px_rgba(108,146,214,0.16)]',
            'group-data-[collapsible=icon]/sidebar:justify-start group-data-[collapsible=icon]/sidebar:gap-0 group-data-[collapsible=icon]/sidebar:border-transparent group-data-[collapsible=icon]/sidebar:bg-transparent group-data-[collapsible=icon]/sidebar:px-0 group-data-[collapsible=icon]/sidebar:pl-2.5',
          )}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg">
            <Image
              src="/assets/noc.png"
              alt=""
              width={30}
              height={30}
              className="object-contain"
              priority
            />
          </span>
          <span className="max-w-40 min-w-0 overflow-hidden transition-opacity duration-100 group-data-[collapsible=icon]/sidebar:max-w-0 group-data-[collapsible=icon]/sidebar:opacity-0 group-data-[collapsible=icon]/sidebar:delay-0 group-data-[state=expanded]/sidebar:delay-150">
            <span className="block truncate text-sm font-semibold tracking-[0.01em]">
              {SITE_CONFIG.name}
            </span>
            <span className="text-sidebar-foreground/65 block truncate text-[11px]">
              {SITE_CONFIG.subtitle}
            </span>
          </span>
        </Link>
        {visibleSpaces.length > 0 && (
          <SpaceSwitcher activeSpace={activeSpace} spaces={visibleSpaces} />
        )}
      </SidebarHeader>
      <SidebarContent
        scrollRestoreKey={pathname}
        scrollStorageKey={activeSpace.id}
      >
        {topSections.map((section) => (
          <SidebarGroup key={section.id}>
            {section.label && (
              <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>{section.items.map(renderNavItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-sidebar-border/70 border-t group-data-[collapsible=icon]/sidebar:px-0">
        {bottomSections.map((section) => (
          <SidebarGroup key={section.id} className="p-0">
            <SidebarGroupContent>
              <SidebarMenu>{section.items.map(renderNavItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
        {userData && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`Menu utilisateur de ${userDisplayName}`}
                title={userDisplayName}
                className={cn(
                  'border-sidebar-border/65 hover:border-sidebar-ring/25 focus-visible:ring-sidebar-ring data-[state=open]:border-sidebar-ring/35 flex min-w-0 items-center gap-3 overflow-hidden rounded-xl border bg-[linear-gradient(180deg,rgba(95,132,200,0.06),rgba(34,49,74,0.68))] p-2.5 text-left transition-[background-color,border-color,box-shadow] outline-none hover:bg-[linear-gradient(180deg,rgba(95,132,200,0.11),rgba(34,49,74,0.8))] hover:shadow-[inset_0_0_0_1px_rgba(108,146,214,0.1)] focus-visible:ring-2 data-[state=open]:bg-[linear-gradient(180deg,rgba(95,132,200,0.14),rgba(34,49,74,0.86))] data-[state=open]:shadow-[inset_0_0_0_1px_rgba(108,146,214,0.14)]',
                  'group-data-[collapsible=icon]/sidebar:justify-start group-data-[collapsible=icon]/sidebar:gap-0 group-data-[collapsible=icon]/sidebar:border-transparent group-data-[collapsible=icon]/sidebar:bg-transparent group-data-[collapsible=icon]/sidebar:p-0 group-data-[collapsible=icon]/sidebar:pl-2.5',
                )}
              >
                <UserAvatar user={userData} className="size-9 rounded-lg" />
                <span className="min-w-0 flex-1 overflow-hidden transition-opacity duration-100 group-data-[collapsible=icon]/sidebar:max-w-0 group-data-[collapsible=icon]/sidebar:opacity-0 group-data-[collapsible=icon]/sidebar:delay-0 group-data-[state=expanded]/sidebar:delay-150">
                  <span className="block truncate text-sm font-medium">
                    {userDisplayName}
                  </span>
                  <span className="text-sidebar-foreground/65 block truncate text-xs">
                    {userAccessLabel}
                  </span>
                </span>
                <ChevronsUpDown className="text-sidebar-foreground/60 size-4 shrink-0 group-data-[collapsible=icon]/sidebar:hidden" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side={sidebarState === 'collapsed' ? 'right' : 'top'}
              align={sidebarState === 'collapsed' ? 'end' : 'center'}
              sideOffset={6}
              className={cn(
                'border-sidebar-border text-sidebar-foreground overflow-hidden rounded-xl bg-[linear-gradient(180deg,rgba(18,23,30,0.94),rgba(25,33,50,0.94))] p-0 shadow-2xl shadow-black/20',
                sidebarState === 'collapsed'
                  ? 'w-64'
                  : 'w-[var(--radix-dropdown-menu-trigger-width)]',
              )}
            >
              <DropdownMenuLabel className="border-sidebar-border/60 bg-sidebar-accent/20 border-b p-3 font-normal">
                <div className="flex min-w-0 items-center gap-3">
                  <UserAvatar user={userData} className="size-10 rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {userDisplayName}
                    </p>
                    <p className="text-sidebar-foreground/65 mt-0.5 truncate text-xs">
                      {userData.email}
                    </p>
                  </div>
                </div>
              </DropdownMenuLabel>
              <div className="p-1.5">
                <DropdownMenuItem
                  asChild
                  className="focus:text-sidebar-foreground focus:bg-sidebar-accent/35 cursor-pointer rounded-lg p-2.5"
                >
                  <Link
                    href="/mon-compte"
                    className="flex items-center gap-3"
                    onClick={() => setOpenMobile(false)}
                  >
                    <span className="border-sidebar-border/70 bg-sidebar-accent/20 flex size-8 shrink-0 items-center justify-center rounded-lg border">
                      <User className="text-sidebar-ring size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        Mon compte
                      </span>
                      <span className="text-sidebar-foreground/60 block truncate text-xs">
                        Profil et sécurité
                      </span>
                    </span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-sidebar-border/70 mx-1 my-1.5" />
                <DropdownMenuItem
                  onClick={() => {
                    setOpenMobile(false);
                    void logout();
                  }}
                  className="focus:bg-destructive/15 focus:text-destructive text-destructive mx-1 h-8 cursor-pointer justify-center gap-2 rounded-lg p-1.5 text-xs"
                >
                  <LogOut className="size-3.5" />
                  <span className="font-medium">Déconnexion</span>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </SidebarFooter>
      <SidebarRail />
    </SidebarRoot>
  );
};

export default Sidebar;
