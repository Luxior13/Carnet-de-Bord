'use client';

import React, { type ReactNode } from 'react';

import { PageCanvas, PageShell } from '$ui/page-shell';

import { EntityHeader } from './EntityHeader';
import { type PageSection } from './PageSectionNavigation';

type EntityDetailLayoutProps<SectionId extends string> = {
  activeSection: SectionId;
  afterHero?: ReactNode;
  ariaLiveLabel?: string;
  children: ReactNode;
  /** Short state kept in the condensed header while scrolling. */
  condensedAside?: ReactNode;
  dirtySections?: readonly SectionId[];
  heroActions?: ReactNode;
  /** Line under the title: identifier, creation and last change. */
  heroDescription?: ReactNode;
  heroIcon: ReactNode;
  heroMeta?: ReactNode;
  heroTitle: ReactNode;
  navigationAriaLabel: string;
  sectionHref: (section: SectionId) => string;
  sections: readonly PageSection<SectionId>[];
};

/**
 * Structure commune des fiches : identité et navigation par sections, réunies
 * dans un en-tête de fiche avec sa version réduite au défilement.
 */
export const EntityDetailLayout = <SectionId extends string>({
  activeSection,
  afterHero,
  ariaLiveLabel,
  children,
  condensedAside,
  dirtySections = [],
  heroActions,
  heroDescription,
  heroIcon,
  heroMeta,
  heroTitle,
  navigationAriaLabel,
  sectionHref,
  sections,
}: EntityDetailLayoutProps<SectionId>): React.JSX.Element => (
  <PageShell className="py-0">
    <PageCanvas contentClassName="relative space-y-4">
      <EntityHeader
        actions={heroActions}
        compact
        condensedAside={condensedAside}
        description={heroDescription}
        icon={heroIcon}
        meta={heroMeta}
        navigation={{
          activeSection,
          ariaLabel: navigationAriaLabel,
          dirtySections,
          getSectionHref: sectionHref,
          replace: true,
          sections,
        }}
        title={heroTitle}
      />

      {afterHero}

      {ariaLiveLabel && (
        <p aria-live="polite" className="sr-only">
          {ariaLiveLabel}
        </p>
      )}

      {children}
    </PageCanvas>
  </PageShell>
);
