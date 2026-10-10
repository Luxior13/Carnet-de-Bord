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
const securitySource = readSourceFile(
  '../features/account/components/SecuritySection.tsx',
);
const activitySource = readSourceFile(
  '../components/users/user-detail/UserHistoryTab.tsx',
);
const sectionRailSource = readSourceFile(
  '../components/layout/PageSectionNavigation.tsx',
);
const userDetailPageSource = readSourceFile(
  '../components/users/UserDetailPage.tsx',
);

describe('/mon-compte UX contracts', () => {
  it('protects an edited profile from accidental tab and page navigation', () => {
    expect(profileSource).toContain('onDirtyChange(isProfileDirty)');
    expect(accountPageSource).toContain(
      "window.addEventListener('beforeunload'",
    );
    expect(accountPageSource).toContain(
      "document.addEventListener('click', handleDocumentClick, true)",
    );
    expect(accountPageSource).toContain('requestPendingNavigation');
    expect(accountPageSource).toContain('Quitter sans enregistrer ?');
  });

  it('loads personal activity with the server page size and explicit pagination', () => {
    expect(accountPageSource).not.toContain('ACCOUNT_AUDIT_PAGE_SIZE');
    expect(accountPageSource).toContain('fetchMoreAccountAuditLogs');
    expect(accountPageSource).toContain('cursor: auditNextCursor');
    expect(accountPageSource).toContain("includeStats: 'false'");
    expect(accountPageSource).not.toContain('page: String(nextPage)');
    expect(accountPageSource).toContain('hasMoreAuditLogs={hasMoreAuditLogs}');
    expect(accountPageSource).toContain(
      'onLoadMore={() => void fetchMoreAccountAuditLogs()}',
    );
    expect(accountPageSource).not.toContain('ACCOUNT_AUDIT_MAX_PREFETCH_PAGES');
    expect(activitySource).toContain(
      "const usesServerPagination = typeof onLoadMore === 'function'",
    );
    expect(activitySource).toContain(
      'isServerFiltering || usesServerPagination ? filteredLogs : displayedLogs',
    );
  });

  it('mounts Security and Activity only after their first visit', () => {
    expect(accountPageSource).toContain("visitedSections.has('security')");
    expect(accountPageSource).toContain("visitedSections.has('activity')");
    expect(accountPageSource).toContain(
      "if (activeSection !== 'activity') return",
    );
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
    expect(profileEditForm).not.toContain('autoComplete=');
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

  it('keeps personal activity compact with advanced filters on demand', () => {
    expect(activitySource).toContain('personal-activity-scope-label');
    expect(activitySource).toContain('personal-activity-period');
    expect(activitySource).toMatch(/<Collapsible[\s\S]{0,600}Filtres avancés/);
    expect(activitySource).not.toContain('CardFooter');
    expect(activitySource).toContain(
      'const displayedLogs = filteredLogs.slice(0, showCount)',
    );
    expect(activitySource).toContain('!hasMore && hasMoreAuditLogs');
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
    expect(userDetailPageSource).toMatch(
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
