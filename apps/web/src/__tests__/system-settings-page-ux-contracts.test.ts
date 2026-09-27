import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  getSystemSettingDefinition,
  type SystemSettingKey,
} from '$constants/system-setting-catalog.constants';
import type { SystemSettingItem } from '$types/platform.types';

import {
  getValidationMessage,
  isSettingDraftChanged,
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
const rowSource = readSourceFile('../features/settings/SystemSettingRow.tsx');
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

  it('compares numeric drafts consistently while protecting invalid input', () => {
    expect(isSettingDraftChanged('025', 25)).toBe(false);
    expect(isSettingDraftChanged('25.0', 25)).toBe(false);
    expect(isSettingDraftChanged('50', 25)).toBe(true);
    expect(isSettingDraftChanged('', 25)).toBe(true);
    expect(isSettingDraftChanged('25.5', 25)).toBe(true);
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
    expect(pageSource).toContain('onClick={requestRefresh}');
    expect(rowSource).toContain('<form');
    expect(rowSource).toContain('required');
    expect(rowSource).toContain('aria-label={`Enregistrer — ');
    expect(navigationGuardSource).toContain("'beforeunload'");
    expect(navigationGuardSource).toContain(
      "document.addEventListener('click'",
    );
    expect(navigationGuardSource).toContain(
      'listen: subscribeToUnsavedHistoryEvents',
    );
  });
});
