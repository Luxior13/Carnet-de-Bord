'use client';

import React, { type ReactNode, useEffect, useRef, useState } from 'react';

import { BreadcrumbIdentity } from './BreadcrumbIdentity';
import {
  PageIdentityHero,
  type PageIdentityHeroProps,
} from './PageIdentityHero';
import {
  PageSectionNavigation,
  type PageSectionNavigationProps,
} from './PageSectionNavigation';
import { getSectionScrollContainer } from './useSectionNavigation';

/** Section tabs of the header: the props of PageSectionNavigation it owns. */
export type EntityHeaderNavigation<SectionId extends string> = Omit<
  PageSectionNavigationProps<SectionId>,
  'contentStartRef' | 'stickyBoundaryRef' | 'variant'
>;

type EntityHeaderProps<SectionId extends string> = Omit<
  PageIdentityHeroProps,
  'footer'
> & {
  /** Short state shown beside the name in the breadcrumb. */
  condensedAside?: ReactNode;
  navigation: EntityHeaderNavigation<SectionId>;
};

/**
 * Header of a record (owner decision of 27 October 2026): identity, states
 * and section tabs in one card. Once it scrolls away, a condensed bar keeps
 * the same tabs at the top; the breadcrumb, which names the record, also
 * shows its avatar and short state. Only one set of tabs is
 * reachable at a time.
 */
export const EntityHeader = <SectionId extends string>({
  condensedAside,
  icon,
  navigation,
  title,
  ...hero
}: EntityHeaderProps<SectionId>): React.JSX.Element => {
  const heroRef = useRef<HTMLDivElement>(null);
  const condensedRef = useRef<HTMLDivElement>(null);
  const contentStartRef = useRef<HTMLSpanElement>(null);
  const [condensed, setCondensed] = useState(false);
  const focusInCondensedRef = useRef(false);

  useEffect(() => {
    const element = heroRef.current;
    if (!element || !('IntersectionObserver' in window)) return undefined;
    const root = getSectionScrollContainer(element);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.rootBounds) return;
        // Scrolled past, not merely below the fold.
        setCondensed(
          !entry.isIntersecting &&
            entry.boundingClientRect.bottom <= entry.rootBounds.top,
        );
      },
      { root, threshold: 0 },
    );
    observer.observe(element);

    return (): void => observer.disconnect();
  }, []);

  // A removed bar takes its focus with it: when the condensed bar held it,
  // hand it to the current tab (or the section selector) of the full header.
  useEffect(() => {
    if (condensed || !focusInCondensedRef.current) return;
    focusInCondensedRef.current = false;
    if (document.activeElement && document.activeElement !== document.body)
      return;
    heroRef.current
      ?.querySelector<HTMLElement>(
        '[aria-current="page"], [data-slot="section-select"]',
      )
      ?.focus({ preventScroll: true });
  }, [condensed]);

  return (
    <>
      <BreadcrumbIdentity aside={condensedAside} icon={icon} />
      <div ref={heroRef}>
        <PageIdentityHero
          {...hero}
          footer={
            // While the condensed bar is shown, these tabs sit off screen:
            // keep keyboard focus on the visible ones.
            <div aria-hidden={condensed || undefined} inert={condensed}>
              <PageSectionNavigation
                {...navigation}
                contentStartRef={contentStartRef}
                variant="embedded"
              />
            </div>
          }
          icon={icon}
          title={title}
        />
      </div>
      {/* Zero-height sticky anchor after the header: it sticks exactly when the
          header has scrolled away, and the bar overlays without moving the page. */}
      <div className="sticky top-0 z-30 mb-0 h-0">
        {condensed && (
          <div
            className="border-border-divider bg-surface-canvas absolute inset-x-0 top-0 border-b [box-shadow:var(--shadow-navigation-stuck)]"
            data-slot="entity-header-condensed"
            onFocus={() => {
              focusInCondensedRef.current = true;
            }}
            ref={condensedRef}
          >
            <PageSectionNavigation
              {...navigation}
              contentStartRef={contentStartRef}
              stickyBoundaryRef={condensedRef}
              variant="condensed"
            />
          </div>
        )}
      </div>
      {/* Start of the section content, shared by both sets of tabs. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute block size-px"
        ref={contentStartRef}
      />
    </>
  );
};
