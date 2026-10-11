import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { SectionActionBar } from '../components/layout/SectionActionBar';

const noop = (): void => {};
type ActionBarProps = Parameters<typeof SectionActionBar>[0];
type RenderProps =
  | Partial<Extract<ActionBarProps, { saveType?: 'button' }>>
  | Extract<ActionBarProps, { saveType: 'submit' }>;
const render = (props: RenderProps = {}): string =>
  renderToStaticMarkup(
    createElement(
      SectionActionBar,
      props.saveType === 'submit'
        ? { onCancel: noop, ...props }
        : { onCancel: noop, onSave: noop, ...props },
    ),
  );
const buttons = (html: string): string[] =>
  html.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) ?? [];

describe('shared form action bar', () => {
  it('keeps an ordinary action from implicitly submitting its surrounding form', () => {
    const actions = buttons(
      render({ conflict: true, onResolveConflict: noop }),
    );
    expect(actions).toHaveLength(3);
    for (const action of actions) expect(action).toContain('type="button"');
  });

  it('supports native submission for creation and inline forms', () => {
    const actions = buttons(
      render({
        saveForm: 'create-person',
        saveLabel: 'Créer la fiche',
        saveType: 'submit',
      }),
    );
    expect(actions[0]).toContain('type="button"');
    expect(actions[1]).toContain('type="submit"');
    expect(actions[1]).toContain('form="create-person"');
    expect(actions[1]).toContain('Créer la fiche');
  });

  it.each([
    ['no changes', { hasChanges: false }],
    ['saving', { isSaving: true }],
    [
      'refreshing',
      { conflict: true, isResolvingConflict: true, onResolveConflict: noop },
    ],
    ['external operation', { disabled: true }],
  ])('locks all ordinary actions during %s', (_, props) => {
    for (const action of buttons(render(props)))
      expect(action).toContain('disabled=""');
  });

  it('permits closing a pristine inline editor without permitting a save', () => {
    const actions = buttons(
      render({ cancelDisabled: false, hasChanges: false, placement: 'inline' }),
    );
    expect(actions[0]).not.toContain('disabled=""');
    expect(actions[1]).toContain('disabled=""');
  });

  it('keeps the cancellation link available on a pristine creation form', () => {
    const html = render({
      cancelHref: '/membres/repertoire',
      hasChanges: false,
      saveType: 'submit',
    });
    const link = /<a\b[^>]*>[\s\S]*?<\/a>/.exec(html)?.[0];

    expect(link).toContain('href="/membres/repertoire"');
    expect(link).not.toContain('aria-disabled');
    expect(buttons(html)[0]).toContain('disabled=""');
  });

  it.each([
    { cancelDisabled: true },
    { isSaving: true },
    { isResolvingConflict: true },
    { disabled: true },
  ])('exposes a disabled cancellation link when blocked by %j', (props) => {
    const html = render({
      ...props,
      cancelHref: '/membres/repertoire',
      saveType: 'submit',
    });
    const link = /<a\b[^>]*>[\s\S]*?<\/a>/.exec(html)?.[0];

    expect(link).toContain('aria-disabled="true"');
  });

  it('offers reload and cancellation, but blocks save while a version conflict remains', () => {
    const actions = buttons(
      render({ conflict: true, onResolveConflict: noop }),
    );
    expect(actions[0]).not.toContain('disabled=""');
    expect(actions[1]).not.toContain('disabled=""');
    expect(actions[2]).toContain('disabled=""');
  });

  it('describes refreshing without falsely reporting a save', () => {
    const html = render({
      conflict: true,
      isResolvingConflict: true,
      onResolveConflict: noop,
    });
    expect(html).toContain('Actualisation de la version…');
    expect(html).not.toContain('Enregistrement…');
    expect(html).toContain('aria-busy="true"');
  });

  it('requests a version check without asserting that an uncertain mutation changed the record', () => {
    const html = render({ conflict: true });

    expect(html).toContain(
      'Vérifiez la version enregistrée avant de poursuivre.',
    );
    expect(html).toContain('Votre saisie est conservée.');
    expect(html).not.toContain('La fiche a changé');
  });

  it('keeps a persistent reason for a disabled save associated with the control', () => {
    const html = render({
      saveDisabled: true,
      saveDisabledReason: 'Une attribution dépasse vos droits.',
    });
    expect(html).toContain('Une attribution dépasse vos droits.');
    const reasonId = /<p[^>]*id="([^"]+-reason)"/.exec(html)?.[1];
    expect(reasonId).toBeTruthy();
    expect(buttons(html)[1]).toContain(`${reasonId}"`);
  });
});
