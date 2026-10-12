import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Disclosure } from '$components/layout/Disclosure';
import { ROADMAP_ITEMS } from '$features/roadmap/roadmap.constants';
import { RoadmapCard } from '$features/roadmap/RoadmapCard';

describe('roadmap card disclosure semantics', () => {
  it('gives each card and details action a distinct name without claiming navigation', () => {
    const cards = ROADMAP_ITEMS.slice(0, 2).map((item) => ({
      html: renderToStaticMarkup(createElement(RoadmapCard, { item })),
      item,
    }));
    for (const { html, item } of cards) {
      expect(html).toContain(`<article`);
      expect(html).toContain(`aria-labelledby="roadmap-title-${item.id}"`);
      expect(html).toContain(`id="roadmap-title-${item.id}"`);
      expect(html).toContain('aria-label="Public, prérequis et suite — ');
      expect(html).toContain('aria-expanded="false"');
      expect(html).not.toContain('<a ');
    }
    const names = cards.map(
      ({ html }) => html.match(/aria-label="([^"]+)"/)?.[1],
    );
    expect(new Set(names).size).toBe(2);
  });

  it('preserves the visible name for existing disclosures without an override', () => {
    const html = renderToStaticMarkup(
      createElement(Disclosure, {
        children: 'Contenu',
        label: 'Comprendre les étapes',
      }),
    );
    expect(html).toContain('Comprendre les étapes');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('aria-label=');
  });
});
