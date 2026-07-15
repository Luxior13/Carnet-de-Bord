import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const readSourceFile = (relativePath: string): string => {
  // Test-owned paths only; the helper never receives external input.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
};

const resumeSource = readSourceFile(
  '../components/users/user-detail/UserResumeTab.tsx',
);
const profileSource = readSourceFile(
  '../components/users/user-detail/UserProfileTab.tsx',
);
const accountSource = readSourceFile(
  '../components/users/user-detail/UserAccountTab.tsx',
);
const securitySource = readSourceFile(
  '../components/users/user-detail/UserSecurityTab.tsx',
);
const permissionsSource = readSourceFile(
  '../components/users/PermissionsEditor.tsx',
);

describe('administrative user detail subcomponent UX contracts', () => {
  it('keeps the summary focused and does not expose an unfinished contact-verification status', () => {
    expect(resumeSource).toContain('Résumé du compte');
    expect(resumeSource).not.toContain('contactEmailVerifiedAt');
    expect(resumeSource).not.toContain('Identifiant de connexion');
    expect(resumeSource).not.toContain('getAccessLabel');
  });

  it('makes contact removal explicit and keeps the self profile compact', () => {
    expect(profileSource).toContain("'save' | 'stage' | null");
    expect(profileSource).toContain('Supprimer l&apos;adresse de contact');
    expect(profileSource).toContain('isSelf = false');
    expect(profileSource).toContain('Profil administratif');
    expect(profileSource).toContain('sm:flex-row sm:items-center');
  });

  it('keeps guaranteed personal-account capabilities compact and secondary', () => {
    expect(accountSource).toContain('<details');
    expect(accountSource).toContain('Fonctions essentielles garanties');
    expect(accountSource).toContain('Compte personnel');
    expect(accountSource).toContain('Option configurable');
    expect(accountSource).toContain('Personnalisé');
  });

  it('focuses security on modules and confirms individual session revocation', () => {
    expect(securitySource).not.toMatch(/\bSecurityMetric\b/);
    expect(securitySource).toContain('user-security-status-heading');
    expect(securitySource).toContain('user-security-password-heading');
    expect(securitySource).toContain('user-security-mfa-heading');
    expect(securitySource).toContain('user-security-sessions-heading');
    expect(securitySource).toContain('user.failedLoginAttempts > 0 &&');
    expect(securitySource).toContain('Révoquer cette session ?');
    expect(securitySource).toContain('Révoquer la session');
  });

  it('uses progressive disclosure for permission details without hiding dependencies', () => {
    expect(permissionsSource).toContain('Accès et permissions');
    expect(permissionsSource).toContain('Détails et héritage');
    expect(permissionsSource).toContain('view.missingDependencyLabels');
    expect(permissionsSource).toContain('view.dependencyLabels');
    expect(permissionsSource).toContain('Exception personnalisée');
  });
});
