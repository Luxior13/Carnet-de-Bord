import { UserRole } from '@repo/shared';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import {
  getPermissionSearchTerms,
  matchesPermissionSearch,
  normalizePermissionSearch,
  PERMISSION_EDITOR_CATEGORIES,
  PERMISSION_EDITOR_POLES,
} from '$components/users/permission-editor-view';
import { PermissionsEditor } from '$components/users/PermissionsEditor';
import { type PermissionItem } from '$constants/permissions.constants';

const renderEditor = (
  role: UserRole,
  permissions: Record<string, boolean> | null,
): string =>
  renderToStaticMarkup(
    createElement(PermissionsEditor, {
      onChange: vi.fn(),
      onSelectedPageChange: vi.fn(),
      openPageOnNarrow: true,
      permissions,
      role,
      selectedPageKey: 'persons',
    }),
  );

describe('permissions editor navigation (26 October 2026)', () => {
  it('lists every live page once, grouped by pole in catalog order', () => {
    const listed = PERMISSION_EDITOR_POLES.flatMap((pole) =>
      pole.categories.map((category) => category.key),
    );
    expect(listed.toSorted()).toEqual(
      PERMISSION_EDITOR_CATEGORIES.map((category) => category.key).toSorted(),
    );
    expect(
      PERMISSION_EDITOR_POLES.every((pole) => pole.categories.length > 0),
    ).toBe(true);
  });

  it('searches without regard to accents, case or spacing', () => {
    expect(normalizePermissionSearch('  Supprimer   DÉFINITIVEMENT ')).toBe(
      'supprimer definitivement',
    );
    const persons = PERMISSION_EDITOR_CATEGORIES.find(
      (category) => category.key === 'persons',
    );
    const deletion = persons?.permissions.find(
      (item) => item.key === 'persons:delete',
    );
    expect(persons && deletion).toBeTruthy();
    if (!persons || !deletion) return;
    const matches = (query: string): boolean =>
      matchesPermissionSearch(
        deletion,
        persons,
        getPermissionSearchTerms(query),
        'Membres',
      );
    expect(matches('supprimer')).toBe(true);
    // The page and pole labels match too.
    expect(matches('repertoire')).toBe(true);
    expect(matches('membres')).toBe(true);
    expect(matches('facture')).toBe(false);
  });

  it('finds every word in any order, singular or plural, without filler words', () => {
    expect(getPermissionSearchTerms('Supprimer les fiches')).toEqual([
      'supprimer',
      'fiche',
    ]);
    expect(getPermissionSearchTerms(' de la ')).toEqual([]);
    const persons = PERMISSION_EDITOR_CATEGORIES.find(
      (category) => category.key === 'persons',
    );
    const permission = (key: string): PermissionItem | undefined =>
      persons?.permissions.find((item) => item.key === key);
    const deletion = permission('persons:delete');
    const contact = permission('persons:view_contact');
    if (!persons || !deletion || !contact) throw new Error('catalogue');
    const matches = (item: typeof deletion, query: string): boolean =>
      matchesPermissionSearch(item, persons, getPermissionSearchTerms(query));
    expect(matches(deletion, 'fiche supprimer')).toBe(true);
    expect(matches(deletion, 'fiches définitivement')).toBe(true);
    expect(matches(deletion, 'supprimer facture')).toBe(false);
    // The description is searched: « email » finds the contact details.
    expect(matches(contact, 'email')).toBe(true);
    expect(matches(contact, 'de la')).toBe(false);
  });

  it('shows switches, the page navigation with counts and only the critical label', () => {
    const markup = renderEditor(UserRole.USER, {
      'persons:update': true,
      'persons:view': true,
    });

    expect(markup).toContain('aria-label="Pages des autorisations"');
    expect(markup).toContain('Rechercher une autorisation');
    expect(markup).toContain('Accordées');
    expect(markup).toContain('2 sur 7 utilisables');
    expect(markup).toContain('role="switch"');
    expect(markup).toContain('Critique');
    expect(markup).not.toContain('Sensible');
    expect(markup).not.toContain('>Refuser<');
    expect(markup).not.toContain('Page ou fonction');
    expect(markup).toContain(
      'Page accessible. Chaque action ci-dessous reste soumise à sa propre autorisation.',
    );
  });

  it('dims an action whose page is not accessible but keeps it settable', () => {
    const markup = renderEditor(UserRole.USER, null);

    expect(markup).toContain(
      'Sans cet accès, les actions de cette page restent bloquées.',
    );
    expect(markup).toMatch(
      /data-blocked="true"[^>]*data-permission="persons:create"/,
    );
    expect(markup).toContain('aria-label="Ajouter des fiches au répertoire"');
  });
});
