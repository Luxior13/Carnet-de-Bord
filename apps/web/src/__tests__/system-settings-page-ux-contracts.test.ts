import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  getSystemSettingDefinition,
  type SystemSettingKey,
} from '$constants/system-setting-catalog.constants';
import type { SystemSettingItem } from '$types/platform.types';

import {
  getValidationMessage,
  normalizeSetting,
  normalizeSettings,
  SYSTEM_SETTING_KEYS,
} from '../features/settings/system-settings-page.helpers';

const readSourceFile = (relativePath: string): string => {
  // Test-owned paths only; no external input reaches the filesystem call.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
};

const pageSource = readSourceFile(
  '../features/settings/SystemSettingsPage.tsx',
);
const navigationGuardSource = readSourceFile(
  '../shared/hooks/useUnsavedNavigationGuard.ts',
);

const buildSetting = (key: SystemSettingKey): SystemSettingItem => ({
  description: getSystemSettingDefinition(key).description,
  key,
  updatedAt: new Date(0).toISOString(),
  value: getSystemSettingDefinition(key).defaultValue,
  version: 0,
});

describe('system settings page contracts', () => {
  it('renders the complete reviewed catalog in deliberate UI order', () => {
    expect(SYSTEM_SETTING_KEYS).toEqual([
      'ui.defaultPageSize',
      'notifications.retentionDays',
      'audit.retentionDays',
    ]);
    expect(normalizeSettings(SYSTEM_SETTING_KEYS.map(buildSetting)).size).toBe(
      3,
    );
  });

  it('rejects incomplete, mismatched or damaged API data before rendering it', () => {
    expect(() => normalizeSettings([])).toThrow(
      'Catalogue de paramètres incomplet',
    );
    expect(() =>
      normalizeSetting(
        {
          ...buildSetting('notifications.retentionDays'),
          key: 'notifications.retentionDays',
        },
        'ui.defaultPageSize',
      ),
    ).toThrow('Catalogue de paramètres incomplet');
    expect(() =>
      normalizeSetting(
        {
          ...buildSetting('ui.defaultPageSize'),
          updatedAt: 'not-a-date',
          version: 1,
        },
        'ui.defaultPageSize',
      ),
    ).toThrow('Catalogue de paramètres incomplet');
  });

  it('validates integer values and the reviewed bounds locally', () => {
    expect(getValidationMessage('ui.defaultPageSize', '')).toBe(
      'Saisissez un nombre entier.',
    );
    expect(getValidationMessage('ui.defaultPageSize', '10.5')).toBe(
      'Saisissez un nombre entier.',
    );
    expect(getValidationMessage('ui.defaultPageSize', '9')).toContain(
      'entre 10 et 100',
    );
    expect(getValidationMessage('ui.defaultPageSize', '25')).toBeNull();
  });

  it('keeps destructive reductions explicit and password-only', () => {
    expect(pageSource).toContain('Réduire la durée de conservation ?');
    expect(pageSource).toContain('proofKind="password"');
    expect(pageSource).toContain(
      'ErrorCode.PASSWORD_REAUTHENTICATION_REQUIRED',
    );
    expect(pageSource).not.toContain('proofKind="mfa"');
    expect(pageSource).toContain(
      'bg-warning text-warning-foreground hover:bg-warning/90',
    );
  });

  it('protects drafts and exposes loading, refresh and accessible action states', () => {
    expect(pageSource).toContain('hasUnsavedChanges');
    expect(pageSource).toContain('Abandonner les modifications ?');
    expect(pageSource).toContain('Actualisation impossible');
    expect(pageSource).toContain('const reloaded = await loadSettings()');
    expect(pageSource).toContain('onClick={requestRefresh}');
    expect(pageSource).toContain('aria-labelledby={titleId}');
    expect(pageSource).toContain('role="group"');
    expect(pageSource).toContain('required');
    expect(pageSource).toContain('aria-label={`Enregistrer — ');
    expect(pageSource).toContain('actionsDisabled');
    expect(navigationGuardSource).toContain("'beforeunload'");
    expect(navigationGuardSource).toContain(
      "document.addEventListener('click'",
    );
    expect(navigationGuardSource).toContain(
      "window.addEventListener('popstate', handlePopState, true)",
    );
  });
});
