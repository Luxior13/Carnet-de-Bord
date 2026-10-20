import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { UsersListToolbar } from '$features/users/UsersListToolbar';
import type { UsersListController } from '$features/users/useUsersList';

const stats = {
  active: 7,
  byRole: { ADMIN: 2, SUPERADMIN: 1, USER: 6 },
  inactive: 2,
  pendingPasswordChange: 3,
  total: 9,
};

const render = (
  overrides: Partial<UsersListController> = {},
): {
  groups: Map<string, Array<{ label: string; pressed: boolean }>>;
  html: string;
} => {
  const list = {
    canRequestSecurityDetails: true,
    clearFilters: vi.fn(),
    currentUser: null,
    debouncedSearch: '',
    filterRole: 'all',
    filterStatus: 'all',
    handleFilterChange: vi.fn(),
    hasActiveFilters: false,
    hasTruncatedPagination: false,
    isLoading: false,
    isRefreshing: false,
    loadError: null,
    searchQuery: '',
    setCurrentPage: vi.fn(),
    setDebouncedSearch: vi.fn(),
    setSearchQuery: vi.fn(),
    sortBy: 'name',
    stats,
    totalFiltered: 9,
    ...overrides,
  } as unknown as UsersListController;
  const html = renderToStaticMarkup(createElement(UsersListToolbar, { list }));
  const groups = new Map(
    [
      ...html.matchAll(
        /<div aria-label="([^"]+)"[^>]*role="group">(.*?)<\/div>/g,
      ),
    ].map(([, label = '', content = '']) => [
      label,
      [...content.matchAll(/<button([^>]*)>(.*?)<\/button>/g)].map(
        ([, attributes = '', text = '']) => ({
          label: text
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim(),
          pressed: attributes.includes('aria-pressed="true"'),
        }),
      ),
    ]),
  );

  return { groups, html };
};

describe('users list quick filters', () => {
  it('replaces the overview and the state and role menus', () => {
    const { groups, html } = render();

    expect(groups.get('Filtrer par état')).toEqual([
      { label: 'Tous 9', pressed: true },
      { label: 'Actifs 7', pressed: false },
      { label: 'Désactivés 2', pressed: false },
      { label: 'Mot de passe à changer 3', pressed: false },
    ]);
    expect(groups.get('Filtrer par rôle')).toEqual([
      { label: 'Superadmin 1', pressed: false },
      { label: 'Administrateurs 2', pressed: false },
      { label: 'Utilisateurs 6', pressed: false },
    ]);
    expect(html).toContain('aria-label="Actifs, 7 comptes"');
    expect(html).toContain('aria-label="Superadmin, 1 compte"');
    expect(html).toMatch(/role="group"><span aria-hidden="true"[^>]*>État</);
    expect(html).toMatch(/role="group"><span aria-hidden="true"[^>]*>Rôle</);
    expect(html).not.toContain('Filtrer par état du compte');
    expect(html).not.toContain('par page');
  });

  it('keeps the faceted counts visible while filters are combined', () => {
    // The server already applies the search and the other dimension.
    const { groups } = render({
      debouncedSearch: 'zoé',
      filterRole: 'ADMIN',
      filterStatus: 'active',
      stats: {
        active: 1,
        byRole: { ADMIN: 1, SUPERADMIN: 0, USER: 2 },
        inactive: 1,
        pendingPasswordChange: 0,
        total: 2,
      },
    });

    expect(groups.get('Filtrer par état')).toEqual([
      { label: 'Tous 2', pressed: false },
      { label: 'Actifs 1', pressed: true },
      { label: 'Désactivés 1', pressed: false },
      { label: 'Mot de passe à changer 0', pressed: false },
    ]);
    expect(groups.get('Filtrer par rôle')).toEqual([
      { label: 'Superadmin 0', pressed: false },
      { label: 'Administrateurs 1', pressed: true },
      { label: 'Utilisateurs 2', pressed: false },
    ]);
  });

  it('shows no count before the first response', () => {
    const { groups } = render({ stats: null });
    const labels = [...groups.values()].flat().map((filter) => filter.label);

    expect(labels).toHaveLength(7);
    expect(labels.filter((label) => /\d/.test(label))).toEqual([]);
  });

  it('offers the password filter only to readers of security details', () => {
    const { groups } = render({
      canRequestSecurityDetails: false,
      stats: { ...stats, pendingPasswordChange: null },
    });

    expect(groups.get('Filtrer par état')?.map((f) => f.label)).toEqual([
      'Tous 9',
      'Actifs 7',
      'Désactivés 2',
    ]);
  });
});
