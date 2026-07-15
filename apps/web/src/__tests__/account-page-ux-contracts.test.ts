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
  '../components/users/user-detail/UserDetailSectionRail.tsx',
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

  it('loads personal activity in pages of 50 and exposes explicit pagination', () => {
    expect(accountPageSource).toMatch(/const ACCOUNT_AUDIT_PAGE_SIZE\s*=\s*50/);
    expect(accountPageSource).toContain('fetchMoreAccountAuditLogs');
    expect(accountPageSource).toContain('page: String(nextPage)');
    expect(accountPageSource).toContain('hasMoreAuditLogs={hasMoreAuditLogs}');
    expect(accountPageSource).toContain(
      'onLoadMore={() => void fetchMoreAccountAuditLogs()}',
    );
    expect(accountPageSource).not.toContain('ACCOUNT_AUDIT_MAX_PREFETCH_PAGES');
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

    expect(profileEditForm).toContain('name="firstName"');
    expect(profileEditForm).toContain('name="lastName"');
    expect(profileEditForm).not.toContain('name="loginName"');
    expect(profileEditForm).not.toContain('name="email"');
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
    expect(activitySource).toMatch(/<details[\s\S]{0,600}Filtres avancés/);
    expect(activitySource).toMatch(
      /\{!isPersonalPerspective\s*&&\s*\([\s\S]{0,160}<CardFooter/,
    );
    expect(activitySource).toContain(
      'const displayedLogs = filteredLogs.slice(0, showCount)',
    );
    expect(activitySource).toContain('!hasMore && hasMoreAuditLogs');
  });

  it('gives mobile section tabs a 44 px touch target', () => {
    const layoutClassPairs = [
      ...sectionRailSource.matchAll(
        /isDesktop\s*\?\s*'([^']*)'\s*:\s*'([^']*)'/g,
      ),
    ];
    const heightClassPair = layoutClassPairs.find((match) => {
      const desktopClasses = match[1];
      const mobileClasses = match[2];

      return (
        typeof desktopClasses === 'string' &&
        typeof mobileClasses === 'string' &&
        desktopClasses.includes('h-') &&
        mobileClasses.includes('min-w-[4.75rem]')
      );
    });
    const mobileLayoutClasses = heightClassPair?.[2];

    expect(mobileLayoutClasses?.split(/\s+/)).toContain('h-11');
  });

  it('keeps the current user read-only in Administration and directs self-service to /mon-compte', () => {
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
