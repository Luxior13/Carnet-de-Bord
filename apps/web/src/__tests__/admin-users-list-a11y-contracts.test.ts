import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const readSourceFile = (relativePath: string): string => {
  // Test-owned paths only; the helper never receives external input.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
};

const usersListSource = readSourceFile('../features/users/UsersListPage.tsx');

describe('administrative users list accessibility contracts', () => {
  it('keeps desktop table rows semantic and exposes one native navigation control', () => {
    expect(usersListSource).toContain('<TableRow key={user.id}>');
    expect(usersListSource).toContain(
      '<Button asChild size="sm" variant="ghost">',
    );
    expect(usersListSource).toContain('href={getUserDetailHref(user.id)}');
    expect(usersListSource).not.toContain('role="button"');
    expect(usersListSource).not.toContain('handleOpenUserKeyDown');
    expect(usersListSource).not.toContain('openUserDetail');
    expect(usersListSource).not.toContain('useRouter');
    expect(usersListSource.match(/prefetch=\{false\}/g)).toHaveLength(2);
  });

  it('uses a native link for the complete mobile row without nested controls', () => {
    expect(usersListSource).toMatch(
      /aria-label=\{`Voir \$\{getUserDisplayName\(user\)\}`\}/,
    );
    expect(usersListSource).toContain(
      'className="hover:bg-surface-raised/70 focus-visible:bg-primary/10',
    );
    expect(usersListSource).not.toContain('tabIndex={0}');
    expect(usersListSource).not.toContain('router.push(');
  });
});
