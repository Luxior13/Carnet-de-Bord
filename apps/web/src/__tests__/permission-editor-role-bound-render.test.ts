import { UserRole } from '@repo/shared';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { PermissionsEditor } from '$components/users/PermissionsEditor';

const renderSettingsPermissions = (role: UserRole): string =>
  renderToStaticMarkup(
    createElement(PermissionsEditor, {
      onChange: vi.fn(),
      onSelectedPageChange: vi.fn(),
      permissions: null,
      role,
      selectedPageKey: 'system-settings',
    }),
  );

describe('role-bound permission page rendering', () => {
  it('shows the settings permissions as role-provided for administrators', () => {
    const markup = renderSettingsPermissions(UserRole.ADMIN);

    expect(markup).toContain('Paramètres système');
    expect(markup).toContain('Consulter les paramètres système');
    expect(markup).toContain('Modifier les paramètres système');
    expect(markup).toContain('2/2 utilisables');
    expect(markup).toContain('Fourni par le rôle Administrateur');
    expect(markup).not.toContain(
      'Choix de l’autorisation Consulter les paramètres système',
    );
    expect(markup).not.toContain(
      'Choix de l’autorisation Modifier les paramètres système',
    );
  });

  it('explains that settings stay reserved to administrators for users', () => {
    const markup = renderSettingsPermissions(UserRole.USER);

    expect(markup).toContain('Paramètres système');
    expect(markup).toContain('0/2 utilisables');
    expect(markup).toContain('Réservé aux administrateurs');
    expect(markup).not.toContain(
      'Choix de l’autorisation Consulter les paramètres système',
    );
    expect(markup).not.toContain(
      'Choix de l’autorisation Modifier les paramètres système',
    );
  });
});
