'use client';

import { Check, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import React, { type FC, useEffect, useState } from 'react';

import type { NavigationSpace } from '$constants/app.constants';
import { getNavigationIcon } from '$constants/navigation-icon.constants';
import { getNavigationSpaceToneClasses } from '$constants/navigation-theme.constants';
import { Button } from '$ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '$ui/collapsible';
import { useSidebar } from '$ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '$ui/tooltip';
import { cn } from '$utils/css.utils';

type PoleNavigationProps = {
  activeSpace: NavigationSpace;
  spaces: NavigationSpace[];
  userId: string;
};

export const PoleNavigation: FC<PoleNavigationProps> = ({
  activeSpace,
  spaces,
  userId,
}) => {
  const { isMobile, setOpen, setOpenMobile, state } = useSidebar();
  const isCollapsed = !isMobile && state === 'collapsed';
  const storageKey = `team-control:sidebar:poles-open:${userId}`;
  const [preference, setPreference] = useState<boolean | null>(null);
  const expanded = preference ?? !isMobile;
  const hasAlternatives = spaces.length > 1;
  const isOpen = hasAlternatives && !isCollapsed && expanded;
  const ActiveIcon = getNavigationIcon(activeSpace.icon);
  const activeTone = getNavigationSpaceToneClasses(activeSpace.tone);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      setPreference(
        stored === 'true' ? true : stored === 'false' ? false : null,
      );
    } catch {
      // Keep navigation usable when browser storage is unavailable.
    }

    const syncPreference = (event: StorageEvent): void => {
      if (event.key !== storageKey && event.key !== null) return;
      setPreference(
        event.newValue === 'true'
          ? true
          : event.newValue === 'false'
            ? false
            : null,
      );
    };
    window.addEventListener('storage', syncPreference);

    return (): void => window.removeEventListener('storage', syncPreference);
  }, [storageKey]);

  const changeOpen = (nextOpen: boolean): void => {
    const nextPreference = isCollapsed || nextOpen;
    if (isCollapsed) setOpen(true);
    setPreference(nextPreference);
    try {
      window.localStorage.setItem(storageKey, String(nextPreference));
    } catch {
      // The current session still remembers the user's choice.
    }
  };

  const currentPole = (
    <>
      <span
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-lg border',
          activeTone.icon,
        )}
      >
        <ActiveIcon aria-hidden="true" className="size-4" />
      </span>
      <span className="min-w-0 flex-1 truncate text-left text-sm font-semibold group-data-[collapsible=icon]/sidebar:hidden">
        {activeSpace.label}
      </span>
    </>
  );

  if (!hasAlternatives) {
    return (
      <div
        aria-label={`Pôle actuel : ${activeSpace.label}`}
        title={activeSpace.label}
        className="flex h-11 min-w-0 items-center gap-2 rounded-lg px-2 group-data-[collapsible=icon]/sidebar:px-3"
      >
        {currentPole}
      </div>
    );
  }

  const actionLabel = isCollapsed
    ? `Afficher les pôles et déployer la navigation. Pôle actuel : ${activeSpace.label}`
    : isOpen
      ? 'Réduire la liste des pôles'
      : `Afficher les pôles. Pôle actuel : ${activeSpace.label}`;

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={changeOpen}
      className="group/poles min-w-0"
    >
      {!isOpen && (
        <div
          aria-label={`Pôle actuel : ${activeSpace.label}`}
          title={activeSpace.label}
          className="flex h-11 min-w-0 items-center gap-2 rounded-lg px-2 group-data-[collapsible=icon]/sidebar:px-3"
        >
          {currentPole}
        </div>
      )}
      <CollapsibleContent>
        <nav
          aria-label="Pôles disponibles"
          className="max-h-[min(40svh,20rem)] overflow-y-auto overscroll-contain pt-1"
        >
          <ul className="space-y-0.5">
            {spaces.map((space) => {
              const Icon = getNavigationIcon(space.icon);
              const isActive = space.id === activeSpace.id;
              const tone = getNavigationSpaceToneClasses(space.tone);

              return (
                <li key={space.id}>
                  <Button
                    asChild
                    variant="navigation"
                    size="inline"
                    className="min-h-11 w-full gap-2.5 px-2 py-1.5 text-sm has-[>svg]:px-2 lg:min-h-9"
                  >
                    <Link
                      href={space.href}
                      aria-current={isActive ? 'location' : undefined}
                      title={space.summary}
                      onClick={() => setOpenMobile(false)}
                    >
                      <span
                        className={cn(
                          'flex size-6 shrink-0 items-center justify-center rounded-md',
                          tone.icon,
                        )}
                      >
                        <Icon aria-hidden="true" className="size-4" />
                      </span>
                      <span
                        className={cn(
                          'min-w-0 flex-1 truncate',
                          isActive && 'font-semibold',
                        )}
                      >
                        {space.label}
                      </span>
                      {isActive && (
                        <Check
                          aria-hidden="true"
                          className="size-3.5 shrink-0"
                        />
                      )}
                    </Link>
                  </Button>
                </li>
              );
            })}
          </ul>
        </nav>
      </CollapsibleContent>
      <Tooltip>
        <TooltipTrigger asChild>
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="outline"
              aria-label={actionLabel}
              className="border-sidebar-border bg-sidebar text-muted-foreground hover:bg-surface-navigation-hover hover:text-foreground absolute -bottom-4 left-1/2 z-10 h-8 w-11 -translate-x-1/2 rounded-full p-0 has-[>svg]:px-0 lg:-bottom-3 lg:h-6 lg:w-9"
            >
              <ChevronDown
                aria-hidden="true"
                className="size-3.5 transition-transform group-data-[state=open]/poles:rotate-180 motion-reduce:transition-none"
              />
            </Button>
          </CollapsibleTrigger>
        </TooltipTrigger>
        <TooltipContent side={isCollapsed ? 'right' : 'bottom'}>
          {actionLabel}
        </TooltipContent>
      </Tooltip>
    </Collapsible>
  );
};
