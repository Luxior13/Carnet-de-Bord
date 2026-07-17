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
  });
});
