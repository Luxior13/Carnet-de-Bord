import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Button } from '$ui/button';
import { Checkbox } from '$ui/checkbox';

describe('shared form control semantics', () => {
  it('makes an ordinary action non-submitting inside a form', () => {
    const markup = renderToStaticMarkup(
      createElement(Button, null, 'Modifier'),
    );

    expect(markup).toContain('type="button"');
    expect(markup).not.toContain('aria-busy');
    expect(markup).not.toContain('disabled=');
  });

  it('preserves explicitly requested submit and reset actions', () => {
    for (const type of ['submit', 'reset'] as const) {
      const markup = renderToStaticMarkup(
        createElement(Button, { type }, 'Action'),
      );

      expect(markup).toContain(`type="${type}"`);
    }
  });

  it('exposes pending state and prevents activation even with disabled false', () => {
    const markup = renderToStaticMarkup(
      createElement(
        Button,
        { 'aria-busy': false, disabled: false, loading: true, type: 'submit' },
        'Enregistrement…',
      ),
    );

    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('disabled=""');
    expect(markup).toContain('Enregistrement…');
    expect(markup).toMatch(/<svg[^>]*aria-hidden="true"/);
  });

  it('does not enable a disabled action when pending state ends', () => {
    const markup = renderToStaticMarkup(
      createElement(Button, { disabled: true, loading: false }, 'Enregistrer'),
    );

    expect(markup).toContain('disabled=""');
    expect(markup).not.toContain('aria-busy');
  });

  it('preserves a slotted navigation link without button-only attributes', () => {
    const markup = renderToStaticMarkup(
      createElement(
        Button,
        { asChild: true },
        createElement('a', { href: '/membres/repertoire' }, 'Retour'),
      ),
    );

    expect(markup).toMatch(/^<a /);
    expect(markup).toContain('href="/membres/repertoire"');
    expect(markup).not.toContain('<button');
    expect(markup).not.toContain('type=');
    expect(markup).not.toContain('disabled=');
  });

  it('exposes the mixed state for an initially indeterminate checkbox', () => {
    const markup = renderToStaticMarkup(
      createElement(Checkbox, {
        'aria-label': 'Tous les éléments',
        defaultChecked: 'indeterminate',
      }),
    );

    expect(markup).toContain('role="checkbox"');
    expect(markup).toContain('aria-checked="mixed"');
    expect(markup).toContain('aria-label="Tous les éléments"');
  });
});
