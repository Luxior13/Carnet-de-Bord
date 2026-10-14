import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

// Test-owned paths only; no URL receives external input.
// eslint-disable-next-line security/detect-non-literal-fs-filename
const userDetailSource = readFileSync(
  new URL('../components/users/UserDetailPage.tsx', import.meta.url),
  'utf8',
);
// eslint-disable-next-line security/detect-non-literal-fs-filename
const auditHookSource = readFileSync(
  new URL(
    '../components/users/user-detail/useUserDetailAudit.ts',
    import.meta.url,
  ),
  'utf8',
);
// eslint-disable-next-line security/detect-non-literal-fs-filename
const historySource = readFileSync(
  new URL(
    '../components/users/user-detail/UserHistoryTab.tsx',
    import.meta.url,
  ),
  'utf8',
);

describe('managed user audit UX contracts', () => {
  it('renders one server-sized page immediately without sequential prefetch', () => {
    expect(auditHookSource).not.toContain('USER_AUDIT_PAGE_SIZE');
    expect(auditHookSource).not.toContain('USER_AUDIT_SUMMARY_PAGE_SIZE');
    expect(auditHookSource).not.toContain('USER_AUDIT_MAX_PREFETCH_PAGES');
    expect(auditHookSource).toContain(
      "if (activeSection !== 'history' || hasLoadedAuditLogsRef.current) return",
    );
    expect(auditHookSource).not.toMatch(
      /for\s*\(let page = 2; page <= pagesToFetch/,
    );
    expect(auditHookSource).toContain('setAuditLogs(loadedLogs)');
    expect(auditHookSource).toContain(
      'setAuditNextCursor(data.data.nextCursor ?? null)',
    );
    expect(auditHookSource).toContain(
      'setAuditHasMore(data.data.hasMore === true)',
    );
  });

  it('supports progressive loading, server filters and protected export', () => {
    expect(auditHookSource).toContain('fetchMoreAuditData');
    expect(auditHookSource).toContain("includeStats: 'false'");
    expect(auditHookSource).toContain('cursor: auditNextCursor');
    expect(auditHookSource).not.toContain('page: String(nextPage)');
    expect(auditHookSource).toContain('appendUserAuditFilters');
    expect(userDetailSource).toContain(
      'onFiltersChange={handleAuditFiltersChange}',
    );
    expect(auditHookSource).toContain('fetch(auditExportHref');
    expect(auditHookSource).toContain('requestStepUpForResponse');
    expect(auditHookSource).toContain('X-Export-Truncated');
    expect(userDetailSource).toContain('onExport={');
    expect(historySource).toContain('isServerFiltering');
    expect(historySource).toContain('isExporting');
  });

  it('shows a loading state before the first audit effect can run', () => {
    expect(userDetailSource).toContain('shouldShowAuditLoading');
    expect(auditHookSource).toContain('!hasLoadedAuditLogsRef.current');
    expect(userDetailSource).toContain('isLoading={shouldShowAuditLoading}');
  });

  it('keeps the managed activity hierarchy flat and filters grouped', () => {
    expect(historySource).toContain('<CardContent className="p-0">');
    expect(historySource).toContain('managed-activity-scope-label');
    expect(historySource).toContain('id="activity-pole"');
    expect(historySource).toContain('id="activity-page"');
    expect(historySource).toContain('Par cet utilisateur');
    expect(historySource).toContain(
      'Événements concernant ce compte ou déclenchés par cet utilisateur.',
    );
    expect(historySource).not.toContain('Actions de cet utilisateur');
    expect(historySource).not.toContain('selectedPageTitle');
    expect(historySource).not.toContain('ActivityScopeIconGroup');
    expect(historySource).not.toContain('CardFooter');
  });
});
