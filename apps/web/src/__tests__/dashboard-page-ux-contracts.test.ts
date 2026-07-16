import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const readSourceFile = (relativePath: string): string => {
  // Test-owned paths only; the helper never receives external input.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
};

const dashboardPageSource = readSourceFile('../app/page.tsx');
const dashboardRouteSource = readSourceFile('../app/api/dashboard/route.ts');
const dashboardTypesSource = readSourceFile(
  '../shared/types/dashboard.types.ts',
);

describe('/ dashboard UX contracts', () => {
  it('does not duplicate navigation, account details or directory metrics', () => {
    expect(dashboardPageSource).not.toContain('Actions rapides');
    expect(dashboardPageSource).not.toContain('Mon accès');
    expect(dashboardPageSource).not.toContain('Nouveau membre');
    expect(dashboardPageSource).not.toContain('DashboardMetricCard');
    expect(dashboardPageSource).not.toContain('teamMetrics');
    expect(dashboardPageSource).not.toContain('getAccessLabel');
    expect(dashboardPageSource).not.toContain('DashboardSkeleton');
  });

  it('only renders separate security signals when action is required', () => {
    expect(dashboardPageSource).toContain('hasSecurityAttention');
    expect(dashboardPageSource).toContain('Comptes actifs verrouillés');
    expect(dashboardPageSource).toContain('Mots de passe temporaires');
    expect(dashboardPageSource).toContain('MFA à configurer');
    expect(dashboardPageSource).not.toContain(
      'Aucune action de sécurité en attente',
    );
  });

  it('only renders a short activity feed when events exist', () => {
    expect(dashboardPageSource).toContain('hasRecentActivity');
    expect(dashboardRouteSource).toContain('take: 3');
    expect(dashboardPageSource).not.toContain('Aucune activité récente');
    expect(dashboardPageSource).not.toContain('Activité indisponible');
    expect(dashboardPageSource).not.toContain('Skeleton');
  });

  it('reuses the audit catalog and accessible activity semantics', () => {
    expect(dashboardPageSource).toContain('AUDIT_ACTION_DISPLAY');
    expect(dashboardPageSource).not.toContain('ACTION_LABELS');
    expect(dashboardPageSource).toContain('<time');
    expect(dashboardPageSource).toContain(
      'dateTime={activityDate.toISOString()}',
    );
    expect(dashboardPageSource).toContain(
      '<h2 className="text-sm font-semibold">À traiter</h2>',
    );
  });

  it('keeps unavailable API sections distinct from real empty data', () => {
    expect(dashboardTypesSource).toMatch(/recentActivity:[^;]+\| null;/);
    expect(dashboardTypesSource).toMatch(/security:[\s\S]+?\} \| null;/);
    expect(dashboardTypesSource).not.toContain('users:');
    expect(dashboardPageSource).toContain('hasDashboardContent');
  });

  it('invalidates loaded data when identity or effective audit scope changes', () => {
    expect(dashboardPageSource).toContain('dashboardAccessScope');
    expect(dashboardPageSource).toContain('canViewSystemAudit,');
    expect(dashboardPageSource).toContain('canViewUserActivity,');
    expect(dashboardPageSource).toContain('canViewSensitiveAuditDetails,');
    expect(dashboardPageSource).toContain('userId: userData?.id ?? null');
    expect(dashboardPageSource).toMatch(
      /dashboardSnapshot\?\.scope === dashboardAccessScope/,
    );
    expect(dashboardPageSource).toContain('scope: requestScope');
  });

  it('enforces dedicated permissions and redaction in the API', () => {
    expect(dashboardRouteSource).toContain('PERMISSIONS.USERS.VIEW_SECURITY');
    expect(dashboardRouteSource).toContain('PERMISSIONS.USERS.VIEW_ACTIVITY');
    expect(dashboardRouteSource).toContain('PERMISSIONS.SYSTEM.AUDIT');
    expect(dashboardRouteSource).toContain('AuditEventKind.ACTIVITY');
    expect(dashboardRouteSource).toContain('actorDisplayNameSnapshot');
    expect(dashboardRouteSource).toContain('getVisibleAuditDescription');
  });
});
