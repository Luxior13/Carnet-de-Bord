'use client';

import {
  CheckCircle2,
  ChevronRight,
  ChevronsUpDown,
  LogOut,
  Pin,
  PinOff,
  User,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { type FC, useEffect, useMemo, useRef, useState } from 'react';

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
import { getNavigationIcon } from '$constants/navigation-icon.constants';
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
  SidebarTrigger,
  useSidebar,
} from '$ui/sidebar';
import { cn } from '$utils/css.utils';

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
  const { closeDesktop, setOpenMobile, state: sidebarState } = useSidebar();
  const ActiveIcon = getNavigationIcon(activeSpace.icon);
  const activeTone = getNavigationSpaceToneClasses(activeSpace.tone);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Pôle actif : ${activeSpace.label}`}
          title={activeSpace.label}
          className={cn(
            'focus-visible:ring-sidebar-ring data-[state=open]:border-sidebar-ring/45 flex h-11 w-full min-w-0 items-center gap-3 rounded-md border px-2.5 text-left transition-[background-color,border-color,box-shadow] outline-none focus-visible:ring-2',
            activeTone.soft,
            'group-data-[collapsible=icon]/sidebar:justify-start group-data-[collapsible=icon]/sidebar:gap-0 group-data-[collapsible=icon]/sidebar:border-transparent group-data-[collapsible=icon]/sidebar:bg-transparent group-data-[collapsible=icon]/sidebar:px-0 group-data-[collapsible=icon]/sidebar:pl-3.5',
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
            <span className="text-sidebar-foreground/60 block truncate text-xs font-medium uppercase">
              Pôle actif
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
          'border-sidebar-border bg-surface-raised/98 text-sidebar-foreground w-[calc(100vw-2rem)] max-w-80 overflow-hidden rounded-md p-1.5 shadow-[var(--shadow-panel-strong)] sm:w-80',
        )}
      >
        <DropdownMenuLabel className="text-sidebar-foreground/60 px-2 py-1.5 text-xs font-medium">
          Espaces de gestion
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-sidebar-border/70 mx-1 my-1" />
        {spaces.map((space) => {
          const SpaceIcon = getNavigationIcon(space.icon);
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
                onClick={() => {
                  setOpenMobile(false);
                  closeDesktop();
                }}
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
                      <span className="border-sidebar-ring/35 bg-sidebar-ring/12 text-sidebar-foreground/85 inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs leading-none font-medium">
                        <CheckCircle2 className="size-3" />
                        Actif
                      </span>
                    )}
                    {space.badge && (
                      <span
                        className={cn(
                          'inline-flex shrink-0 items-center rounded-full border px-1.5 py-0.5 text-xs leading-none font-medium',
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
  const {
    closeDesktop,
    isPinned,
    setOpenMobile,
    state: sidebarState,
    togglePinned,
  } = useSidebar();

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
  const previousPathnameRef = useRef(pathname);
  const userDisplayName = userData
    ? `${userData.firstName} ${userData.lastName}`
    : '';
  const userAccessLabel = userData ? getAccessLabel(userData) : '';

  const handleNavigation = (): void => {
    setOpenMobile(false);
    closeDesktop();
  };

  useEffect(() => {
    setOpenGroupHref(activeGroupHref);
  }, [activeGroupHref]);

  useEffect(() => {
    if (previousPathnameRef.current === pathname) return;

    previousPathnameRef.current = pathname;
    closeDesktop();
  }, [closeDesktop, pathname]);

  const renderSubNavItem = (item: NavItem): React.ReactNode => {
    const Icon = getNavigationIcon(item.icon);
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
            onClick={handleNavigation}
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
    const Icon = getNavigationIcon(item.icon);
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
            onClick={handleNavigation}
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
      <SidebarHeader className="border-sidebar-border/70 bg-sidebar/95 relative gap-2.5 border-b p-3 group-data-[collapsible=icon]/sidebar:px-0">
        <Link
          href="/"
          aria-label="Retour au tableau de bord"
          onClick={handleNavigation}
          className={cn(
            'hover:bg-sidebar-accent/30 focus-visible:ring-sidebar-ring hover:border-sidebar-border/45 flex h-10 w-full min-w-0 items-center gap-3 overflow-hidden rounded-md border border-transparent px-2 text-left transition-[background-color,border-color,box-shadow] outline-none focus-visible:ring-2',
            'group-data-[collapsible=icon]/sidebar:justify-start group-data-[collapsible=icon]/sidebar:gap-0 group-data-[collapsible=icon]/sidebar:border-transparent group-data-[collapsible=icon]/sidebar:bg-transparent group-data-[collapsible=icon]/sidebar:px-0 group-data-[collapsible=icon]/sidebar:pl-3.5 group-data-[state=expanded]/sidebar:pr-[5.5rem]',
          )}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg">
            <Image
              src="/assets/noc.png"
              alt=""
              width={28}
              height={28}
              className="object-contain"
              priority
            />
          </span>
          <span className="max-w-40 min-w-0 overflow-hidden transition-opacity duration-100 group-data-[collapsible=icon]/sidebar:max-w-0 group-data-[collapsible=icon]/sidebar:opacity-0 group-data-[collapsible=icon]/sidebar:delay-0 group-data-[state=expanded]/sidebar:delay-150">
            <span className="block truncate text-sm font-semibold tracking-normal">
              {SITE_CONFIG.name}
            </span>
            <span className="text-sidebar-foreground/58 block truncate text-xs">
              {SITE_CONFIG.subtitle}
            </span>
          </span>
        </Link>
        <div className="absolute top-3 right-2 z-10 hidden items-center gap-0.5 group-data-[collapsible=icon]/sidebar:hidden lg:flex">
          <button
            type="button"
            aria-label={
              isPinned
                ? 'Désépingler la barre latérale'
                : 'Épingler la barre latérale'
            }
            aria-pressed={isPinned}
            title={
              isPinned
                ? 'Désépingler la barre latérale'
                : 'Épingler la barre latérale'
            }
            className="text-sidebar-foreground/70 hover:bg-sidebar-accent/55 hover:text-sidebar-accent-foreground focus-visible:ring-sidebar-ring inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-transparent transition-[background-color,color,box-shadow] outline-none focus-visible:ring-2"
            onClick={togglePinned}
          >
            {isPinned ? (
              <PinOff className="size-4" aria-hidden="true" />
            ) : (
              <Pin className="size-4" aria-hidden="true" />
            )}
          </button>
          <SidebarTrigger className="text-sidebar-foreground/70 hover:bg-sidebar-accent/55 hover:text-sidebar-accent-foreground shrink-0" />
        </div>
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
                  'border-sidebar-border/65 bg-surface-control hover:border-sidebar-ring/25 hover:bg-surface-subtle focus-visible:ring-sidebar-ring data-[state=open]:border-sidebar-ring/35 data-[state=open]:bg-surface-subtle flex min-w-0 items-center gap-3 overflow-hidden rounded-md border p-2.5 text-left transition-[background-color,border-color,box-shadow] outline-none focus-visible:ring-2',
                  'group-data-[collapsible=icon]/sidebar:justify-start group-data-[collapsible=icon]/sidebar:gap-0 group-data-[collapsible=icon]/sidebar:border-transparent group-data-[collapsible=icon]/sidebar:bg-transparent group-data-[collapsible=icon]/sidebar:p-0 group-data-[collapsible=icon]/sidebar:pl-3.5',
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
                'border-sidebar-border bg-surface-raised/98 text-sidebar-foreground overflow-hidden rounded-md p-0 shadow-[var(--shadow-panel-strong)]',
                sidebarState === 'collapsed'
                  ? 'w-64'
                  : 'w-[var(--radix-dropdown-menu-trigger-width)]',
              )}
            >
              <DropdownMenuLabel className="border-sidebar-border/60 bg-surface-muted border-b p-3 font-normal">
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
                    onClick={handleNavigation}
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
                    handleNavigation();
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
    </SidebarRoot>
  );
};

export default Sidebar;
