import { UserRole } from '@repo/shared';
import { describe, expect, it } from 'vitest';

import { PERMISSIONS } from '$constants/permissions.constants';
import {
  canSearchUserContact,
  formatUserLastLogin,
  getUsersListVisibilityKey,
} from '$features/users/users-list.utils';

describe('users list presentation boundaries', () => {
  const now = new Date('2026-09-26T12:00:00Z');
  const viewer = {
    id: 'viewer',
    isProtected: false,
    permissions: { [PERMISSIONS.USERS.VIEW]: true },
    role: UserRole.USER,
  };

  it('distinguishes a masked connection from an account that never connected', () => {
    expect(
      formatUserLastLogin(
        { identityDetailsVisible: false, lastLoginAt: null },
        now,
      ),
    ).toBe('Masquée');
    expect(formatUserLastLogin({ lastLoginAt: null }, now)).toBe('Jamais');
    expect(formatUserLastLogin({ lastLoginAt: 'invalid' }, now)).toBe(
      'Indisponible',
    );
  });

  it.each([
    ['2026-09-26T11:59:45Z', "À l'instant"],
    ['2026-09-26T11:58:00Z', 'Il y a 2 min'],
    ['2026-09-26T10:00:00Z', 'Il y a 2 h'],
    ['2026-09-22T12:00:00Z', 'Il y a 4 j'],
  ])('keeps recent connections compact (%s)', (lastLoginAt, expected) => {
    expect(formatUserLastLogin({ lastLoginAt }, now)).toBe(expected);
  });

  it('includes the year for old connections and across a year boundary', () => {
    expect(
      formatUserLastLogin({ lastLoginAt: '2024-06-15T12:00:00Z' }, now),
    ).toContain('2024');
    expect(
      formatUserLastLogin(
        { lastLoginAt: '2025-12-31T12:00:00Z' },
        new Date('2026-01-02T12:00:00Z'),
      ),
    ).toContain('2025');
  });

  it('invalidates retained results when identity or field permissions change', () => {
    const originalKey = getUsersListVisibilityKey(viewer);
    expect(getUsersListVisibilityKey({ ...viewer })).toBe(originalKey);
    expect(
      getUsersListVisibilityKey({ ...viewer, id: 'another-viewer' }),
    ).not.toBe(originalKey);
    expect(
      getUsersListVisibilityKey({ ...viewer, isProtected: true }),
    ).not.toBe(originalKey);
    for (const permission of [
      PERMISSIONS.USERS.VIEW_CONTACT,
      PERMISSIONS.USERS.VIEW_SECURITY,
    ]) {
      expect(
        getUsersListVisibilityKey({
          ...viewer,
          permissions: { ...viewer.permissions, [permission]: true },
        }),
      ).not.toBe(originalKey);
    }
  });

  it('only advertises contact search to a viewer allowed to read it', () => {
    expect(canSearchUserContact(viewer)).toBe(false);
    expect(canSearchUserContact({ ...viewer, isProtected: true })).toBe(true);
    expect(
      canSearchUserContact({
        ...viewer,
        permissions: {
          ...viewer.permissions,
          [PERMISSIONS.USERS.VIEW_CONTACT]: true,
        },
      }),
    ).toBe(true);
  });
});
