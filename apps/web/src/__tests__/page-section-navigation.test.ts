import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PageSectionNavigation } from '$components/layout/PageSectionNavigation';

const sections = [
  { id: 'profile', label: 'Profil' },
  { id: 'access', label: 'Autorisations' },
  { id: 'security', label: 'Sécurité' },
] as const;

describe('page section navigation', () => {
  it('renders one navigation with real shareable links and one current destination', () => {
    const html = renderToStaticMarkup(
      createElement(PageSectionNavigation, {
        activeSection: 'access',
        ariaLabel: 'Sections du compte',
        getSectionHref: (section: string) =>
          `/compte?section=${section}&returnTo=%2Fliste`,
        sections,
      }),
    );

    expect(html.match(/<nav\b/g)).toHaveLength(1);
    expect(html.match(/<a\b/g)).toHaveLength(3);
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toMatch(
      /<a[^>]*aria-current="page"[^>]*href="\/compte\?section=access&amp;returnTo=%2Fliste"/,
    );
    expect(html).toContain('Autorisations');
    expect(html).not.toContain('role="tab"');
  });

  it('announces unsaved changes on the affected section even when another is active', () => {
    const html = renderToStaticMarkup(
      createElement(PageSectionNavigation, {
        activeSection: 'security',
        ariaLabel: 'Sections du compte',
        dirtySections: ['profile'],
        getSectionHref: (section: string) => `/compte?section=${section}`,
        sections,
      }),
    );

    expect(html.match(/Modifications non enregistrées/g)).toHaveLength(1);
    expect(html).toMatch(
      /href="\/compte\?section=profile"[^>]*>Profil[\s\S]*?Modifications non enregistrées[\s\S]*?<\/a>/,
    );
  });

  it('does not expose an empty navigation when no section is authorized', () => {
    expect(
      renderToStaticMarkup(
        createElement(PageSectionNavigation, {
          activeSection: 'profile',
          ariaLabel: 'Sections du compte',
          getSectionHref: (section: string) => `/compte?section=${section}`,
          sections: [],
        }),
      ),
    ).toBe('');
  });
});
