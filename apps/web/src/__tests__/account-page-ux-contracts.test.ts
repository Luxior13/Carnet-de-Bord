import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const readSourceFile = (relativePath: string): string => {
  // Test-owned paths only; the helper never receives external input.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
};

const accountPageSource = readSourceFile(
  '../features/account/AccountPageContent.tsx',
);
const profileSource = readSourceFile(
  '../features/account/components/ProfileSection.tsx',
);
const contactEmailDialogSource = readSourceFile(
  '../features/account/components/ContactEmailDialog.tsx',
);
const securitySource = [
  '../features/account/components/SecuritySection.tsx',
  '../features/account/components/AccountSessionsCard.tsx',
]
  .map((path) => readSourceFile(path))
  .join('\n');
const sectionRailSource = readSourceFile(
  '../components/layout/PageSectionNavigation.tsx',
);
// The record page and the frame split out of it on 2026-10-23.
const userDetailPageSource = [
  '../components/users/UserDetailPage.tsx',
  '../components/users/user-detail/UserDetailFrame.tsx',
]
  .map(readSourceFile)
  .join('\n');
const userDetailCapabilitiesSource = readSourceFile(
  '../components/users/user-detail/useUserDetailCapabilities.ts',
);

describe('/mon-compte UX contracts', () => {
  it('protects an edited profile from accidental tab and page navigation', () => {
    expect(profileSource).toContain('onDirtyChange(isProfileDirty)');
    expect(accountPageSource).toContain(
      'useUnsavedNavigationGuard(isProfileDirty, resetDraft)',
    );
    expect(accountPageSource).toContain('<UnsavedNavigationDialog');
    expect(accountPageSource).toContain('onCloseAutoFocus={restoreFocus}');
  });

  it('keeps the retired activity section out of the live account page', () => {
    expect(accountPageSource).not.toContain('fetchMoreAccountAuditLogs');
    expect(accountPageSource).not.toContain('<UserHistoryTab');
    expect(accountPageSource).toContain("visitedSections.has('security')");
  });

  it('limits identity editing to first and last name', () => {
    const formStart = profileSource.indexOf('<form');
    const formEnd = profileSource.indexOf('</form>', formStart);

    expect(formStart).toBeGreaterThanOrEqual(0);
    expect(formEnd).toBeGreaterThan(formStart);

    const profileEditForm = profileSource.slice(formStart, formEnd);

    expect(profileEditForm).toContain('id="edit-firstName"');
    expect(profileEditForm).toContain('id="edit-lastName"');
    expect(profileEditForm).not.toContain('name=');
    expect(profileEditForm).toContain('autoComplete="off"');
  });

  it('uses a dedicated, confirmed action to remove the contact email', () => {
    expect(contactEmailDialogSource).toContain('isConfirmingRemoval');
    expect(contactEmailDialogSource).toMatch(
      /contactEmailToSave\s*=\s*isConfirmingRemoval\s*\?\s*null/,
    );
    expect(contactEmailDialogSource).toContain(
      "Supprimer l'adresse de contact",
    );
    expect(contactEmailDialogSource).toContain(
      'Confirmer la suppression de cette adresse ?',
    );
    expect(contactEmailDialogSource).toContain('hasDraftChanges');
    expect(contactEmailDialogSource).toContain(
      'Abandonner les modifications ?',
    );
  });

  it('keeps Security focused on actions instead of duplicate metric cards', () => {
    expect(securitySource).not.toMatch(/\bSecurityMetric\b/);
    expect(securitySource).toContain('account-password-heading');
    expect(securitySource).toContain('account-mfa-heading');
    expect(securitySource).toContain('account-sessions-heading');
  });

  it('keeps section links touch-friendly with complete labels at every size', () => {
    expect(sectionRailSource).toContain('min-h-12');
    expect(sectionRailSource).toContain('overflow-x-auto');
    expect(sectionRailSource).not.toContain('truncate');
    expect(accountPageSource.match(/<PageSectionNavigation/g)).toHaveLength(1);
  });

  it('keeps the current user read-only in Administration and directs self-service to /mon-compte', () => {
    expect(userDetailPageSource).not.toContain('<PageBackButton');
    expect(userDetailPageSource).toContain(
      '{ href: returnHref, label: FEATURES.users.label }',
    );
    expect(userDetailPageSource).not.toContain('<ArrowLeft');
    expect(userDetailCapabilitiesSource).toMatch(
      /const canEditTargetProfile\s*=\s*!!user\s*&&\s*!isSelf/,
    );
    expect(userDetailPageSource).toMatch(
      /\{isSelf\s*&&\s*\([\s\S]{0,900}href="\/mon-compte"/,
    );
    expect(userDetailPageSource).toContain(
      'Votre fiche administrative est en lecture seule',
    );
  });
});
