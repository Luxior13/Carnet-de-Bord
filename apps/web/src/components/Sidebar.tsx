'use client';

import { Check, ChevronDown, ChevronRight, LogOut, User } from 'lucide-react';
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
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
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
  const { isMobile, setOpenMobile, state: sidebarState } = useSidebar();
  const ActiveIcon = getNavigationIcon(activeSpace.icon);
  const activeTone = getNavigationSpaceToneClasses(activeSpace.tone);
  const isCollapsed = !isMobile && sidebarState === 'collapsed';
  const hasAlternatives = spaces.length > 1;
  const rowClassName = cn(
    'flex h-11 w-full min-w-0 items-center gap-2.5 rounded-md border border-transparent bg-transparent px-2 text-left transition-[background-color,border-color,box-shadow] outline-none lg:h-10',
    'group-data-[collapsible=icon]/sidebar:justify-start group-data-[collapsible=icon]/sidebar:gap-0 group-data-[collapsible=icon]/sidebar:border-transparent group-data-[collapsible=icon]/sidebar:bg-transparent group-data-[collapsible=icon]/sidebar:px-0 group-data-[collapsible=icon]/sidebar:pl-3',
  );
  const rowContent = (
    <>
      <span
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-md border',
          activeTone.icon,
        )}
      >
        <ActiveIcon className="size-4" />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold transition-opacity duration-100 group-data-[collapsible=icon]/sidebar:max-w-0 group-data-[collapsible=icon]/sidebar:opacity-0 group-data-[collapsible=icon]/sidebar:delay-0 group-data-[state=expanded]/sidebar:delay-150">
        {activeSpace.label}
      </span>
    </>
  );

  if (!hasAlternatives) {
    return (
      <div
        className={rowClassName}
        title={isCollapsed ? activeSpace.label : undefined}
      >
        {rowContent}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Changer d'espace. Espace actuel : ${activeSpace.label}`}
          title={isCollapsed ? activeSpace.label : undefined}
          className={cn(
            rowClassName,
            'group/space-switcher hover:border-sidebar-border/60 hover:bg-sidebar-accent/30 focus-visible:ring-sidebar-ring data-[state=open]:border-sidebar-ring/35 data-[state=open]:bg-sidebar-accent/35 focus-visible:ring-2',
          )}
        >
          {rowContent}
          <ChevronDown className="text-sidebar-foreground/60 size-4 shrink-0 transition-transform group-data-[collapsible=icon]/sidebar:hidden group-data-[state=open]/space-switcher:rotate-180 motion-reduce:transition-none" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={isCollapsed ? 'right' : 'bottom'}
        align="start"
        sideOffset={8}
        className={cn(
          'border-sidebar-border bg-surface-raised/98 text-sidebar-foreground max-h-[var(--radix-dropdown-menu-content-available-height)] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-md p-1.5 shadow-[var(--shadow-panel-strong)]',
          isCollapsed
            ? 'w-80'
            : 'w-[var(--radix-dropdown-menu-trigger-width)] min-w-64',
        )}
      >
        <DropdownMenuLabel className="text-sidebar-foreground/60 px-2 py-1.5 text-xs font-medium">
          Changer d’espace
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
                'focus:text-sidebar-foreground cursor-pointer rounded-lg p-2.5',
                tone.row,
                isActive && tone.activeItem,
              )}
            >
              <Link
                aria-current={isActive ? 'location' : undefined}
                href={space.href}
                onClick={() => setOpenMobile(false)}
                className="flex min-w-0 items-center gap-3"
              >
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
                {isActive && (
                  <Check
                    aria-hidden="true"
                    className="text-sidebar-ring size-4 shrink-0"
                  />
                )}
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
  const { isMobile, setOpenMobile, state: sidebarState } = useSidebar();
  const isCollapsed = !isMobile && sidebarState === 'collapsed';

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

  useEffect(() => {
    setOpenMobile(false);
  }, [pathname, setOpenMobile]);

  const renderSubNavItem = (item: NavItem): React.ReactNode => {
    const Icon = getNavigationIcon(item.icon);
    const isExactActive = pathname === item.href;
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
            aria-current={
              isExactActive ? 'page' : isActive ? 'location' : undefined
            }
            href={item.href}
            onClick={() => setOpenMobile(false)}
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
    const isExactActive = pathname === item.href;
    const isActive = isActivePath(
      pathname,
      item.href,
      item.href === activeSpace.href,
    );

    if (children.length > 0) {
      const isGroupOpen = openGroupHref === item.href;

      if (isCollapsed) {
        return (
          <DropdownMenu key={item.href}>
            <SidebarMenuItem>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  aria-label={`Ouvrir ${item.label}`}
                  aria-current={
                    isExactActive
                      ? 'page'
                      : hasActiveChild
                        ? 'location'
                        : undefined
                  }
                  isActive={isActive || hasActiveChild}
                  title={item.label}
                  className={cn(
                    activeTone.menuButton,
                    hasActiveChild && activeTone.branchButton,
                  )}
                >
                  <Icon className="size-4" />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                aria-label={item.label}
                className="border-sidebar-border bg-surface-raised/98 text-sidebar-foreground w-64 overflow-hidden rounded-md p-1.5 shadow-[var(--shadow-panel-strong)]"
                side="right"
                sideOffset={8}
              >
                <DropdownMenuLabel className="text-sidebar-foreground/65 truncate px-2 py-1.5 text-xs font-medium">
                  {item.label}
                </DropdownMenuLabel>
                <DropdownMenuItem
                  asChild
                  className={cn(
                    'focus:text-sidebar-foreground cursor-pointer rounded-md px-2.5 py-2 text-sm',
                    activeTone.row,
                    isExactActive && activeTone.activeItem,
                  )}
                >
                  <Link
                    aria-current={isExactActive ? 'page' : undefined}
                    href={item.href}
                    onClick={() => setOpenMobile(false)}
                  >
                    <Icon className="size-4" />
                    <span className="truncate">Vue d’ensemble</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-sidebar-border/70 mx-1 my-1" />
                {children.map((child) => {
                  const ChildIcon = getNavigationIcon(child.icon);
                  const isChildExactActive = pathname === child.href;
                  const isChildActive = isActivePath(
                    pathname,
                    child.href,
                    child.href === activeSpace.href,
                  );

                  return (
                    <DropdownMenuItem
                      key={child.href}
                      asChild
                      className={cn(
                        'focus:text-sidebar-foreground cursor-pointer rounded-md px-2.5 py-2 text-sm',
                        activeTone.row,
                        isChildActive && activeTone.activeItem,
                      )}
                    >
                      <Link
                        aria-current={
                          isChildExactActive
                            ? 'page'
                            : isChildActive
                              ? 'location'
                              : undefined
                        }
                        href={child.href}
                        onClick={() => setOpenMobile(false)}
                      >
                        <ChildIcon className="size-4" />
                        <span className="truncate">{child.label}</span>
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </SidebarMenuItem>
          </DropdownMenu>
        );
      }

      return (
        <Collapsible
          key={item.href}
          asChild
          open={isGroupOpen}
          onOpenChange={(open) => setOpenGroupHref(open ? item.href : null)}
          className="group/collapsible"
        >
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive && !hasActiveChild}
              tooltip={item.label}
              className={cn(
                'pr-10 group-data-[collapsible=icon]/sidebar:pr-0',
                activeTone.menuButton,
                hasActiveChild && activeTone.branchButton,
              )}
            >
              <Link
                aria-current={
                  isExactActive
                    ? 'page'
                    : hasActiveChild
                      ? 'location'
                      : undefined
                }
                href={item.href}
                onClick={() => setOpenMobile(false)}
              >
                <Icon className="size-4" />
                <span>{item.label}</span>
              </Link>
            </SidebarMenuButton>
            <CollapsibleTrigger asChild>
              <SidebarMenuAction
                aria-label={`${isGroupOpen ? 'Replier' : 'Déplier'} ${item.label}`}
              >
                <ChevronRight className="size-4 transition-transform duration-150 group-data-[state=open]/collapsible:rotate-90" />
              </SidebarMenuAction>
            </CollapsibleTrigger>
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
            aria-current={
              isExactActive ? 'page' : isActive ? 'location' : undefined
            }
            href={item.href}
            onClick={() => setOpenMobile(false)}
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
      <SidebarHeader className="border-sidebar-border/70 bg-sidebar/95 gap-2 border-b p-3 group-data-[collapsible=icon]/sidebar:px-0">
        <Link
          href="/"
          aria-label="Retour au tableau de bord"
          onClick={() => setOpenMobile(false)}
          title={isCollapsed ? SITE_CONFIG.name : undefined}
          className={cn(
            'hover:bg-sidebar-accent/30 focus-visible:ring-sidebar-ring hover:border-sidebar-border/45 flex h-11 w-full min-w-0 items-center gap-2.5 overflow-hidden rounded-md border border-transparent px-2 text-left transition-[background-color,border-color,box-shadow] outline-none focus-visible:ring-2 lg:h-9',
            'group-data-[collapsible=icon]/sidebar:justify-start group-data-[collapsible=icon]/sidebar:gap-0 group-data-[collapsible=icon]/sidebar:border-transparent group-data-[collapsible=icon]/sidebar:bg-transparent group-data-[collapsible=icon]/sidebar:px-0 group-data-[collapsible=icon]/sidebar:pl-3',
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
          <span className="max-w-40 min-w-0 truncate text-sm font-semibold tracking-normal transition-opacity duration-100 group-data-[collapsible=icon]/sidebar:max-w-0 group-data-[collapsible=icon]/sidebar:opacity-0 group-data-[collapsible=icon]/sidebar:delay-0 group-data-[state=expanded]/sidebar:delay-150">
            {SITE_CONFIG.name}
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
        <nav
          aria-label="Navigation principale"
          className="flex min-w-0 flex-col gap-2"
        >
          {topSections.map((section) => {
            const sectionLabelId = `sidebar-section-${activeSpace.id}-${section.id}`;

            return (
              <SidebarGroup key={section.id}>
                {section.label ? (
                  <SidebarGroupLabel id={sectionLabelId}>
                    {section.label}
                  </SidebarGroupLabel>
                ) : (
                  <span id={sectionLabelId} className="sr-only">
                    Navigation {activeSpace.label}
                  </span>
                )}
                <SidebarGroupContent>
                  <SidebarMenu aria-labelledby={sectionLabelId}>
                    {section.items.map(renderNavItem)}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          })}
        </nav>
      </SidebarContent>
      <SidebarFooter className="border-sidebar-border/70 border-t group-data-[collapsible=icon]/sidebar:px-0">
        {bottomSections.length > 0 && (
          <nav aria-label="Navigation secondaire">
            {bottomSections.map((section) => {
              const sectionLabelId = `sidebar-footer-section-${activeSpace.id}-${section.id}`;

              return (
                <SidebarGroup key={section.id} className="p-0">
                  <span id={sectionLabelId} className="sr-only">
                    {section.label ?? 'Navigation secondaire'}
                  </span>
                  <SidebarGroupContent>
                    <SidebarMenu aria-labelledby={sectionLabelId}>
                      {section.items.map(renderNavItem)}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              );
            })}
          </nav>
        )}
        {userData && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`Menu utilisateur de ${userDisplayName}`}
                title={isCollapsed ? userDisplayName : undefined}
                className={cn(
                  'group/account-menu border-sidebar-border/65 bg-surface-control hover:border-sidebar-ring/25 hover:bg-surface-subtle focus-visible:ring-sidebar-ring data-[state=open]:border-sidebar-ring/35 data-[state=open]:bg-surface-subtle flex h-11 min-w-0 items-center gap-2.5 overflow-hidden rounded-md border px-2 text-left transition-[background-color,border-color,box-shadow] outline-none focus-visible:ring-2 lg:h-10',
                  'group-data-[collapsible=icon]/sidebar:justify-start group-data-[collapsible=icon]/sidebar:gap-0 group-data-[collapsible=icon]/sidebar:border-transparent group-data-[collapsible=icon]/sidebar:bg-transparent group-data-[collapsible=icon]/sidebar:px-0 group-data-[collapsible=icon]/sidebar:pl-3',
                )}
              >
                <UserAvatar user={userData} className="size-8 rounded-md" />
                <span className="min-w-0 flex-1 overflow-hidden transition-opacity duration-100 group-data-[collapsible=icon]/sidebar:max-w-0 group-data-[collapsible=icon]/sidebar:opacity-0 group-data-[collapsible=icon]/sidebar:delay-0 group-data-[state=expanded]/sidebar:delay-150">
                  <span className="block truncate text-sm font-medium">
                    {userDisplayName}
                  </span>
                  <span className="text-sidebar-foreground/65 block truncate text-xs">
                    {userAccessLabel}
                  </span>
                </span>
                <ChevronDown className="text-sidebar-foreground/60 size-4 shrink-0 transition-transform group-data-[collapsible=icon]/sidebar:hidden group-data-[state=open]/account-menu:rotate-180 motion-reduce:transition-none" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side={isCollapsed ? 'right' : 'top'}
              align={isCollapsed ? 'end' : 'center'}
              sideOffset={6}
              className={cn(
                'border-sidebar-border bg-surface-raised/98 text-sidebar-foreground overflow-hidden rounded-md p-1.5 shadow-[var(--shadow-panel-strong)]',
                isCollapsed
                  ? 'w-64'
                  : 'w-[var(--radix-dropdown-menu-trigger-width)]',
              )}
            >
              <DropdownMenuItem
                asChild
                className="focus:text-sidebar-foreground focus:bg-sidebar-accent/35 h-11 cursor-pointer gap-2.5 rounded-md px-2.5 text-sm lg:h-10"
              >
                <Link
                  aria-current={
                    pathname === '/mon-compte'
                      ? 'page'
                      : pathname.startsWith('/mon-compte/')
                        ? 'location'
                        : undefined
                  }
                  href="/mon-compte"
                  onClick={() => setOpenMobile(false)}
                >
                  <User className="size-4 shrink-0" />
                  <span className="truncate font-medium">Mon compte</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-sidebar-border/70 mx-1 my-1" />
              <DropdownMenuItem
                onClick={() => {
                  setOpenMobile(false);
                  void logout();
                }}
                className="focus:bg-destructive/15 focus:text-destructive text-destructive h-11 cursor-pointer gap-2.5 rounded-md px-2.5 text-sm lg:h-10"
              >
                <LogOut className="size-4 shrink-0" />
                <span className="truncate font-medium">Déconnexion</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </SidebarFooter>
    </SidebarRoot>
  );
};

export default Sidebar;
