'use client';

import Link from 'next/link';
import React, { type MouseEvent } from 'react';

import { cn } from '$utils/css.utils';

import {
  USER_DETAIL_SECTIONS,
  type UserDetailSection,
  type UserDetailSectionId,
} from './UserDetailNavigation';

type UserDetailSectionRailLayout = 'desktop' | 'mobile';

type UserDetailSectionRailProps<
  SectionId extends string = UserDetailSectionId,
> = {
  activeSection: SectionId;
  ariaLabel?: string;
  className?: string;
  dirtySections: readonly SectionId[];
  getSectionHref: (sectionId: SectionId) => string;
  heading?: string;
  layout?: UserDetailSectionRailLayout;
  onSectionChange: (sectionId: SectionId) => void;
  sections?: readonly UserDetailSection<SectionId>[];
};

const shouldLetBrowserHandleClick = (
  event: MouseEvent<HTMLAnchorElement>,
): boolean => {
  return (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.altKey ||
    event.ctrlKey ||
    event.shiftKey
  );
};

export const UserDetailSectionRail = <
  SectionId extends string = UserDetailSectionId,
>({
  activeSection,
  ariaLabel = 'Navigation de la fiche utilisateur',
  className,
  dirtySections,
  getSectionHref,
  heading = 'Fiche',
  layout = 'desktop',
  onSectionChange,
  sections,
}: UserDetailSectionRailProps<SectionId>): React.JSX.Element => {
  const visibleSections =
    sections ??
    (USER_DETAIL_SECTIONS as unknown as readonly UserDetailSection<SectionId>[]);
  const renderSectionLink = (
    section: UserDetailSection<SectionId>,
    display: UserDetailSectionRailLayout,
  ): React.JSX.Element => {
    const isActive = activeSection === section.id;
    const hasChanges = dirtySections.includes(section.id);
    const isDesktop = display === 'desktop';

    return (
      <Link
        key={section.id}
        href={getSectionHref(section.id)}
        aria-current={isActive ? 'page' : undefined}
        title={isDesktop ? section.label : undefined}
        onClick={(event) => {
          if (shouldLetBrowserHandleClick(event)) return;

          event.preventDefault();
          onSectionChange(section.id);
        }}
        className={cn(
          'group focus-visible:border-ring focus-visible:ring-ring/50 relative flex min-w-0 items-center rounded-md border border-transparent font-medium transition-colors outline-none focus-visible:ring-[3px]',
          isDesktop
            ? 'h-10 gap-2 px-2 text-sm'
            : 'h-9 min-w-[4.75rem] flex-1 justify-center gap-1.5 px-2 text-xs',
          isActive
            ? 'border-sidebar-ring/35 bg-sidebar-ring/15 text-foreground shadow-none'
            : 'text-muted-foreground hover:bg-surface-muted/85 hover:text-foreground',
        )}
      >
        <span
          className={cn(
            'flex shrink-0 items-center justify-center rounded-md transition-colors',
            isDesktop ? 'size-7' : 'size-5',
            isActive
              ? 'bg-sidebar-ring/20 text-sidebar-ring'
              : 'bg-surface-muted text-muted-foreground group-hover:text-foreground',
          )}
        >
          {section.icon}
        </span>
        <span
          className={cn(
            isDesktop ? 'min-w-0 truncate' : 'max-w-[4.25rem] truncate',
          )}
        >
          {section.label}
        </span>
        {hasChanges && (
          <>
            <span
              aria-hidden="true"
              className={cn(
                'bg-warning ring-surface shrink-0 rounded-full ring-2',
                isDesktop
                  ? 'ml-auto size-2'
                  : 'absolute top-1 right-1 size-1.5',
              )}
            />
            <span className="sr-only">Modifications non enregistrées</span>
          </>
        )}
      </Link>
    );
  };

  if (layout === 'mobile') {
    return (
      <nav
        aria-label={ariaLabel}
        className="sticky top-2 z-20 -mx-1 2xl:hidden"
      >
        <div className="overflow-x-auto px-1 pb-1">
          <div className="border-sidebar-border/70 bg-surface/95 inline-flex min-w-full gap-1 rounded-lg border p-1 shadow-[var(--shadow-panel)] backdrop-blur">
            {visibleSections.map((section) =>
              renderSectionLink(section, 'mobile'),
            )}
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav aria-label={ariaLabel} className={cn('hidden 2xl:block', className)}>
      <div className="border-sidebar-border/70 bg-surface/90 sticky top-4 rounded-lg border p-1 shadow-[var(--shadow-panel)] backdrop-blur">
        <div className="text-muted-foreground px-2 py-2 text-xs font-medium">
          {heading}
        </div>
        <div className="space-y-1">
          {visibleSections.map((section) =>
            renderSectionLink(section, 'desktop'),
          )}
        </div>
      </div>
    </nav>
  );
};
