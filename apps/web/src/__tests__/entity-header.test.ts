import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { EntityHeader } from '$components/layout/EntityHeader';
import { PageSectionNavigation } from '$components/layout/PageSectionNavigation';
import { fitTabs } from '$components/layout/useTabsOverflow';

vi.mock('next/navigation', () => ({
  useRouter: (): { push: () => void; replace: () => void } => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

const sections = [
  { id: 'profile', label: 'Profil' },
  { id: 'security', label: 'Sécurité' },
] as const;

describe('record header (27 October 2026)', () => {
  it('puts the section tabs in the identity card, once, active one underlined', () => {
    const html = renderToStaticMarkup(
      createElement(EntityHeader, {
        compact: true,
        icon: 'SD',
        navigation: {
          activeSection: 'security',
          ariaLabel: 'Navigation de la fiche',
          getSectionHref: (section: string) => `?section=${section}`,
          sections,
        },
        title: 'Stéphane DUPONT',
      }),
    );

    // The condensed bar only exists once the header has scrolled away.
    expect(html.match(/<nav\b/g)).toHaveLength(1);
    expect(html).toMatch(/<header[^>]*data-slot="page-heading"[\s\S]*<nav/);
    expect(html).toContain('data-variant="embedded"');
    expect(html).not.toContain('data-slot="entity-header-condensed"');
    expect(html).toMatch(/aria-current="page"[^>]*class="[^"]*border-primary/);
    expect(html).not.toContain('bg-surface-navigation-active');
    expect(html).not.toContain('sticky top-0 z-20');
  });

  it('keeps the standalone sticky bar for other pages', () => {
    const html = renderToStaticMarkup(
      createElement(PageSectionNavigation, {
        activeSection: 'profile',
        ariaLabel: 'Sections',
        getSectionHref: (section: string) => `?section=${section}`,
        sections,
      }),
    );

    expect(html).toContain('sticky top-0 z-20');
    expect(html).toContain('data-variant="bar"');
  });

  describe('many tabs (27 October 2026)', () => {
    const ids = ['a', 'b', 'c', 'd', 'e', 'f'] as const;
    const widths = [100, 100, 100, 100, 100, 100];

    it('shows every tab when they fit', () => {
      expect(
        fitTabs({
          activeSection: 'a',
          available: 620,
          ids,
          moreWidth: 80,
          widths,
        }),
      ).toEqual({ mode: 'tabs', visible: ids });
    });

    it('keeps the tabs that fit beside « Plus », the current one included', () => {
      expect(
        fitTabs({
          activeSection: 'b',
          available: 520,
          ids,
          moreWidth: 80,
          widths,
        }),
      ).toEqual({ mode: 'more', visible: ['a', 'b', 'c', 'd'] });
      // A hidden current section takes the place of the last tab, in order.
      expect(
        fitTabs({
          activeSection: 'f',
          available: 520,
          ids,
          moreWidth: 80,
          widths,
        }),
      ).toEqual({ mode: 'more', visible: ['a', 'b', 'c', 'f'] });
    });

    it('turns into one section selector on a narrow screen', () => {
      expect(
        fitTabs({
          activeSection: 'c',
          available: 360,
          ids,
          moreWidth: 80,
          widths,
        }),
      ).toEqual({ mode: 'select', visible: [] });
    });
  });
});
