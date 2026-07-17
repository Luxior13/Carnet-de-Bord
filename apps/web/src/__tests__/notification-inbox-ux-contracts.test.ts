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
const routeSource = readSourceFile('../app/api/notifications/route.ts');
const itemRouteSource = readSourceFile(
  '../app/api/notifications/[id]/route.ts',
);
const navigationSource = readSourceFile('../shared/constants/app.constants.ts');

describe('notification inbox UX contracts', () => {
  it('promotes the personal inbox as a live permission-protected destination', () => {
    expect(navigationSource).toContain(
      "href: '/tableau-de-bord/mes-notifications'",
    );
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
});
