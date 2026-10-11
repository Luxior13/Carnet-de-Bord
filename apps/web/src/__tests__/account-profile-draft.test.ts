import { describe, expect, it } from 'vitest';

import {
  createAccountProfileDraft,
  getAccountScope,
  isAccountFormSnapshot,
  mergeAccountProfileDraft,
} from '$features/account/account.utils';
import type { UserType } from '$types/auth.types';

const user = {
  contactEmail: 'camille@example.test',
  firstName: 'Camille',
  id: 'account-fixture',
  isActive: true,
  lastName: 'Exemple',
  loginName: 'camille',
  mustChangePassword: false,
  permissions: null,
  role: 'USER',
  updatedAt: '2026-10-11T21:00:01.000Z',
} as UserType;

describe('personal profile drafts', () => {
  it('preserves an edited first name but takes an untouched last name from the latest server version', () => {
    const draft = {
      ...createAccountProfileDraft(user),
      firstName: 'Prénom saisi',
    };
    const latest = {
      ...user,
      firstName: 'Prénom serveur',
      lastName: 'Nouveau nom',
      updatedAt: '2026-10-11T21:00:02.000Z',
    };
    const result = mergeAccountProfileDraft(draft, latest);
    expect(result).toEqual({
      base: latest,
      firstName: 'Prénom saisi',
      lastName: 'Nouveau nom',
    });
  });

  it('preserves deliberate removal of an optional name while refreshing an untouched first name', () => {
    const draft = { ...createAccountProfileDraft(user), lastName: '' };
    const latest = {
      ...user,
      firstName: 'Nouveau prénom',
      lastName: 'Nom serveur',
    };
    expect(mergeAccountProfileDraft(draft, latest)).toEqual({
      base: latest,
      firstName: 'Nouveau prénom',
      lastName: '',
    });
  });

  it('does not treat surrounding whitespace as a change that overwrites a new server name', () => {
    const draft = {
      ...createAccountProfileDraft(user),
      firstName: ' Camille ',
      lastName: ' Exemple ',
    };
    const latest = { ...user, firstName: 'Autre prénom', lastName: '' };
    expect(mergeAccountProfileDraft(draft, latest)).toEqual(
      createAccountProfileDraft(latest),
    );
  });

  it('does not apply an older response over a confirmed version and its new draft', () => {
    const latest = { ...user, updatedAt: '2026-10-11T21:00:03.000Z' };
    const draft = {
      ...createAccountProfileDraft(latest),
      firstName: 'Saisie conservée',
    };
    expect(mergeAccountProfileDraft(draft, user)).toBe(draft);
  });

  it('never carries personal drafts to another account', () => {
    const draft = {
      ...createAccountProfileDraft(user),
      firstName: 'Saisie privée',
    };
    const other = { ...user, firstName: 'Autre personne', id: 'other-account' };
    expect(mergeAccountProfileDraft(draft, other)).toEqual(
      createAccountProfileDraft(other),
    );
  });

  it('retains the same authority scope when a refresh only reorders permissions or updates identity', () => {
    expect(
      getAccountScope({
        ...user,
        permissions: {
          'account:update_contact': false,
          'account:update_profile': true,
        },
      }),
    ).toBe(
      getAccountScope({
        ...user,
        firstName: 'Nouveau prénom',
        permissions: {
          'account:update_contact': false,
          'account:update_profile': true,
        },
        updatedAt: '2026-10-11T22:00:00.000Z',
      }),
    );
    expect(getAccountScope({ ...user, permissions: {} })).toBe(
      getAccountScope(user),
    );
  });

  it.each([
    { id: 'other-account' },
    { isProtected: true },
    { mustChangePassword: true },
    { permissions: { 'account:update_contact': false } },
    { role: 'ADMIN' as const },
  ])('invalidates drafts and dialogs when authority changes: %j', (change) => {
    expect(getAccountScope({ ...user, ...change })).not.toBe(
      getAccountScope(user),
    );
  });

  it('rejects a response for another account or without a usable version', () => {
    expect(isAccountFormSnapshot(user, user.id)).toBe(true);
    expect(isAccountFormSnapshot({ ...user, lastName: null }, user.id)).toBe(
      true,
    );
    expect(isAccountFormSnapshot(user, 'other-account')).toBe(false);
    expect(
      isAccountFormSnapshot({ ...user, updatedAt: undefined }, user.id),
    ).toBe(false);
    expect(
      isAccountFormSnapshot({ ...user, updatedAt: 'not-a-date' }, user.id),
    ).toBe(false);
    expect(
      isAccountFormSnapshot({ ...user, firstName: undefined }, user.id),
    ).toBe(false);
    expect(isAccountFormSnapshot({ ...user, contactEmail: 1 }, user.id)).toBe(
      false,
    );
  });
});
