import { UserRole } from '@repo/shared';
import { describe, expect, it } from 'vitest';

import {
  buildPermissionEditorState,
  countCategoryPermissionResults,
  getMissingPermissionDependencies,
  PERMISSION_EDITOR_CATEGORIES,
} from '$components/users/permission-editor-view';
import {
  getPermissionItem,
  PERMISSION_CATEGORIES,
  type PermissionItem,
} from '$constants/permissions.constants';

const contactPermission = (): PermissionItem => {
  const permission = getPermissionItem('users:update_contact');
  if (!permission) throw new Error('Missing contact permission fixture');

  return permission;
};

describe('permission editor configured and effective access', () => {
  it('keeps an allowed choice visible when a missing page dependency blocks access', () => {
    const state = buildPermissionEditorState(UserRole.USER, {
      'users:update_contact': true,
    });
    expect(state.configured.get('users:update_contact')).toBe(true);
    expect(state.effective.get('users:update_contact')).toBe(false);
    expect(
      getMissingPermissionDependencies(
        contactPermission(),
        state.configured,
        state.effective,
      ),
    ).toEqual(expect.arrayContaining(['users:view', 'users:view_contact']));
  });
  it('counts configured but unusable grants separately from ready permissions', () => {
    const category = PERMISSION_CATEGORIES.find(
      (item) => item.accessPermissionKey === 'users:view',
    );
    if (!category) throw new Error('Missing users category fixture');
    const state = buildPermissionEditorState(
      UserRole.USER,
      Object.fromEntries(
        category.permissions
          .filter((item) => item.key !== 'users:view')
          .map((item) => [item.key, true]),
      ),
    );
    const result = countCategoryPermissionResults(
      category,
      state.configured,
      state.effective,
    );
    expect(result.ready).toBe(0);
    expect(result.incomplete).toBe(category.permissions.length - 1);
    expect(result.enabled).toBe(result.incomplete);
  });
  it('does not warn about missing dependencies of deliberately refused actions', () => {
    const state = buildPermissionEditorState(UserRole.USER, null);
    expect(
      getMissingPermissionDependencies(
        contactPermission(),
        state.configured,
        state.effective,
      ),
    ).toEqual([]);
  });
  it('recognizes usable permissions once the whole prerequisite chain is allowed', () => {
    const state = buildPermissionEditorState(UserRole.USER, {
      'users:update_contact': true,
      'users:view': true,
      'users:view_contact': true,
    });
    expect(state.effective.get('users:update_contact')).toBe(true);
    expect(
      getMissingPermissionDependencies(
        contactPermission(),
        state.configured,
        state.effective,
      ),
    ).toEqual([]);
  });
  it('ignores invalid overrides for role-bound and essential permissions', () => {
    const state = buildPermissionEditorState(UserRole.USER, {
      'account:view_profile': false,
      'settings:view': true,
    });
    expect(state.configured.get('settings:view')).toBe(false);
    expect(state.configured.get('account:view_profile')).toBe(true);
    expect(state.effective.get('account:view_profile')).toBe(true);
  });
  it('offers live pages without counting future modules or transverse rights as pages', () => {
    expect(
      PERMISSION_EDITOR_CATEGORIES.filter(
        (category) => category.scope === 'page',
      ).map((category) => category.key),
    ).toEqual(['persons', 'users', 'system-settings']);
    expect(
      PERMISSION_EDITOR_CATEGORIES.some(
        (category) => category.key === 'internal-news',
      ),
    ).toBe(false);
    expect(
      PERMISSION_EDITOR_CATEGORIES.find(
        (category) => category.key === 'system-activity',
      )?.scope,
    ).toBeUndefined();
  });
  it('keeps contextual provenance independent of global audit access', () => {
    const state = buildPermissionEditorState(UserRole.USER, {
      'audit:view': false,
      'audit:view_field_history': true,
      'persons:view': true,
    });
    expect(state.effective.get('audit:view_field_history')).toBe(true);
    expect(state.effective.has('audit:view')).toBe(false);
  });
  it('does not count provenance without directory access and presents 28 current capabilities', () => {
    const state = buildPermissionEditorState(UserRole.USER, {
      'audit:view_field_history': true,
    });
    expect(state.effective.get('audit:view_field_history')).toBe(false);
    expect(
      PERMISSION_EDITOR_CATEGORIES.flatMap((category) => category.permissions),
    ).toHaveLength(28);
  });
});
