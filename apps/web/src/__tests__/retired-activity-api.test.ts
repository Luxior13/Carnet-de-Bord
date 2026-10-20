import { existsSync, readFileSync } from 'node:fs';

import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

const database = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('$server/prisma', () => ({
  prisma: { auditLog: { findMany: database.read } },
}));

import { GET } from '$app/api/users/[id]/audit/route';
import {
  getAllPermissionKeys,
  hasPermission,
  isPermissionGrantable,
} from '$constants/permissions.constants';
import { normalizeUserDetailSection } from '$components/users/user-detail/UserDetailNavigation';

// Test-owned paths only; no URL receives external input.
const sourceUrl = (path: string): URL => new URL(path, import.meta.url);

describe('retired activity surfaces', () => {
  it.each(['', '?format=csv', '?page=2', '?cursor=untrusted'])(
    'returns no account data for %s',
    async (query) => {
      const response = await GET(
        new NextRequest('http://localhost/api/users/any/audit' + query),
        { params: Promise.resolve({ id: 'any' }) },
      );
      expect(response.status).toBe(410);
      expect(response.headers.get('cache-control')).toContain('no-store');
      expect(await response.json()).not.toHaveProperty('data');
      expect(database.read).not.toHaveBeenCalled();
    },
  );
  it.each([
    'users:view_activity',
    'users:export_activity',
    'audit:view',
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
    expect(userDetailSource).not.toContain('/audit');
    expect(normalizeUserDetailSection('history')).toBe('profile');
  });
});
