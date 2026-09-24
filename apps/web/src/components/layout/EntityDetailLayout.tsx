'use client';

import React, { type ReactNode } from 'react';

import type { NavigationSpaceTone } from '$constants/navigation-theme.constants';
import { PageCanvas, PageShell } from '$ui/page-shell';

import { PageBackButton } from './PageBackNavigation';
import { PageHero } from './PageHero';
import {
  type PageSection,
  PageSectionNavigation,
} from './PageSectionNavigation';

type EntityDetailLayoutProps<SectionId extends string> = {
  activeSection: SectionId;
  afterHero?: ReactNode;
  ariaLiveLabel?: string;
  backHref: string;
  backLabel: string;
  children: ReactNode;
  heroIcon: ReactNode;
  heroIconClassName?: string;
  heroMeta?: ReactNode;
  heroTitle: ReactNode;
  navigationAriaLabel: string;
  sectionHref: (section: SectionId) => string;
  sections: readonly PageSection<SectionId>[];
  tone: NavigationSpaceTone;
};

/**
 * Structure commune des fiches : retour, identité et navigation par sections.
 */
export const EntityDetailLayout = <SectionId extends string>({
  activeSection,
  afterHero,
  ariaLiveLabel,
  backHref,
  backLabel,
  children,
  heroIcon,
  heroIconClassName,
  heroMeta,
  heroTitle,
  navigationAriaLabel,
  sectionHref,
  sections,
  tone,
}: EntityDetailLayoutProps<SectionId>): React.JSX.Element => (
  <PageShell className="py-0">
    <PageCanvas contentClassName="relative space-y-4">
      <PageBackButton href={backHref} label={backLabel} />

      <PageHero
        compact
        hasNavigation
        icon={heroIcon}
        iconClassName={heroIconClassName}
        meta={heroMeta}
        title={heroTitle}
        tone={tone}
      />

      <PageSectionNavigation
        activeSection={activeSection}
        ariaLabel={navigationAriaLabel}
        dirtySections={[]}
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
