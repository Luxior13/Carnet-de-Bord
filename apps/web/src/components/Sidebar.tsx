'use client';

import { ChevronDown, ChevronRight, LogOut, User } from 'lucide-react';
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
import { useFeatureAvailability } from '$context/FeatureAvailabilityContext';
import { useUser } from '$context/UserContext';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '$ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
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
import { Tooltip, TooltipContent, TooltipTrigger } from '$ui/tooltip';
import { cn } from '$utils/css.utils';
import { requestGuardedNavigation } from '$utils/guarded-navigation.utils';

type SidebarProps = {
  className?: string;
};

const SIDEBAR_POPOVER_PANEL_CLASS =
  'border-border-default bg-surface-floating text-popover-foreground flex max-h-[var(--radix-dropdown-menu-content-available-height)] flex-col overflow-hidden rounded-lg border p-0 shadow-[var(--shadow-panel-strong)]';
const SIDEBAR_POPOVER_SCROLL_CLASS =
  'min-h-0 flex-1 overflow-y-auto overscroll-contain p-2';
const SIDEBAR_POPOVER_SECTION_CLASS = 'space-y-0.5';
const SIDEBAR_POPOVER_SECTION_LABEL_CLASS =
  'text-muted-foreground px-2 py-1.5 text-xs font-medium';
const SIDEBAR_POPOVER_ACTION_BASE_CLASS =
  'group/menu-action text-foreground flex min-h-10 w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm font-medium transition-colors duration-150';
const SIDEBAR_POPOVER_ACTION_CLASS =
  'hover:bg-surface-tile-hover focus:bg-surface-tile-hover focus:text-foreground';
const SIDEBAR_POPOVER_DANGER_ACTION_CLASS =
  'hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive';
const SIDEBAR_POPOVER_ICON_BASE_CLASS =
  'flex size-8 shrink-0 items-center justify-center rounded-md transition-colors duration-150';
const SIDEBAR_POPOVER_ICON_ACTION_CLASS =
  'bg-primary/10 text-primary-emphasis ring-primary/15 ring-1 group-hover/menu-action:bg-primary/15 group-focus/menu-action:bg-primary/15';
const SIDEBAR_POPOVER_ICON_DANGER_CLASS =
  'bg-surface-panel text-muted-foreground ring-border-subtle ring-1 group-hover/menu-action:bg-destructive/10 group-hover/menu-action:text-destructive group-hover/menu-action:ring-destructive/20 group-focus/menu-action:bg-destructive/10 group-focus/menu-action:text-destructive group-focus/menu-action:ring-destructive/20';
const SIDEBAR_POPOVER_CHEVRON_CLASS =
  'text-muted-foreground size-3.5 shrink-0 transition-[color,opacity,transform] duration-150 group-hover/menu-action:translate-x-0.5 group-hover/menu-action:text-foreground';

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);

  useEffect(() => {
    if (!isCollapsed) setIsTooltipOpen(false);
  }, [isCollapsed]);
  const rowClassName = cn(
    'flex h-11 w-full min-w-0 items-center gap-2.5 rounded-md bg-transparent px-2 text-left transition-[background-color,color] outline-none lg:h-10',
    'group-data-[collapsible=icon]/sidebar:justify-start group-data-[collapsible=icon]/sidebar:gap-0 group-data-[collapsible=icon]/sidebar:bg-transparent group-data-[collapsible=icon]/sidebar:px-0 group-data-[collapsible=icon]/sidebar:pl-3',
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
        title={isCollapsed ? `Pôle actuel : ${activeSpace.label}` : undefined}
      >
        {rowContent}
      </div>
    );
  }

  const switcherButton = (
    <button
      type="button"
      aria-label={`Changer de pôle. Pôle actuel : ${activeSpace.label}`}
      className={cn(
        rowClassName,
        'group/space-switcher hover:bg-sidebar-accent/55 focus-visible:ring-sidebar-ring data-[state=open]:bg-sidebar-accent/65 focus-visible:ring-2',
      )}
    >
      {rowContent}
      <ChevronDown className="text-sidebar-foreground/60 size-4 shrink-0 transition-transform group-data-[collapsible=icon]/sidebar:hidden group-data-[state=open]/space-switcher:rotate-180 motion-reduce:transition-none" />
    </button>
  );

  const renderSpaceItem = (space: NavigationSpace): React.ReactNode => {
    const SpaceIcon = getNavigationIcon(space.icon);
    const isActive = activeSpace.id === space.id;
    const tone = getNavigationSpaceToneClasses(space.tone);

    return (
      <DropdownMenuItem
        key={space.id}
        asChild
        className={cn(
          SIDEBAR_POPOVER_ACTION_BASE_CLASS,
          'min-h-12',
          isActive
            ? 'bg-primary/10 text-foreground hover:bg-primary/15 focus:bg-primary/15'
            : SIDEBAR_POPOVER_ACTION_CLASS,
        )}
      >
        <Link
          aria-current={isActive ? 'location' : undefined}
          href={space.href}
          onClick={() => setOpenMobile(false)}
          className="min-w-0"
        >
          <span className={cn(SIDEBAR_POPOVER_ICON_BASE_CLASS, tone.icon)}>
            <SpaceIcon className="size-4 text-current" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                className={cn(
                  'truncate',
                  isActive ? 'font-semibold' : 'font-medium',
                )}
              >
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
            <span
              className={cn(
                'mt-0.5 block truncate text-[11px] leading-4',
                isActive
                  ? 'text-sidebar-foreground/70'
                  : 'text-sidebar-foreground/60',
              )}
            >
              {space.summary}
            </span>
          </span>
          {isActive ? (
            <span className="bg-primary/10 text-primary-emphasis inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold">
              Actuel
            </span>
          ) : (
            <ChevronRight
              aria-hidden="true"
              className={SIDEBAR_POPOVER_CHEVRON_CLASS}
            />
          )}
        </Link>
      </DropdownMenuItem>
    );
  };

  return (
    <DropdownMenu
      onOpenChange={(nextOpen) => {
        setIsMenuOpen(nextOpen);
        if (nextOpen) setIsTooltipOpen(false);
      }}
    >
      {isCollapsed ? (
        <Tooltip
          open={isTooltipOpen && !isMenuOpen}
          onOpenChange={(nextOpen) => {
            if (!isMenuOpen) setIsTooltipOpen(nextOpen);
          }}
        >
          <DropdownMenuTrigger asChild>
            <TooltipTrigger asChild>{switcherButton}</TooltipTrigger>
          </DropdownMenuTrigger>
          <TooltipContent side="right" sideOffset={8}>
            Changer de pôle — {activeSpace.label}
          </TooltipContent>
        </Tooltip>
      ) : (
        <DropdownMenuTrigger asChild>{switcherButton}</DropdownMenuTrigger>
      )}
      <DropdownMenuContent
        aria-label="Changer de pôle"
        side={isCollapsed ? 'right' : 'bottom'}
        align="start"
        sideOffset={8}
        collisionPadding={8}
        className={cn(
          SIDEBAR_POPOVER_PANEL_CLASS,
          'w-[min(20rem,calc(100vw-2rem))]',
        )}
      >
        <div className={SIDEBAR_POPOVER_SCROLL_CLASS}>
          <DropdownMenuLabel className={SIDEBAR_POPOVER_SECTION_LABEL_CLASS}>
            Changer de pôle
          </DropdownMenuLabel>
          <DropdownMenuGroup
            aria-label="Pôles disponibles"
            className={SIDEBAR_POPOVER_SECTION_CLASS}
          >
            {spaces.map((space) => renderSpaceItem(space))}
          </DropdownMenuGroup>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const Sidebar: FC<SidebarProps> = ({ className }) => {
  const pathname = usePathname();
  const { featureAvailabilityLoaded, operationalFeatureIds } =
    useFeatureAvailability();
  const { logout, userData } = useUser();
  const { isMobile, setOpenMobile, state: sidebarState } = useSidebar();
  const isCollapsed = !isMobile && sidebarState === 'collapsed';

  const visibleSpaces = useMemo(
    () =>
      getVisibleNavigationSpaces(
        userData,
        'live',
        featureAvailabilityLoaded ? operationalFeatureIds : undefined,
      ),
    [featureAvailabilityLoaded, operationalFeatureIds, userData],
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
    () =>
      getDesktopSidebarSections(
        userData,
        pathname,
        featureAvailabilityLoaded ? operationalFeatureIds : undefined,
      ),
    [featureAvailabilityLoaded, operationalFeatureIds, pathname, userData],
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
  const accountAriaCurrent =
    pathname === '/mon-compte'
      ? 'page'
      : pathname.startsWith('/mon-compte/')
        ? 'location'
        : undefined;
  const isAccountActive = Boolean(accountAriaCurrent);

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
                className="border-border-default bg-surface-floating text-popover-foreground w-64 overflow-hidden rounded-lg border p-2 shadow-[var(--shadow-panel-strong)]"
                side="right"
                sideOffset={8}
              >
                <DropdownMenuLabel className="text-muted-foreground truncate px-2 py-1.5 text-xs font-medium">
                  {item.label}
                </DropdownMenuLabel>
                <DropdownMenuItem
                  asChild
                  className={cn(
                    'focus:text-foreground cursor-pointer rounded-md px-2.5 py-2 text-sm',
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
                <DropdownMenuSeparator className="bg-border-divider mx-1 my-1" />
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
                        'focus:text-foreground cursor-pointer rounded-md px-2.5 py-2 text-sm',
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
      <SidebarHeader className="border-sidebar-border/60 bg-sidebar gap-2 border-b p-3 group-data-[collapsible=icon]/sidebar:px-0">
        <Link
          href="/"
          aria-label="Retour au tableau de bord"
          onClick={() => setOpenMobile(false)}
          title={isCollapsed ? SITE_CONFIG.name : undefined}
          className={cn(
            'hover:bg-sidebar-accent/45 focus-visible:ring-sidebar-ring flex h-11 w-full min-w-0 items-center gap-2.5 overflow-hidden rounded-md px-2 text-left transition-colors outline-none focus-visible:ring-2 lg:h-9',
            'group-data-[collapsible=icon]/sidebar:justify-start group-data-[collapsible=icon]/sidebar:gap-0 group-data-[collapsible=icon]/sidebar:bg-transparent group-data-[collapsible=icon]/sidebar:px-0 group-data-[collapsible=icon]/sidebar:pl-3',
          )}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md">
            <Image
              src="/assets/noc.png"
              alt=""
              width={28}
              height={28}
              className="object-contain"
              priority
            />
          </span>
          <span className="text-sidebar-accent-foreground max-w-40 min-w-0 truncate text-sm font-semibold tracking-normal transition-opacity duration-100 group-data-[collapsible=icon]/sidebar:max-w-0 group-data-[collapsible=icon]/sidebar:opacity-0 group-data-[collapsible=icon]/sidebar:delay-0 group-data-[state=expanded]/sidebar:delay-150">
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
      <SidebarFooter className="border-sidebar-border/60 border-t group-data-[collapsible=icon]/sidebar:px-0">
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
                  'group/account-menu hover:bg-sidebar-accent/55 focus-visible:ring-sidebar-ring data-[state=open]:bg-sidebar-accent/65 flex h-11 min-w-0 items-center gap-2.5 overflow-hidden rounded-md px-2 text-left transition-colors outline-none focus-visible:ring-2 lg:h-10',
                  'group-data-[collapsible=icon]/sidebar:justify-start group-data-[collapsible=icon]/sidebar:gap-0 group-data-[collapsible=icon]/sidebar:bg-transparent group-data-[collapsible=icon]/sidebar:px-0 group-data-[collapsible=icon]/sidebar:pl-3',
                )}
              >
                <UserAvatar user={userData} className="size-8 rounded-lg" />
                <span className="min-w-0 flex-1 overflow-hidden transition-opacity duration-100 group-data-[collapsible=icon]/sidebar:max-w-0 group-data-[collapsible=icon]/sidebar:opacity-0 group-data-[collapsible=icon]/sidebar:delay-0 group-data-[state=expanded]/sidebar:delay-150">
                  <span className="text-sidebar-accent-foreground block truncate text-sm font-medium">
                    {userDisplayName}
                  </span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {userAccessLabel}
                  </span>
                </span>
                <ChevronDown className="text-sidebar-foreground/60 size-4 shrink-0 transition-transform group-data-[collapsible=icon]/sidebar:hidden group-data-[state=open]/account-menu:rotate-180 motion-reduce:transition-none" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              aria-label={`Compte de ${userDisplayName}`}
              side={isCollapsed ? 'right' : 'top'}
              align={isCollapsed ? 'end' : 'start'}
              sideOffset={8}
              collisionPadding={8}
              className={cn(
                SIDEBAR_POPOVER_PANEL_CLASS,
                'border-border-strong w-[min(19rem,calc(100vw-2rem))] shadow-[var(--shadow-account-popover)]',
              )}
            >
              <div className="border-border-default bg-primary/5 relative border-b px-3.5 py-3.5">
                <span
                  aria-hidden="true"
                  className="bg-border-strong absolute inset-x-0 top-0 h-px opacity-70"
                />
                <div className="flex min-w-0 items-center gap-3">
                  <UserAvatar
                    user={userData}
                    className="ring-primary/25 size-11 rounded-lg ring-2"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="text-foreground block truncate text-sm leading-5 font-semibold">
                      {userDisplayName}
                    </span>
                    <span className="text-muted-foreground block truncate text-xs leading-5">
                      @{userData.loginName} · {userAccessLabel}
                    </span>
                  </span>
                </div>
              </div>

              <div className={SIDEBAR_POPOVER_SCROLL_CLASS}>
                <DropdownMenuLabel
                  className={SIDEBAR_POPOVER_SECTION_LABEL_CLASS}
                >
                  Compte
                </DropdownMenuLabel>
                <DropdownMenuGroup
                  aria-label="Accès au compte"
                  className={cn(
                    SIDEBAR_POPOVER_SECTION_CLASS,
                    'bg-surface-panel-raised/55 ring-border-subtle rounded-lg p-1 ring-1',
                  )}
                >
                  <DropdownMenuItem
                    asChild
                    className={cn(
                      SIDEBAR_POPOVER_ACTION_BASE_CLASS,
                      'min-h-12',
                      isAccountActive
                        ? 'bg-primary/10 text-foreground focus:bg-primary/15'
                        : SIDEBAR_POPOVER_ACTION_CLASS,
                    )}
                  >
                    <Link
                      aria-current={accountAriaCurrent}
                      href="/mon-compte"
                      onClick={() => setOpenMobile(false)}
                      className="min-w-0"
                    >
                      <span
                        className={cn(
                          SIDEBAR_POPOVER_ICON_BASE_CLASS,
                          SIDEBAR_POPOVER_ICON_ACTION_CLASS,
                        )}
                      >
                        <User
                          aria-hidden="true"
                          className="size-4 text-current"
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">Mon compte</span>
                        <span className="text-muted-foreground block truncate text-[11px] leading-4 font-normal">
                          Profil, sécurité et activité
                        </span>
                      </span>
                      <ChevronRight
                        aria-hidden="true"
                        className={SIDEBAR_POPOVER_CHEVRON_CLASS}
                      />
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </div>

              <div className="border-border-default bg-surface-page/65 border-t p-2">
                <DropdownMenuItem
                  onSelect={() => {
                    setOpenMobile(false);
                    if (requestGuardedNavigation('/login', logout)) {
                      void logout();
                    }
                  }}
                  className={cn(
                    SIDEBAR_POPOVER_ACTION_BASE_CLASS,
                    SIDEBAR_POPOVER_DANGER_ACTION_CLASS,
                  )}
                >
                  <span
                    className={cn(
                      SIDEBAR_POPOVER_ICON_BASE_CLASS,
                      SIDEBAR_POPOVER_ICON_DANGER_CLASS,
                    )}
                  >
                    <LogOut
                      aria-hidden="true"
                      className="size-4 text-current"
                    />
                  </span>
                  <span className="min-w-0 flex-1 truncate">Déconnexion</span>
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
