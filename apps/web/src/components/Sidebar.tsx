'use client';

import {
  ChevronRight,
  ChevronsUpDown,
  Compass,
  FileText,
  LayoutDashboard,
  LogOut,
  type LucideIcon,
  Settings,
  User,
  Users,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, {
  type FC,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { UserAvatar } from '$components/users/UserAvatar';
import {
  getAccessLabel,
  getDesktopSidebarSections,
  type NavItem,
  SITE_CONFIG,
} from '$constants/app.constants';
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
  LayoutDashboard,
  Settings,
  Users,
};

type SidebarProps = {
  className?: string;
  contextualContent?: ReactNode;
};

type SidebarPanel = 'context' | 'site';

const SIDEBAR_PANEL_OPTIONS: {
  icon: LucideIcon;
  id: SidebarPanel;
  label: string;
}[] = [
  { icon: Compass, id: 'site', label: 'Site' },
  { icon: FileText, id: 'context', label: 'Fiche' },
];

function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));
}

function isNavItemActive(pathname: string, item: NavItem): boolean {
  if (isActivePath(pathname, item.href)) return true;

  return (
    item.children?.some((child) => isNavItemActive(pathname, child)) ?? false
  );
}

function getActiveGroupHref(
  items: readonly NavItem[],
  pathname: string,
): string | null {
  const activeGroup = items.find(
    (item) =>
      (item.children?.length ?? 0) > 0 && isNavItemActive(pathname, item),
  );

  return activeGroup?.href ?? null;
}

const Sidebar: FC<SidebarProps> = ({ className, contextualContent }) => {
  const pathname = usePathname();
  const { logout, userData } = useUser();
  const { setOpenMobile, state: sidebarState } = useSidebar();
  const hasContextualContent = Boolean(contextualContent);

  const sections = useMemo(
    () => getDesktopSidebarSections(userData),
    [userData],
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
    () => getActiveGroupHref(navItems, pathname),
    [navItems, pathname],
  );
  const [openGroupHref, setOpenGroupHref] = useState<string | null>(
    activeGroupHref,
  );
  const [activePanel, setActivePanel] = useState<SidebarPanel>(
    hasContextualContent ? 'context' : 'site',
  );
  const userDisplayName = userData
    ? `${userData.firstName} ${userData.lastName}`
    : '';
  const userAccessLabel = userData ? getAccessLabel(userData) : '';

  useEffect(() => {
    setOpenGroupHref(activeGroupHref);
  }, [activeGroupHref]);

  useEffect(() => {
    setActivePanel(hasContextualContent ? 'context' : 'site');
  }, [hasContextualContent, pathname]);

  const renderSubNavItem = (item: NavItem): React.ReactNode => {
    const Icon = iconMap[item.icon] ?? Settings;
    const isActive = isActivePath(pathname, item.href);

    return (
      <SidebarMenuSubItem key={item.href}>
        <SidebarMenuSubButton asChild isActive={isActive}>
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
      isNavItemActive(pathname, child),
    );
    const isActive = isActivePath(pathname, item.href);

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
              className={
                hasActiveChild
                  ? 'bg-sidebar-accent/35 text-sidebar-accent-foreground [&>svg]:text-sidebar-ring'
                  : undefined
              }
            >
              <CollapsibleTrigger
                aria-label={item.label}
                title={item.label}
                type="button"
              >
                <Icon className="size-4" />
                <span>{item.label}</span>
                <ChevronRight className="ml-auto size-4 transition-transform duration-150 group-data-[collapsible=icon]/sidebar:hidden group-data-[state=open]/collapsible:rotate-90" />
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
        <SidebarMenuButton asChild isActive={isActive}>
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
    <SidebarRoot collapsible="icon" variant="floating" className={className}>
      <SidebarHeader className="border-sidebar-border/70 border-b p-3 group-data-[collapsible=icon]/sidebar:px-0">
        <Link
          href="/"
          onClick={() => setOpenMobile(false)}
          className={cn(
            'border-sidebar-border/60 bg-sidebar-accent/35 hover:bg-sidebar-accent/60 flex h-12 w-full min-w-0 items-center gap-3 overflow-hidden rounded-lg border px-2 shadow-sm transition-colors',
            'group-data-[collapsible=icon]/sidebar:justify-start group-data-[collapsible=icon]/sidebar:gap-0 group-data-[collapsible=icon]/sidebar:border-transparent group-data-[collapsible=icon]/sidebar:bg-transparent group-data-[collapsible=icon]/sidebar:px-0 group-data-[collapsible=icon]/sidebar:pl-2.5 group-data-[collapsible=icon]/sidebar:shadow-none',
          )}
        >
          <span className="bg-sidebar-primary flex size-9 shrink-0 items-center justify-center rounded-lg shadow-sm">
            <Image
              src="/assets/noc.png"
              alt=""
              width={26}
              height={26}
              className="object-contain"
              priority
            />
          </span>
          <span className="max-w-40 min-w-0 overflow-hidden transition-opacity duration-100 group-data-[collapsible=icon]/sidebar:max-w-0 group-data-[collapsible=icon]/sidebar:opacity-0 group-data-[collapsible=icon]/sidebar:delay-0 group-data-[state=expanded]/sidebar:delay-150">
            <span className="block truncate text-sm font-semibold">
              {SITE_CONFIG.name}
            </span>
            <span className="text-sidebar-foreground/65 block truncate text-xs">
              {SITE_CONFIG.subtitle}
            </span>
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {hasContextualContent && (
          <div className="bg-sidebar/95 sticky top-0 z-10 px-2 pt-2 pb-1 group-data-[collapsible=icon]/sidebar:hidden">
            <div
              className="border-sidebar-border/70 bg-sidebar-accent/35 grid grid-cols-2 gap-1 rounded-lg border p-1 shadow-sm"
              role="tablist"
              aria-label="Navigation"
            >
              {SIDEBAR_PANEL_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = activePanel === option.id;

                return (
                  <button
                    key={option.id}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => setActivePanel(option.id)}
                    className={cn(
                      'text-sidebar-foreground/70 hover:text-sidebar-foreground focus-visible:ring-sidebar-ring flex h-8 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium transition-[background-color,color,box-shadow] outline-none focus-visible:ring-2',
                      isSelected &&
                        'bg-sidebar text-sidebar-foreground border-sidebar-border ring-sidebar-border/70 shadow-sm ring-1',
                    )}
                  >
                    <Icon className="size-3.5" />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {topSections.map((section) => (
          <SidebarGroup
            key={section.id}
            className={cn(
              hasContextualContent &&
                activePanel === 'context' &&
                'hidden group-data-[collapsible=icon]/sidebar:flex',
            )}
          >
            {section.label && (
              <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>{section.items.map(renderNavItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
        {contextualContent && activePanel === 'context' && (
          <SidebarGroup className="pt-0 group-data-[collapsible=icon]/sidebar:hidden">
            {contextualContent}
          </SidebarGroup>
        )}
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
                  'border-sidebar-border/70 bg-sidebar-accent/45 hover:bg-sidebar-accent/60 focus-visible:ring-sidebar-ring data-[state=open]:bg-sidebar-accent/70 data-[state=open]:ring-sidebar-ring/40 flex min-w-0 items-center gap-3 overflow-hidden rounded-lg border p-2 text-left shadow-sm transition-[background-color,border-color,box-shadow] outline-none focus-visible:ring-2 data-[state=open]:ring-1',
                  'group-data-[collapsible=icon]/sidebar:justify-start group-data-[collapsible=icon]/sidebar:gap-0 group-data-[collapsible=icon]/sidebar:border-0 group-data-[collapsible=icon]/sidebar:bg-transparent group-data-[collapsible=icon]/sidebar:p-0 group-data-[collapsible=icon]/sidebar:pl-2.5 group-data-[collapsible=icon]/sidebar:shadow-none',
                )}
              >
                <UserAvatar user={userData} className="size-9 rounded-md" />
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
                'border-sidebar-border text-sidebar-foreground bg-card overflow-hidden rounded-lg p-0 shadow-2xl shadow-black/25',
                sidebarState === 'collapsed'
                  ? 'w-64'
                  : 'w-[var(--radix-dropdown-menu-trigger-width)]',
              )}
            >
              <DropdownMenuLabel className="border-sidebar-border/60 bg-accent/60 border-b p-3 font-normal">
                <div className="flex min-w-0 items-center gap-3">
                  <UserAvatar user={userData} className="size-10 rounded-md" />
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
                  className="focus:text-sidebar-foreground focus:bg-accent cursor-pointer rounded-md p-2.5"
                >
                  <Link
                    href="/mon-compte"
                    className="flex items-center gap-3"
                    onClick={() => setOpenMobile(false)}
                  >
                    <span className="border-sidebar-border/70 bg-card flex size-8 shrink-0 items-center justify-center rounded-md border">
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
                  className="focus:bg-destructive/15 focus:text-destructive text-destructive mx-1 h-8 cursor-pointer justify-center gap-2 rounded-md p-1.5 text-xs"
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
