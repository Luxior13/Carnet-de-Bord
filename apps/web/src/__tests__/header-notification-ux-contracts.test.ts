import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const readSourceFile = (relativePath: string): string => {
  // Test-owned paths only; the helper never receives external input.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
};

const headerSource = readSourceFile('../components/layout/Header.tsx');
const notificationCenterSource = readSourceFile(
  '../components/layout/NotificationCenter.tsx',
);

describe('header notification UX contracts', () => {
  it('mounts the persistent notification center in the shared header', () => {
    expect(headerSource).toContain(
      "import { NotificationCenter } from '$components/layout/NotificationCenter'",
    );
    expect(headerSource).toContain('<NotificationCenter />');
  });

  it('uses a matte header and flat floating surfaces', () => {
    expect(headerSource).toContain('bg-surface-page');
    expect(headerSource).not.toContain('backdrop-blur');
    expect(headerSource).not.toContain('bg-surface-page/95');
    expect(notificationCenterSource).toContain(
      'border-border-default bg-surface-floating',
    );
    expect(notificationCenterSource).toContain('rounded-lg p-0');
    expect(notificationCenterSource).toContain('variant="ghost"');
    expect(notificationCenterSource).toContain(
      "'bg-primary/5 hover:bg-primary/10'",
    );
    expect(notificationCenterSource).not.toContain(
      'bg-surface-panel-raised/85',
    );
  });

  it('hides the bell when the authenticated user cannot view notifications', () => {
    expect(notificationCenterSource).toContain(
      'if (!canViewNotifications) return null;',
    );
    expect(notificationCenterSource).toContain(
      'PERMISSIONS.NOTIFICATIONS.VIEW',
    );
  });

  it('keeps the bell accessible and connected to persistent data', () => {
    expect(notificationCenterSource).toContain("'/api/notifications?limit=10'");
    expect(notificationCenterSource).toContain('Ouvrir les notifications');
    expect(notificationCenterSource).toContain("jsonRequest('PATCH'");
    expect(notificationCenterSource).toContain('[overflow-wrap:anywhere]');
  });

  it('distinguishes initial loading, failure, stale failure and a confirmed empty list', () => {
    expect(notificationCenterSource).toContain('const isInitialLoading =');
    expect(notificationCenterSource).toContain('const hasInitialError =');
    expect(notificationCenterSource).toContain('const hasRefreshError =');
    expect(notificationCenterSource).toContain(
      'const hasLoadedNotifications =',
    );
    expect(notificationCenterSource).toContain('Chargement des notifications');
    expect(notificationCenterSource).toContain('Notifications indisponibles');
    expect(notificationCenterSource).toContain('Réessayer');
    expect(notificationCenterSource).toContain('role="status"');
    expect(notificationCenterSource).toContain('role="alert"');
    expect(notificationCenterSource).toContain(
      ') : hasLoadedNotifications ? (',
    );
  });

  it('refreshes on meaningful re-entry without polling or request spam', () => {
    expect(notificationCenterSource).toContain('open={open}');
    expect(notificationCenterSource).toContain(
      'handlePopoverOpenChange(nextOpen)',
    );
    expect(notificationCenterSource).toContain(
      "document.addEventListener('visibilitychange'",
    );
    expect(notificationCenterSource).toContain(
      'NOTIFICATION_REFRESH_MIN_INTERVAL_MS',
    );
    expect(notificationCenterSource).toContain(
      'lastNotificationRequestAtRef.current',
    );
    expect(notificationCenterSource).toContain(
      'NOTIFICATION_CHANGED_DEBOUNCE_MS',
    );
    expect(notificationCenterSource).not.toContain('setInterval(');
  });

  it('stays usable in constrained viewports and exposes unread state', () => {
    expect(notificationCenterSource).toContain(
      'max-h-[var(--radix-popover-content-available-height)]',
    );
    expect(notificationCenterSource).toContain('unreadNotificationsCount > 99');
    expect(notificationCenterSource).toContain('99+');
    expect(notificationCenterSource).toContain('Non lue');
    expect(notificationCenterSource).toContain('setOpen(false)');
    expect(notificationCenterSource).not.toContain('text-muted-foreground/75');
  });

  it('defers the duplicate header read on the personal inbox until the bell is opened', () => {
    expect(notificationCenterSource).toContain('usePathname()');
    expect(notificationCenterSource).toContain(
      'pathname === NOTIFICATION_INBOX_HREF',
    );
    expect(notificationCenterSource).toContain(
      '(!isNotificationInboxRoute || hasActivatedNotificationResource)',
    );
    expect(notificationCenterSource).toContain(
      'setHasActivatedNotificationResource(true)',
    );
  });
});
