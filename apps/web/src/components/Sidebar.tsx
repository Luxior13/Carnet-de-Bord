'use client';

import {
  ChevronRight,
  LayoutDashboard,
  LogOut,
  type LucideIcon,
  Settings,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { type FC, useEffect, useMemo, useState } from 'react';

import {
  getAccessLabel,
  getDesktopSidebarSections,
  type NavItem,
  SITE_CONFIG,
} from '$constants/app.constants';
import { useUser } from '$context/UserContext';
import { Button } from '$ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '$ui/collapsible';
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
};

type SidebarProps = {
  className?: string;
};

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

const Sidebar: FC<SidebarProps> = ({ className }) => {
  const pathname = usePathname();
  const { logout, userData } = useUser();
  const { setOpenMobile } = useSidebar();

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

  useEffect(() => {
    setOpenGroupHref(activeGroupHref);
  }, [activeGroupHref]);

  const renderSubNavItem = (item: NavItem): React.ReactNode => {
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
            <SidebarMenuButton asChild isActive={isActive && !hasActiveChild}>
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
      <SidebarHeader className="border-b p-3 group-data-[collapsible=icon]/sidebar:px-0">
        <Link
          href="/"
          onClick={() => setOpenMobile(false)}
          className={cn(
            'hover:bg-sidebar-accent flex h-12 w-full min-w-0 items-center gap-3 overflow-hidden rounded-lg px-2 transition-colors',
            'group-data-[collapsible=icon]/sidebar:justify-start group-data-[collapsible=icon]/sidebar:gap-0 group-data-[collapsible=icon]/sidebar:px-0 group-data-[collapsible=icon]/sidebar:pl-2.5',
          )}
        >
          <span className="bg-primary flex size-9 shrink-0 items-center justify-center rounded-lg shadow-sm">
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
      <SidebarFooter className="border-t group-data-[collapsible=icon]/sidebar:px-0">
        {bottomSections.map((section) => (
          <SidebarGroup key={section.id} className="p-0">
            <SidebarGroupContent>
              <SidebarMenu>{section.items.map(renderNavItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
        {userData && (
          <div
            className={cn(
              'bg-sidebar-accent/70 flex min-w-0 items-center gap-3 overflow-hidden rounded-lg border p-3 shadow-sm transition-colors',
              'group-data-[collapsible=icon]/sidebar:justify-start group-data-[collapsible=icon]/sidebar:gap-0 group-data-[collapsible=icon]/sidebar:border-0 group-data-[collapsible=icon]/sidebar:bg-transparent group-data-[collapsible=icon]/sidebar:p-0 group-data-[collapsible=icon]/sidebar:pl-2.5',
            )}
          >
            <div className="bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
              {userData.firstName.charAt(0)}
              {userData.lastName.charAt(0)}
            </div>
            <div className="max-w-28 min-w-0 flex-1 overflow-hidden transition-opacity duration-100 group-data-[collapsible=icon]/sidebar:max-w-0 group-data-[collapsible=icon]/sidebar:opacity-0 group-data-[collapsible=icon]/sidebar:delay-0 group-data-[state=expanded]/sidebar:delay-150">
              <p className="truncate text-sm font-medium">
                {userData.firstName} {userData.lastName}
              </p>
              <p className="text-sidebar-foreground/65 truncate text-xs">
                {getAccessLabel(userData)}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={logout}
              className="group-data-[collapsible=icon]/sidebar:hidden"
              aria-label="Deconnexion"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        )}
      </SidebarFooter>
      <SidebarRail />
    </SidebarRoot>
  );
};

export default Sidebar;
