import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

// Test-owned paths only; neither URL receives external input.
// eslint-disable-next-line security/detect-non-literal-fs-filename
const userDetailSource = readFileSync(
  new URL('../components/users/UserDetailPage.tsx', import.meta.url),
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
  it('renders one server page of 50 immediately without sequential prefetch', () => {
    expect(userDetailSource).toMatch(/const USER_AUDIT_PAGE_SIZE\s*=\s*50/);
    expect(userDetailSource).not.toContain('USER_AUDIT_MAX_PREFETCH_PAGES');
    expect(userDetailSource).not.toMatch(
      /for\s*\(let page = 2; page <= pagesToFetch/,
    );
    expect(userDetailSource).toContain('setAuditLogs(loadedLogs)');
    expect(userDetailSource).toContain(
      'setAuditNextCursor(data.data.nextCursor ?? null)',
    );
    expect(userDetailSource).toContain(
      'setAuditHasMore(data.data.hasMore === true)',
    );
  });

  it('supports progressive loading, server filters and protected export', () => {
    expect(userDetailSource).toContain('fetchMoreAuditData');
    expect(userDetailSource).toContain("includeStats: 'false'");
    expect(userDetailSource).toContain('cursor: auditNextCursor');
    expect(userDetailSource).not.toContain('page: String(nextPage)');
    expect(userDetailSource).toContain('appendUserAuditFilters');
    expect(userDetailSource).toContain(
      'onFiltersChange={handleAuditFiltersChange}',
    );
    expect(userDetailSource).toContain('fetch(auditExportHref');
    expect(userDetailSource).toContain('requestStepUpForResponse');
    expect(userDetailSource).toContain('X-Export-Truncated');
    expect(userDetailSource).toContain('onExport={');
    expect(historySource).toContain('isServerFiltering');
    expect(historySource).toContain('isExporting');
  });

  it('shows a loading state before the first audit effect can run', () => {
    expect(userDetailSource).toContain('shouldShowAuditLoading');
    expect(userDetailSource).toContain('!hasLoadedAuditLogsRef.current');
    expect(userDetailSource).toContain('isLoading={shouldShowAuditLoading}');
  });
});
