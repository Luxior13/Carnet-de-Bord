import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const readSourceFile = (relativePath: string): string => {
  // Test-owned paths only; the helper never receives external input.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
};

const inboxSource = readSourceFile(
  '../features/notifications/NotificationInboxPage.tsx',
);
const legacyPageSource = readSourceFile(
  '../app/tableau-de-bord/mes-notifications/page.tsx',
);
const notificationConstantsSource = readSourceFile(
  '../shared/constants/notification.constants.ts',
);
const routeSource = readSourceFile('../app/api/notifications/route.ts');
const itemRouteSource = readSourceFile(
  '../app/api/notifications/[id]/route.ts',
);
const navigationSource = readSourceFile('../shared/constants/app.constants.ts');

describe('notification inbox UX contracts', () => {
  it('promotes the personal inbox as a live permission-protected destination', () => {
    expect(navigationSource).toContain("href: '/mes-notifications'");
    expect(navigationSource).toContain('featureId: FEATURES.notifications.id');
    expect(navigationSource).toContain("availability: 'live'");
  });

  it('covers loading, empty, error, refresh and cursor pagination states', () => {
    expect(inboxSource).toContain('<ResourceStateBoundary');
    expect(inboxSource).toContain('<NotificationListSkeleton />');
    expect(inboxSource).toContain('onRetry={() => void resource.refresh()}');
    expect(inboxSource).toContain('pagination?.hasMore');
    expect(inboxSource).toContain('Charger plus');
  });

  it('provides personal read, unread, archive and restore actions', () => {
    expect(inboxSource).toContain(
      "type InboxFilter = 'all' | 'archived' | 'unread'",
    );
    expect(inboxSource).toContain("'archive' | 'read' | 'restore' | 'unread'");
    expect(inboxSource).toContain('Tout marquer comme lu');
    expect(itemRouteSource).toContain(
      "z.enum(['archive', 'read', 'restore', 'unread'])",
    );
  });

  it('keeps every data mutation scoped to the authenticated recipient', () => {
    expect(routeSource).toContain('userId: auth.user.id');
    expect(itemRouteSource).toContain(
      'where: { notificationId: id, userId: auth.user.id }',
    );
    expect(routeSource).toContain("action: z.literal('read_all')");
  });

  it('synchronizes inbox actions with the header bell', () => {
    expect(inboxSource).toContain('notifyNotificationsChanged();');
  });

  it('keeps notification provenance outside the semantic time value', () => {
    expect(inboxSource).toMatch(
      /<time dateTime=\{item\.createdAt\}>[\s\S]*?formatDate\(item\.createdAt\)[\s\S]*?<\/time>/,
    );
    expect(inboxSource).not.toMatch(
      /<time[^>]*>[\s\S]*?Émise par[\s\S]*?<\/time>/,
    );
    expect(inboxSource).toContain('· Émise par {item.source.label}');
  });

  it('keeps the inbox inside the shared private content column', () => {
    expect(inboxSource).toContain('<PageShell className="py-0">');
    expect(inboxSource).not.toContain('width="narrow"');
    expect(inboxSource).not.toContain('width="wide"');
    expect(inboxSource).toContain('[overflow-wrap:anywhere]');
  });

  it('uses a pole-independent canonical URL and redirects the legacy URL', () => {
    expect(notificationConstantsSource).toContain(
      "NOTIFICATION_INBOX_HREF = '/mes-notifications'",
    );
    expect(notificationConstantsSource).toContain(
      "'/tableau-de-bord/mes-notifications' as const",
    );
    expect(legacyPageSource).toContain('permanentRedirect(');
    expect(legacyPageSource).toContain('NOTIFICATION_INBOX_HREF');
  });
});
