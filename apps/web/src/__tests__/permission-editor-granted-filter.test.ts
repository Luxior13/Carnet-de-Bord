import { UserRole } from '@repo/shared';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import {
  buildGrantedFilterView,
  PERMISSION_EDITOR_CATEGORIES,
} from '$components/users/permission-editor-view';
import { PermissionsEditor } from '$components/users/PermissionsEditor';

const grantedOf =
  (...keys: string[]) =>
  (key: string): boolean =>
    keys.includes(key);

const otherPage = PERMISSION_EDITOR_CATEGORIES.find(
  (category) => category.key !== 'persons',
);

describe('« Accordées » filter of the permissions editor (30 October 2026)', () => {
  it('keeps a permission the draft just switched off, without a count that would contradict the rows', () => {
    const view = buildGrantedFilterView({
      changedKeys: new Set(['persons:update']),
      grantedOnly: true,
      isGranted: grantedOf('persons:view'),
      requestedKey: 'persons',
    });

    expect(view.isListed('persons:update')).toBe(true);
    expect(view.isListed('persons:create')).toBe(false);
    expect(view.chipCount).toBeNull();
    expect(view.nothingListed).toBe(false);
    expect(view.requestedHidden).toBe(false);
    expect(view.selectedCategory?.key).toBe('persons');
  });

  it('counts the granted permissions when they are exactly the rows shown', () => {
    const view = buildGrantedFilterView({
      changedKeys: new Set(),
      grantedOnly: false,
      isGranted: grantedOf('persons:view', 'persons:update'),
      requestedKey: 'persons',
    });

    expect(view.chipCount).toBe(2);
  });

  it('has nothing to list once nothing is granted nor changed', () => {
    const view = buildGrantedFilterView({
      changedKeys: new Set(),
      grantedOnly: true,
      isGranted: grantedOf(),
      requestedKey: 'persons',
    });

    expect(view.nothingListed).toBe(true);
    expect(view.chipCount).toBe(0);
  });

  it('says when the filter hides the requested page and which one it shows instead', () => {
    if (!otherPage) throw new Error('catalogue');
    const hidden = buildGrantedFilterView({
      changedKeys: new Set(),
      grantedOnly: true,
      isGranted: grantedOf('persons:view'),
      requestedKey: otherPage.key,
    });

    expect(hidden.requestedHidden).toBe(true);
    expect(hidden.selectedCategory?.key).toBe('persons');
    // « Toutes » never hides a page.
    expect(
      buildGrantedFilterView({
        changedKeys: new Set(),
        grantedOnly: false,
        isGranted: grantedOf('persons:view'),
        requestedKey: otherPage.key,
      }).requestedHidden,
    ).toBe(false);
  });

  it('marks a page of the phone list only once one has been opened', () => {
    const currentMarks = (openPageOnNarrow: boolean): number =>
      renderToStaticMarkup(
        createElement(PermissionsEditor, {
          onChange: vi.fn(),
          onSelectedPageChange: vi.fn(),
          openPageOnNarrow,
          permissions: { 'persons:view': true },
          role: UserRole.USER,
          selectedPageKey: 'persons',
        }),
      ).split('aria-current="page"').length - 1;

    // The computer menu always marks its page; the phone list only after
    // a page was opened.
    expect(currentMarks(true)).toBe(currentMarks(false) + 1);
  });
});
