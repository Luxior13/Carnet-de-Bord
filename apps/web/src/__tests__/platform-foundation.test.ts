import { readFileSync } from 'node:fs';

import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  getSystemSettingDefinition,
  isSystemSettingKey,
  SYSTEM_SETTING_CATALOG,
} from '$constants/system-setting-catalog.constants';
import { isSystemSettingLocallyCacheable } from '$server/system-settings';

describe('platform foundation without a persistent worker', () => {
  it('keeps only settings backed by an active runtime capability', () => {
    expect(Object.keys(SYSTEM_SETTING_CATALOG)).toEqual([
      'audit.retentionDays',
      'notifications.retentionDays',
      'ui.defaultPageSize',
    ]);
    expect(isSystemSettingKey('jobs.retentionDays')).toBe(false);
    expect(getSystemSettingDefinition('audit.retentionDays').defaultValue).toBe(
      1_095,
    );
  });

  it('never caches destructive retention values locally', () => {
    expect(isSystemSettingLocallyCacheable('audit.retentionDays')).toBe(false);
    expect(isSystemSettingLocallyCacheable('notifications.retentionDays')).toBe(
      false,
    );
    expect(isSystemSettingLocallyCacheable('ui.defaultPageSize')).toBe(true);
  });

  it('uses a one-shot maintenance command and no durable queue', () => {
    const source = readFileSync(
      new URL('../../scripts/run-maintenance.ts', import.meta.url),
      'utf8',
    );

    expect(source).toContain('purge_expired_audit_logs');
    expect(source).toContain('notification.deleteMany');
    expect(source).not.toContain('backgroundJob');
    expect(source).not.toContain('while (');
  });
});
