'use client';

import { Check, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import React, { type FC } from 'react';

import type { NavigationSpace } from '$constants/app.constants';
import { getNavigationIcon } from '$constants/navigation-icon.constants';
import { getNavigationSpaceToneClasses } from '$constants/navigation-theme.constants';
import { Button } from '$ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '$ui/dropdown-menu';
import { useSidebar } from '$ui/sidebar';
import { cn } from '$utils/css.utils';

type PoleNavigationProps = {
  activeSpace: NavigationSpace;
  onNavigate: (href: string) => void;
  spaces: NavigationSpace[];
};

const RUBRIQUES_PANEL_CLASS =
  'border-border-default bg-surface-panel text-popover-foreground max-h-[var(--radix-dropdown-menu-content-available-height)] w-[min(15rem,calc(100vw-2rem))] space-y-1 overflow-y-auto overscroll-contain rounded-sm border p-1.5 shadow-[var(--shadow-panel-strong)]';
const RUBRIQUES_ITEM_CLASS =
  'text-foreground flex min-h-10 w-full min-w-0 cursor-pointer items-center gap-2.5 rounded-sm px-2.5 py-1 text-sm font-medium outline-none';

export const PoleNavigation: FC<PoleNavigationProps> = ({
  activeSpace,
  onNavigate,
  spaces,
}) => {
  const { isMobile, setOpen, state } = useSidebar();
  const isCollapsed = !isMobile && state === 'collapsed';
  const activeTone = getNavigationSpaceToneClasses(activeSpace.tone);
  const ActiveIcon = getNavigationIcon(activeSpace.icon);

  return (
    <nav
      aria-label="Rubriques"
      data-sidebar="space-switcher"
      className="border-border-content w-full shrink-0 border-b px-2 py-2 group-data-[collapsible=icon]/sidebar:border-b-0 group-data-[collapsible=icon]/sidebar:px-1"
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={`Rubriques : ${activeSpace.label}`}
            className={cn(
              'group/rubriques text-foreground hover:bg-surface-navigation-hover data-[state=open]:bg-surface-navigation-active focus-visible:ring-sidebar-ring flex h-10 w-full min-w-0 items-center justify-start gap-2.5 rounded-sm border border-transparent bg-transparent px-2.5 text-left text-sm font-medium shadow-none transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset lg:h-9',
              'group-data-[collapsible=icon]/sidebar:h-10 group-data-[collapsible=icon]/sidebar:w-10 group-data-[collapsible=icon]/sidebar:justify-center group-data-[collapsible=icon]/sidebar:gap-0 group-data-[collapsible=icon]/sidebar:self-center group-data-[collapsible=icon]/sidebar:px-0',
            )}
            type="button"
            variant="ghost"
          >
            <ActiveIcon
              aria-hidden="true"
              className={cn('size-4 shrink-0', activeTone.iconForeground)}
            />
            <span className="min-w-0 flex-1 truncate group-data-[collapsible=icon]/sidebar:hidden">
              {activeSpace.label}
            </span>
            <ChevronDown
              aria-hidden="true"
              className="text-muted-foreground size-4 shrink-0 transition-transform group-data-[collapsible=icon]/sidebar:hidden group-data-[state=open]/rubriques:rotate-180 motion-reduce:transition-none"
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className={RUBRIQUES_PANEL_CLASS}
          collisionPadding={8}
          side={isCollapsed ? 'right' : 'bottom'}
          sideOffset={6}
        >
          {spaces.map((space) => {
            const Icon = getNavigationIcon(space.icon);
            const isActive = space.id === activeSpace.id;
            const tone = getNavigationSpaceToneClasses(space.tone);

            return (
              <DropdownMenuItem
                asChild
                className="data-[highlighted]:bg-surface-navigation-hover focus:bg-surface-navigation-hover p-0"
                key={space.id}
              >
                <Link
                  aria-current={isActive ? 'location' : undefined}
                  aria-label={space.label}
                  className={cn(
                    RUBRIQUES_ITEM_CLASS,
                    isActive && 'bg-surface-navigation-active',
                  )}
                  href={space.href}
                  onClick={(event) => {
                    if (
                      event.button !== 0 ||
                      event.metaKey ||
                      event.ctrlKey ||
                      event.shiftKey ||
                      event.altKey
                    )
                      return;
                    if (isCollapsed) {
                      setOpen(true);
                      // Reopening the current space must preserve its current
                      // detail page and filters instead of returning to its root.
                      if (isActive) event.preventDefault();
                    }
                    if (!event.defaultPrevented) onNavigate(space.href);
                  }}
                >
                  <Icon
                    aria-hidden="true"
                    className={cn('size-4 shrink-0', tone.iconForeground)}
                  />
                  <span className="min-w-0 flex-1 truncate">{space.label}</span>
                  {isActive && (
                    <Check
                      aria-hidden="true"
                      className="size-4 shrink-0 text-current"
                    />
                  )}
                </Link>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
};
