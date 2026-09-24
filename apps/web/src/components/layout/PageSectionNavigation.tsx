'use client';

import Link from 'next/link';
import React, {
  type MouseEvent,
  type ReactNode,
  useEffect,
  useRef,
} from 'react';

import { cn } from '$utils/css.utils';

export type PageSection<SectionId extends string = string> = {
  icon?: ReactNode;
  id: SectionId;
  label: string;
};

type PageSectionNavigationProps<SectionId extends string> = {
  activeSection: SectionId;
  ariaLabel: string;
  className?: string;
  dirtySections?: readonly SectionId[];
  getSectionHref: (sectionId: SectionId) => string;
  onSectionChange?: (sectionId: SectionId) => void;
  replace?: boolean;
  sections: readonly PageSection<SectionId>[];
};

const shouldLetBrowserHandleClick = (
  event: MouseEvent<HTMLAnchorElement>,
): boolean =>
  event.defaultPrevented ||
  event.button !== 0 ||
  event.metaKey ||
  event.altKey ||
  event.ctrlKey ||
  event.shiftKey;

/** URL navigation, rather than ARIA tabs: each section remains a real link. */
export const PageSectionNavigation = <SectionId extends string>({
  activeSection,
  ariaLabel,
  className,
  dirtySections = [],
  getSectionHref,
  onSectionChange,
  replace = false,
  sections,
}: PageSectionNavigationProps<SectionId>): React.JSX.Element | null => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const activeLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    const activeLink = activeLinkRef.current;
    if (!viewport || !activeLink) return;

    // Scroll only the horizontal navigation, never the page or its focused field.
    const revealActiveSection = (): void => {
      const viewportBounds = viewport.getBoundingClientRect();
      const linkBounds = activeLink.getBoundingClientRect();
      if (linkBounds.left < viewportBounds.left) {
        viewport.scrollLeft += linkBounds.left - viewportBounds.left;
      } else if (linkBounds.right > viewportBounds.right) {
        viewport.scrollLeft += linkBounds.right - viewportBounds.right;
      }
    };
    revealActiveSection();
    const observer = new ResizeObserver(revealActiveSection);
    observer.observe(viewport);
    observer.observe(activeLink);

    return (): void => observer.disconnect();
  }, [activeSection, sections]);

  if (sections.length === 0) return null;

  return (
    <nav
      aria-label={ariaLabel}
      className={cn(
        'border-border-divider bg-surface-canvas sticky top-0 z-20 min-w-0 border-b',
        className,
      )}
      data-slot="page-section-navigation"
    >
      <div ref={viewportRef} className="overflow-x-auto">
        <div className="flex w-max min-w-full gap-1">
          {sections.map((section) => {
            const isActive = activeSection === section.id;

            return (
              <Link
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'focus-visible:ring-ring relative inline-flex min-h-12 shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset',
                  isActive
                    ? 'border-primary text-foreground'
                    : 'text-muted-foreground hover:bg-surface-navigation-hover hover:text-foreground border-transparent',
                )}
                href={getSectionHref(section.id)}
                key={section.id}
                onClick={(event) => {
                  if (!onSectionChange || shouldLetBrowserHandleClick(event))
                    return;
                  event.preventDefault();
                  onSectionChange(section.id);
                }}
                ref={isActive ? activeLinkRef : undefined}
                replace={replace}
              >
                {section.icon && (
                  <span aria-hidden="true" className="shrink-0 [&_svg]:size-4">
                    {section.icon}
                  </span>
                )}
                {section.label}
                {dirtySections.includes(section.id) && (
                  <>
                    <span
                      aria-hidden="true"
                      className="bg-warning size-2 shrink-0 rounded-full"
                    />
                    <span className="sr-only">
                      Modifications non enregistrées
                    </span>
                  </>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
