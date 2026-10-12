'use client';

import React, { type ReactNode } from 'react';

import { PageCanvas, PageShell } from '$ui/page-shell';

import { PageIdentityHero } from './PageIdentityHero';
import {
  type PageSection,
  PageSectionNavigation,
} from './PageSectionNavigation';

type EntityDetailLayoutProps<SectionId extends string> = {
  activeSection: SectionId;
  afterHero?: ReactNode;
  ariaLiveLabel?: string;
  children: ReactNode;
  dirtySections?: readonly SectionId[];
  heroActions?: ReactNode;
  heroIcon: ReactNode;
  heroMeta?: ReactNode;
  heroTitle: ReactNode;
  navigationAriaLabel: string;
  sectionHref: (section: SectionId) => string;
  sections: readonly PageSection<SectionId>[];
};

/**
 * Structure commune des fiches : identité et navigation par sections.
 */
export const EntityDetailLayout = <SectionId extends string>({
  activeSection,
  afterHero,
  ariaLiveLabel,
  children,
  dirtySections = [],
  heroActions,
  heroIcon,
  heroMeta,
  heroTitle,
  navigationAriaLabel,
  sectionHref,
  sections,
}: EntityDetailLayoutProps<SectionId>): React.JSX.Element => (
  <PageShell className="py-0">
    <PageCanvas contentClassName="relative space-y-4">
      <PageIdentityHero
        actions={heroActions}
        compact
        icon={heroIcon}
        meta={heroMeta}
        title={heroTitle}
      />

      <PageSectionNavigation
        activeSection={activeSection}
        ariaLabel={navigationAriaLabel}
        dirtySections={dirtySections}
        getSectionHref={sectionHref}
        replace
        sections={sections}
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
