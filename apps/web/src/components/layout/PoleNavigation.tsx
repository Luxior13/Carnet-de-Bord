'use client';

import Link from 'next/link';
import React, { type FC, useEffect, useRef } from 'react';

import type { NavigationSpace } from '$constants/app.constants';
import { getNavigationIcon } from '$constants/navigation-icon.constants';
import { getNavigationSpaceToneClasses } from '$constants/navigation-theme.constants';
import { useSidebar } from '$ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '$ui/tooltip';
import { cn } from '$utils/css.utils';

type PoleNavigationProps = {
  activeSpace: NavigationSpace;
  onNavigate: (href: string) => void;
  spaces: NavigationSpace[];
};

export const PoleNavigation: FC<PoleNavigationProps> = ({
  activeSpace,
  onNavigate,
  spaces,
}) => {
  const { isMobile, setOpen, state } = useSidebar();
  const isCollapsed = !isMobile && state === 'collapsed';
  const viewportRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    // Reveal the current space inside the switcher without scrolling the page
    // or its destinations below, including on short viewports.
    const revealActiveSpace = (): void => {
      const activeLink = viewport.querySelector<HTMLElement>(
        '[aria-current="location"]',
      );
      if (!activeLink) return;
      const viewportRect = viewport.getBoundingClientRect();
      const linkRect = activeLink.getBoundingClientRect();
      if (linkRect.top < viewportRect.top) {
        viewport.scrollTop -= viewportRect.top - linkRect.top;
      } else if (linkRect.bottom > viewportRect.bottom) {
        viewport.scrollTop += linkRect.bottom - viewportRect.bottom;
      }
    };

    revealActiveSpace();
    const observer = new ResizeObserver(revealActiveSpace);
    observer.observe(viewport);

    return (): void => observer.disconnect();
  }, [activeSpace.id, isCollapsed, isMobile, spaces.length]);

  return (
    <nav
      ref={viewportRef}
      aria-label="Rubriques"
      data-sidebar="space-switcher"
      className="sidebar-scrollbar border-border-divider max-h-[min(35svh,8rem)] min-h-0 w-full shrink-0 overflow-x-hidden overflow-y-auto overscroll-contain border-b px-3 py-2 group-data-[collapsible=icon]/sidebar:max-h-none group-data-[collapsible=icon]/sidebar:flex-1 group-data-[collapsible=icon]/sidebar:border-b-0 group-data-[collapsible=icon]/sidebar:px-0"
    >
      <ul className="grid grid-cols-4 justify-items-center gap-2 group-data-[collapsible=icon]/sidebar:grid-cols-1">
        {spaces.map((space) => {
          const Icon = getNavigationIcon(space.icon);
          const isActive = space.id === activeSpace.id;
          const tone = getNavigationSpaceToneClasses(space.tone);

          return (
            <li key={space.id}>
              <Tooltip delayDuration={250}>
                <TooltipTrigger asChild>
                  <Link
                    href={space.href}
                    aria-label={space.label}
                    aria-current={isActive ? 'location' : undefined}
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
                    className={cn(
                      'focus-visible:ring-sidebar-ring relative flex size-11 items-center justify-center rounded-sm border border-transparent outline-none focus-visible:ring-2 focus-visible:ring-inset',
                      tone.iconForeground,
                      isActive
                        ? 'bg-surface-navigation-active'
                        : 'hover:bg-surface-navigation-hover',
                    )}
                  >
                    {isActive && (
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-current"
                      />
                    )}
                    <Icon aria-hidden="true" className="size-5 shrink-0" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent
                  side={isCollapsed ? 'right' : 'bottom'}
                  sideOffset={10}
                  className="rounded-sm"
                >
                  {space.label}
                </TooltipContent>
              </Tooltip>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
