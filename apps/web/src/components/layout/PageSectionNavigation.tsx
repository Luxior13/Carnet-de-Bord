'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import React, {
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';

import { Button } from '$ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '$ui/tooltip';
import { cn } from '$utils/css.utils';

import {
  getSectionScrollContainer,
  useSectionNavigation,
} from './useSectionNavigation';

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
  /** Apply an accepted navigation; the shared component owns the draft guard. */
  onSectionChange?: (sectionId: SectionId, href: string) => void;
  replace?: boolean;
  sections: readonly PageSection<SectionId>[];
};

const revealLink = (
  viewport: HTMLDivElement,
  link: HTMLAnchorElement,
): void => {
  const viewportBounds = viewport.getBoundingClientRect();
  const linkBounds = link.getBoundingClientRect();
  if (
    linkBounds.left < viewportBounds.left ||
    linkBounds.width > viewportBounds.width
  ) {
    viewport.scrollLeft += linkBounds.left - viewportBounds.left;
  } else if (linkBounds.right > viewportBounds.right) {
    viewport.scrollLeft += linkBounds.right - viewportBounds.right;
  }
};

/** Each section remains a real URL, with native link and keyboard behavior. */
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
  const navigationRef = useRef<HTMLElement>(null);
  const stickyMarkerRef = useRef<HTMLSpanElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const activeLinkRef = useRef<HTMLAnchorElement>(null);
  const contentStartRef = useRef<HTMLSpanElement>(null);
  const navigateToSection = useSectionNavigation({
    activeLinkRef,
    activeSection,
    contentStartRef,
    getSectionHref,
    navigationRef,
    onSectionChange,
    replace,
  });
  const viewportId = useId();
  const hasSections = sections.length > 0;
  const [isStuck, setIsStuck] = useState(false);
  const [scrollState, setScrollState] = useState({
    canScrollLeft: false,
    canScrollRight: false,
    hasOverflow: false,
  });

  useEffect(() => {
    const navigation = navigationRef.current;
    const marker = stickyMarkerRef.current;
    if (!navigation || !marker || !('IntersectionObserver' in window)) {
      setIsStuck(false);

      return;
    }

    // Sticky follows the nearest scrolling ancestor, which is the private
    // shell's main element today. Standalone pages can use the viewport.
    const root = getSectionScrollContainer(navigation);

    const observer = new IntersectionObserver(
      (entries) => {
        const bounds = entries[0]?.rootBounds;
        if (!bounds) return;
        setIsStuck(
          marker.getBoundingClientRect().top < bounds.top &&
            navigation.getBoundingClientRect().bottom > bounds.top,
        );
      },
      { root, threshold: [0, 1] },
    );
    observer.observe(marker);
    // A jump can move the marker from below to above the scrollport without
    // changing its visibility. The bar itself becomes visible in that case.
    observer.observe(navigation);

    return (): void => observer.disconnect();
  }, [hasSections]);

  useEffect(() => {
    const navigation = navigationRef.current;
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!navigation || !viewport || !content) return;

    const updateScrollState = (): void => {
      // Compare with the full bar, before arrows consume width. This also lets
      // them disappear when the bar becomes wide enough again.
      const next = {
        canScrollLeft: viewport.scrollLeft > 1,
        canScrollRight:
          viewport.scrollLeft + viewport.clientWidth < viewport.scrollWidth - 1,
        hasOverflow: content.scrollWidth > navigation.clientWidth + 1,
      };
      // If resizing removes the controls, keep keyboard focus in the navigation.
      if (
        !next.hasOverflow &&
        document.activeElement instanceof HTMLButtonElement &&
        navigation.contains(document.activeElement)
      ) {
        activeLinkRef.current?.focus({ preventScroll: true });
      }
      setScrollState((current) =>
        current.hasOverflow === next.hasOverflow &&
        current.canScrollLeft === next.canScrollLeft &&
        current.canScrollRight === next.canScrollRight
          ? current
          : next,
      );
    };
    const handleResize = (): void => {
      // Preserve a focused link on resize, otherwise reveal the current section.
      // Only scroll the bar; manual scrolling must not be undone on scroll events.
      const focused = document.activeElement;
      const link =
        focused instanceof HTMLAnchorElement && content.contains(focused)
          ? focused
          : activeLinkRef.current;
      if (link) revealLink(viewport, link);
      updateScrollState();
    };
    handleResize();
    const observer = new ResizeObserver(handleResize);
    observer.observe(navigation);
    observer.observe(viewport);
    observer.observe(content);
    viewport.addEventListener('scroll', updateScrollState, { passive: true });

    return (): void => {
      observer.disconnect();
      viewport.removeEventListener('scroll', updateScrollState);
    };
  }, [activeSection, sections]);

  const scrollSections = (direction: -1 | 1): void => {
    const canScroll =
      direction === -1 ? scrollState.canScrollLeft : scrollState.canScrollRight;
    const viewport = viewportRef.current;
    if (!viewport || !canScroll) return;
    viewport.scrollBy({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
      left: direction * Math.max(80, viewport.clientWidth * 0.8),
    });
  };

  if (sections.length === 0) return null;

  return (
    <>
      <nav
        aria-label={ariaLabel}
        className={cn(
          'border-border-divider bg-surface-canvas sticky top-0 z-20 flex min-w-0 items-start gap-1 border-b transition-shadow motion-reduce:transition-none',
          isStuck && '[box-shadow:var(--shadow-navigation-stuck)]',
          className,
        )}
        data-slot="page-section-navigation"
        data-stuck={isStuck}
        ref={navigationRef}
      >
        {/* Outside the top edge, without changing the layout or the hit area. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-px left-0 h-px w-px"
          ref={stickyMarkerRef}
        />
        {scrollState.hasOverflow && (
          <Button
            aria-controls={viewportId}
            aria-disabled={!scrollState.canScrollLeft}
            aria-label="Afficher les sections précédentes"
            className="rounded-compact h-12 w-10 focus-visible:ring-inset aria-disabled:opacity-35 lg:h-12 lg:w-10"
            onClick={() => scrollSections(-1)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
        )}
        <div
          ref={viewportRef}
          id={viewportId}
          className="min-w-0 flex-1 overflow-x-auto"
        >
          <div ref={contentRef} className="flex w-max min-w-full gap-1">
            {sections.map((section) => {
              const isActive = activeSection === section.id;
              const isDirty = dirtySections.includes(section.id);

              return (
                <Tooltip key={section.id} delayDuration={350}>
                  <TooltipTrigger asChild>
                    <Link
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        'focus-visible:ring-ring rounded-t-compact relative inline-flex min-h-12 shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset',
                        isActive
                          ? 'border-primary bg-surface-navigation-active text-foreground'
                          : 'text-muted-foreground hover:bg-surface-navigation-hover hover:text-foreground border-transparent',
                      )}
                      href={getSectionHref(section.id)}
                      data-navigation-guard="explicit"
                      onClick={(event) => navigateToSection(event, section.id)}
                      onFocus={(event) => {
                        if (viewportRef.current)
                          revealLink(viewportRef.current, event.currentTarget);
                      }}
                      ref={isActive ? activeLinkRef : undefined}
                      replace={replace}
                    >
                      {section.icon && (
                        <span
                          aria-hidden="true"
                          className={cn(
                            'shrink-0 [&_svg]:size-4',
                            isActive && 'text-primary-emphasis',
                          )}
                        >
                          {section.icon}
                        </span>
                      )}
                      {section.label}
                      {isDirty && (
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
                  </TooltipTrigger>
                  {isDirty && (
                    <TooltipContent side="bottom">
                      Modifications non enregistrées
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })}
          </div>
        </div>
        {scrollState.hasOverflow && (
          <Button
            aria-controls={viewportId}
            aria-disabled={!scrollState.canScrollRight}
            aria-label="Afficher les sections suivantes"
            className="rounded-compact h-12 w-10 focus-visible:ring-inset aria-disabled:opacity-35 lg:h-12 lg:w-10"
            onClick={() => scrollSections(1)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        )}
      </nav>
      {/* Static position after the sticky bar, with no extra space in the flow. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute block size-px"
        ref={contentStartRef}
      />
    </>
  );
};
