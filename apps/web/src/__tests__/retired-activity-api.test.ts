import { existsSync, readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { normalizeUserDetailSection } from '$components/users/user-detail/UserDetailNavigation';
import {
  getAllPermissionKeys,
  hasPermission,
  isPermissionGrantable,
} from '$constants/permissions.constants';

// Test-owned paths only; no URL receives external input.
const sourceUrl = (path: string): URL => new URL(path, import.meta.url);

describe('retired activity surfaces', () => {
  // The 410 placeholder was removed on 25 October 2026 (REV-17): the path is
  // now an ordinary unknown API route.
  it('no longer ships the account activity endpoint', () => {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    expect(existsSync(sourceUrl('../app/api/users/[id]/audit/route.ts'))).toBe(
      false,
    );
  });

  it.each([
    'users:view_activity',
    'users:export_activity',
    'account:view_activity',
  ])('never grants retired %s, even through old overrides', (key) => {
    expect(getAllPermissionKeys()).not.toContain(key);
    expect(isPermissionGrantable(key)).toBe(false);
    expect(hasPermission('ADMIN', key, { [key]: true })).toBe(false);
    expect(hasPermission('USER', key, { [key]: true })).toBe(false);
  });

  it('keeps the retired activity section out of the user record', () => {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const userDetailSource = readFileSync(
      sourceUrl('../components/users/UserDetailPage.tsx'),
      'utf8',
    );
    for (const retired of [
      '../components/users/user-detail/UserHistoryTab.tsx',
      '../components/users/user-detail/useUserDetailAudit.ts',
    ]) {
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      expect(existsSync(sourceUrl(retired))).toBe(false);
    }
    // The record links to the journal page, never to an account audit API.
    expect(userDetailSource).not.toMatch(/\/api\/users\/[^'"`]*audit/u);
    expect(normalizeUserDetailSection('history')).toBe('profile');
  });
});
