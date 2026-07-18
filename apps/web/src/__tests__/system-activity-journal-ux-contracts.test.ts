import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

// Test-owned paths only; neither URL receives external input.
// eslint-disable-next-line security/detect-non-literal-fs-filename
const pageSource = readFileSync(
  new URL('../features/audit/SystemActivityJournalPage.tsx', import.meta.url),
  'utf8',
);
// eslint-disable-next-line security/detect-non-literal-fs-filename
const displaySource = readFileSync(
  new URL('../features/audit/audit-display.ts', import.meta.url),
  'utf8',
);

describe('system activity journal UX contracts', () => {
  it('keeps results mounted during filter and refresh requests', () => {
    expect(pageSource).toContain(
      'const [isInitialLoading, setIsInitialLoading]',
    );
    expect(pageSource).toContain('const [isRefreshing, setIsRefreshing]');
    expect(pageSource).toContain('hasLoadedOnce && isInitialLoading');
    expect(pageSource).toContain('abortControllerRef.current?.abort()');
    expect(pageSource).not.toContain('setLogs([])');
  });

  it('persists investigation filters in the URL and debounces search', () => {
    expect(pageSource).toContain('useSearchParams');
    expect(pageSource).toContain('writeFiltersToSearchParams');
    expect(pageSource).toContain('router.replace(href, { scroll: false })');
    expect(pageSource).toContain('}, 350)');
    expect(pageSource).toContain("params.set('actorId', filters.actorId)");
    expect(pageSource).toContain(
      "params.set('targetUserId', filters.targetUserId)",
    );
  });

  it('uses one canonical page option for the activity journal', () => {
    expect(pageSource).toContain('normalizeJournalPageKey');
    expect(pageSource).not.toContain("value: 'activity-journal'");
  });

  it('protects export with permission visibility and step-up recovery', () => {
    expect(pageSource).toContain('PERMISSIONS.AUDIT.EXPORT');
    expect(pageSource).toContain('ErrorCode.REAUTHENTICATION_REQUIRED');
    expect(pageSource).toContain('<AdminStepUpDialog');
    expect(pageSource).toContain('exportFormat: format');
  });

  it('keeps exact before and after values and every changed field', () => {
    expect(displaySource).toContain('...Object.keys(before ?? {})');
    expect(displaySource).toContain('...Object.keys(after ?? {})');
    expect(displaySource).toContain('return String(value)');
    expect(displaySource).not.toContain('.slice(0, 42)');
    expect(pageSource).toContain('Détails sensibles masqués');
    expect(pageSource).toContain('hasLoadedOnce && visibilityResolved');
  });

  it('covers current sensitive system actions with a readable fallback', () => {
    for (const action of [
      'AUDIT_EXPORT',
      'MFA_RESET',
      'STEP_UP_FAILED',
      'STEP_UP_SUCCESS',
    ]) {
      expect(displaySource).toContain(`'${action}'`);
    }
    expect(pageSource).toContain('getAuditActionDisplay(log.action');
    expect(displaySource).toContain('DEFAULT_AUDIT_ACTION_DISPLAY');
  });

  it('does not rewrite historical user archives as definitive deletions', () => {
    expect(displaySource).toContain('HISTORICAL_USER_ARCHIVE_DISPLAY');
    expect(displaySource).toContain('Utilisateur archivé (historique)');
    expect(displaySource).toContain('metadata?.irreversible === true');
  });
});
