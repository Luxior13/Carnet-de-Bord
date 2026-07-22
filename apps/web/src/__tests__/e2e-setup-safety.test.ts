import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

// The path is a fixed, repository-owned test fixture.
// eslint-disable-next-line security/detect-non-literal-fs-filename
const setupSource = readFileSync(
  new URL('../../scripts/e2e-setup.mjs', import.meta.url),
  'utf8',
);

describe('E2E setup Person-domain safety', () => {
  it('refuses a reused Person domain before mutating the root account', () => {
    expect(setupSource).toContain('client.person.count()');
    expect(setupSource).toContain('client.personDeletionTombstone.count()');
    expect(setupSource).toContain(
      "client.auditFieldChange.count({ where: { entityType: 'PERSON' } })",
    );
    expect(setupSource).toContain("{ category: 'PERSON' }");
    expect(setupSource).toContain(
      'Recreate or reset the isolated E2E database',
    );

    const guardIndex = setupSource.indexOf(
      'await assertEmptyPersonDomain(prisma);',
    );
    const rootPasswordMutationIndex = setupSource.indexOf(
      'const passwordHash = await bcrypt.hash',
    );
    const rootTransactionIndex = setupSource.indexOf(
      'const result = await prisma.$transaction',
    );

    expect(guardIndex).toBeGreaterThan(-1);
    expect(rootPasswordMutationIndex).toBeGreaterThan(guardIndex);
    expect(rootTransactionIndex).toBeGreaterThan(guardIndex);
  });

  it('never purges Person-domain state from the setup harness', () => {
    expect(setupSource).not.toMatch(
      /(?:person|personDeletionTombstone|auditFieldChange|auditLog)\.(?:delete|deleteMany)\(/,
    );
  });
});
