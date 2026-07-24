'use client';

import React, { type ReactNode } from 'react';

import type { UserDetailSection } from '$components/users/user-detail/UserDetailNavigation';
import { UserDetailSectionRail } from '$components/users/user-detail/UserDetailSectionRail';
import type { NavigationSpaceTone } from '$constants/navigation-theme.constants';
import { PageCanvas, PageShell } from '$ui/page-shell';

import { PageBackButton } from './PageBackNavigation';
import { PageHero } from './PageHero';

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
  railAriaLabel: string;
  sectionHref: (section: SectionId) => string;
  sections: readonly UserDetailSection<SectionId>[];
  tone: NavigationSpaceTone;
};

/**
 * Structure commune à toutes les fiches métier : retour dans la gouttière,
 * rail d'onglets, hero compact et navigation mobile.
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
  railAriaLabel,
  sectionHref,
  sections,
  tone,
}: EntityDetailLayoutProps<SectionId>): React.JSX.Element => (
  <PageShell className="py-0">
    <PageCanvas contentClassName="relative space-y-3">
      <div className="private-left-rail">
        <div className="sticky top-4 space-y-2">
          <PageBackButton fullWidth href={backHref} label={backLabel} />
          <UserDetailSectionRail
            activeSection={activeSection}
            ariaLabel={railAriaLabel}
            className="!block"
            dirtySections={[]}
            getSectionHref={sectionHref}
            replace
            sections={sections}
          />
        </div>
      </div>

      <div className="2xl:hidden">
        <PageBackButton href={backHref} label={backLabel} />
      </div>

      <PageHero
        compact
        icon={heroIcon}
        iconClassName={heroIconClassName}
        meta={heroMeta}
        title={heroTitle}
        tone={tone}
      />

      {afterHero}

      <UserDetailSectionRail
        activeSection={activeSection}
        ariaLabel={railAriaLabel}
        dirtySections={[]}
        getSectionHref={sectionHref}
        layout="mobile"
        replace
        sections={sections}
      />

      {ariaLiveLabel && (
        <p aria-live="polite" className="sr-only">
          {ariaLiveLabel}
        </p>
      )}

      {children}
    </PageCanvas>
  </PageShell>
);
