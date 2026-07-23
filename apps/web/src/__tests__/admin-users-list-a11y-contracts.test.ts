import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const readSourceFile = (relativePath: string): string => {
  // Test-owned paths only; the helper never receives external input.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
};

const usersListSource = readSourceFile('../features/users/UsersListPage.tsx');

describe('administrative users list accessibility contracts', () => {
  it('keeps desktop table rows semantic with one native overlay link', () => {
    expect(usersListSource).toContain(
      'group/row focus-within:ring-ring/40 relative cursor-pointer',
    );
    expect(usersListSource).toContain(
      "after:absolute after:inset-0 after:z-10 after:content-['']",
    );
    expect(usersListSource).toContain('href={getUserDetailHref(user.id)}');
    expect(usersListSource).not.toContain(
      '<Button asChild size="sm" variant="ghost">',
    );
    expect(usersListSource).not.toContain('role="button"');
    expect(usersListSource).not.toContain('handleOpenUserKeyDown');
    expect(usersListSource).not.toContain('openUserDetail');
    expect(usersListSource).not.toContain('useRouter');
    expect(usersListSource.match(/prefetch=\{false\}/g)).toHaveLength(2);
  });

  it('uses a native link for the complete mobile row without nested controls', () => {
    expect(usersListSource).toContain("'Ouvrir mon compte'");
    expect(usersListSource).toMatch(
      /`Ouvrir le compte de \$\{getUserDisplayName\(user\)\}`/,
    );
    expect(usersListSource).toContain(
      'className="hover:bg-surface-raised/70 focus-visible:bg-primary/10',
    );
    expect(usersListSource).not.toContain('tabIndex={0}');
    expect(usersListSource).not.toContain('router.push(');
  });

  it('keeps the directory compact and uses one coherent filter bar', () => {
    expect(usersListSource).toContain('title="Comptes utilisateurs"');
    expect(usersListSource).toContain('Nom, identifiant ou email…');
    expect(usersListSource).toContain('Tous les états');
    expect(usersListSource).toContain('Mot de passe à changer');
    expect(usersListSource).not.toContain('UsersStatCard');
    expect(usersListSource).not.toContain('Annuaire utilisateurs');
    expect(usersListSource).not.toContain('<Tabs');
    expect(usersListSource).not.toContain('DropdownMenu');
  });
});
