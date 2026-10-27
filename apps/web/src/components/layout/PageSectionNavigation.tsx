'use client';

import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import React, {
  type ReactNode,
  type RefObject,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';

import { Button } from '$ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '$ui/tooltip';
import { cn } from '$utils/css.utils';

import { SectionOverflowMenu } from './SectionOverflowMenu';
import {
  getSectionScrollContainer,
  useSectionNavigation,
} from './useSectionNavigation';
import { useTabsOverflow } from './useTabsOverflow';

export type PageSection<SectionId extends string = string> = {
  /** Number of items in the section, shown after its label (27 October 2026). */
  count?: number;
  icon?: ReactNode;
  id: SectionId;
  label: string;
};

export type PageSectionNavigationProps<SectionId extends string> = {
  activeSection: SectionId;
  ariaLabel: string;
  className?: string;
  /** Shared content start when two bars serve the same page (EntityHeader). */
  contentStartRef?: RefObject<HTMLSpanElement | null>;
  dirtySections?: readonly SectionId[];
  getSectionHref: (sectionId: SectionId) => string;
  /** Apply an accepted navigation; the shared component owns the draft guard. */
  onSectionChange?: (sectionId: SectionId, href: string) => void;
  replace?: boolean;
  sections: readonly PageSection<SectionId>[];
  /** Element whose bottom edge is the stuck boundary (condensed bar). */
  stickyBoundaryRef?: RefObject<HTMLElement | null>;
  /**
   * `bar`: standalone sticky bar. `embedded`: tabs along the bottom of the
   * identity header. `condensed`: tabs of the header kept at the top while
   * scrolling. The last two underline the active section only (owner
   * decision of 27 October 2026).
   */
  variant?: 'bar' | 'condensed' | 'embedded';
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

/**
 * Item count of a section tab, visual only: the tab keeps its plain name, and
 * the section itself announces its counts.
 */
export const SectionCount = ({
  count,
}: {
  count: number;
}): React.JSX.Element => (
  <span
    aria-hidden="true"
    className="bg-surface-control-hover text-muted-foreground rounded-full px-1.5 text-xs leading-5 font-medium tabular-nums"
  >
    {count}
  </span>
);

/** Each section remains a real URL, with native link and keyboard behavior. */
export const PageSectionNavigation = <SectionId extends string>({
  activeSection,
  ariaLabel,
  className,
  contentStartRef: sharedContentStartRef,
  dirtySections = [],
  getSectionHref,
  onSectionChange,
  replace = false,
  sections,
  stickyBoundaryRef,
  variant = 'bar',
}: PageSectionNavigationProps<SectionId>): React.JSX.Element | null => {
  const navigationRef = useRef<HTMLElement>(null);
  const stickyMarkerRef = useRef<HTMLSpanElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const activeLinkRef = useRef<HTMLAnchorElement>(null);
  const ownContentStartRef = useRef<HTMLSpanElement>(null);
  const contentStartRef = sharedContentStartRef ?? ownContentStartRef;
  const isBar = variant === 'bar';
  const navigateToSection = useSectionNavigation({
    activeLinkRef,
    activeSection,
    contentStartRef,
    getSectionHref,
    navigationRef,
    onSectionChange,
    replace,
    stickyBoundaryRef,
  });
  const tabsLayout = useTabsOverflow({
    activeSection,
    enabled: !isBar,
    measureRef,
    navigationRef,
    sectionIds: sections.map((section) => section.id),
    sectionKey: JSON.stringify([
      sections.map((section) => [section.id, section.label, !!section.icon]),
      dirtySections,
    ]),
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
    if (
      !isBar ||
      !navigation ||
      !marker ||
      !('IntersectionObserver' in window)
    ) {
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
  }, [hasSections, isBar]);

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

  const tabClassName = (isActive: boolean): string =>
    cn(
      'focus-visible:ring-ring rounded-t-compact relative inline-flex shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset',
      variant === 'embedded' ? 'min-h-11 py-2.5' : 'min-h-12 py-3',
      isBar
        ? isActive
          ? 'border-primary bg-surface-navigation-active text-foreground'
          : 'text-muted-foreground hover:bg-surface-navigation-hover hover:text-foreground border-transparent'
        : isActive
          ? 'border-primary text-foreground'
          : 'text-muted-foreground hover:text-foreground border-transparent',
    );

  const renderLink = (section: PageSection<SectionId>): React.JSX.Element => {
    const isActive = activeSection === section.id;
    const isDirty = dirtySections.includes(section.id);

    return (
      <Tooltip key={section.id} delayDuration={350}>
        <TooltipTrigger asChild>
          <Link
            aria-current={isActive ? 'page' : undefined}
            className={tabClassName(isActive)}
            href={getSectionHref(section.id)}
            data-navigation-guard="explicit"
            onClick={(event) => navigateToSection(event, section.id)}
            onFocus={(event) => {
              if (isBar && viewportRef.current)
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
            {section.count !== undefined && (
              <SectionCount count={section.count} />
            )}
            {isDirty && (
              <>
                <span
                  aria-hidden="true"
                  className="bg-warning size-2 shrink-0 rounded-full"
                />
                <span className="sr-only">Modifications non enregistrées</span>
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
  };

  const visibleSections =
    tabsLayout.mode === 'more'
      ? sections.filter((section) => tabsLayout.visible.includes(section.id))
      : sections;
  const hiddenSections =
    tabsLayout.mode === 'more'
      ? sections.filter((section) => !tabsLayout.visible.includes(section.id))
      : [];

  if (sections.length === 0) return null;

  return (
    <>
      <nav
        aria-label={ariaLabel}
        className={cn(
          isBar
            ? 'border-border-divider bg-surface-canvas sticky top-0 z-20 flex min-w-0 items-start gap-1 border-b transition-shadow motion-reduce:transition-none'
            : 'relative flex min-w-0 items-start gap-1',
          isStuck && '[box-shadow:var(--shadow-navigation-stuck)]',
          className,
        )}
        data-slot={
          variant === 'condensed'
            ? 'page-section-navigation-condensed'
            : 'page-section-navigation'
        }
        data-variant={variant}
        data-stuck={isStuck}
        ref={navigationRef}
      >
        {/* Outside the top edge, without changing the layout or the hit area. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-px left-0 h-px w-px"
          ref={stickyMarkerRef}
        />
        {isBar && scrollState.hasOverflow && (
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
        {isBar ? (
          <div
            ref={viewportRef}
            id={viewportId}
            className="min-w-0 flex-1 overflow-x-auto"
          >
            <div ref={contentRef} className="flex w-max min-w-full gap-1">
              {sections.map(renderLink)}
            </div>
          </div>
        ) : tabsLayout.mode === 'select' ? (
          <SectionOverflowMenu
            activeSection={activeSection}
            dirtySections={dirtySections}
            getSectionHref={getSectionHref}
            mode="select"
            onNavigate={navigateToSection}
            replace={replace}
            sections={sections}
          />
        ) : (
          <>
            {visibleSections.map(renderLink)}
            {hiddenSections.length > 0 && (
              <SectionOverflowMenu
                activeSection={activeSection}
                dirtySections={dirtySections}
                getSectionHref={getSectionHref}
                mode="more"
                onNavigate={navigateToSection}
                replace={replace}
                sections={hiddenSections}
              />
            )}
          </>
        )}
        {isBar && scrollState.hasOverflow && (
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
        {!isBar && (
          // Every tab at its natural width, to choose the ones that fit.
          <span
            aria-hidden="true"
            className="pointer-events-none invisible absolute top-0 left-0 h-0 w-0 overflow-hidden"
          >
            <span className="flex w-max gap-1" ref={measureRef}>
              {sections.map((section, index) => (
                <span
                  className={tabClassName(false)}
                  data-measure={`tab-${index}`}
                  key={section.id}
                >
                  {section.icon && (
                    <span className="shrink-0 [&_svg]:size-4">
                      {section.icon}
                    </span>
                  )}
                  {section.label}
                  {section.count !== undefined && (
                    <SectionCount count={section.count} />
                  )}
                  {dirtySections.includes(section.id) && (
                    <span className="size-2 shrink-0" />
                  )}
                </span>
              ))}
              <span
                className="inline-flex shrink-0 items-center gap-2 px-3 text-sm font-medium whitespace-nowrap"
                data-measure="more"
              >
                Plus
                <span className="size-2 shrink-0" />
                <ChevronDown className="size-4 shrink-0" />
              </span>
            </span>
          </span>
        )}
      </nav>
      {/* Static position after the sticky bar, with no extra space in the flow. */}
      {!sharedContentStartRef && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute block size-px"
          ref={ownContentStartRef}
        />
      )}
    </>
  );
};
