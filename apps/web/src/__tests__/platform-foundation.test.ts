import { readFileSync } from 'node:fs';

import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  getSystemSettingDefinition,
  isSystemSettingKey,
  SYSTEM_SETTING_CATALOG,
} from '$constants/system-setting-catalog.constants';
import { prisma } from '$server/prisma';
import { getSystemSettingValue } from '$server/system-settings';

vi.mock('$server/prisma', () => ({
  prisma: { systemSetting: { findUnique: vi.fn() } },
}));

describe('platform foundation without a persistent worker', () => {
  it('keeps only settings backed by an active runtime capability', () => {
    expect(Object.keys(SYSTEM_SETTING_CATALOG)).toEqual([
      'audit.retentionDays',
      'notifications.retentionDays',
    ]);
    expect(isSystemSettingKey('jobs.retentionDays')).toBe(false);
    expect(isSystemSettingKey('ui.defaultPageSize')).toBe(false);
    expect(getSystemSettingDefinition('audit.retentionDays').defaultValue).toBe(
      1_095,
    );
  });

  it.each(['audit.retentionDays', 'notifications.retentionDays'] as const)(
    'reads the latest stored retention value for %s',
    async (key) => {
      const read = vi.mocked(prisma.systemSetting.findUnique);
      read.mockReset();
      read.mockResolvedValueOnce({ value: 365 } as never);
      read.mockResolvedValueOnce({ value: 730 } as never);

      expect(await getSystemSettingValue(key)).toBe(365);
      expect(await getSystemSettingValue(key)).toBe(730);
      expect(read).toHaveBeenCalledTimes(2);
    },
  );

  it('uses a one-shot maintenance command and no durable queue', () => {
    // The URL is a test-owned constant resolved relative to this test file.
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const source = readFileSync(
      new URL('../../scripts/run-maintenance.ts', import.meta.url),
      'utf8',
    );

    expect(source).toContain('purge_expired_audit_logs');
    expect(source).toContain('purgeExpiredNotifications(transaction, now)');
    expect(source).not.toContain('backgroundJob');
    expect(source).not.toContain('while (');
  });
});
