import { describe, expect, it } from 'vitest';

import {
  createUserDetailDraft,
  getProfileFieldErrors,
  receiveUserDetail,
  userProfileSchema,
} from '$components/users/user-detail/user-detail-draft';
import type { UserType } from '$types/auth.types';

const user = {
  contactEmail: 'camille@example.test',
  firstName: 'Camille',
  id: 'detail-fixture',
  isActive: true,
  lastName: 'Exemple',
  loginName: 'camille',
  permissions: null,
  role: 'USER',
} as UserType;

describe('user detail drafts across server responses', () => {
  it('keeps a pending status change when password reset refreshes the account', () => {
    const draft = createUserDetailDraft(user);
    draft.form.isActive = false;
    const next = receiveUserDetail(draft, {
      ...user,
      mustChangePassword: true,
      updatedAt: '2026-10-10T14:00:00Z',
    });
    expect(next.form.isActive).toBe(false);
    expect(next.user?.isActive).toBe(true);
    expect(next.user?.mustChangePassword).toBe(true);
    expect(next.user?.updatedAt).toBe('2026-10-10T14:00:00Z');
  });
  it('accepts the saved section without discarding another dirty section', () => {
    const draft = createUserDetailDraft(user);
    draft.form.firstName = 'Nouvelle identité';
    draft.form.isActive = false;
    const next = receiveUserDetail(
      draft,
      { ...user, firstName: 'Nouvelle identité' },
      { form: { ...draft.form }, permissions: null, section: 'profile' },
    );
    expect(next.form.firstName).toBe(next.user?.firstName);
    expect(next.form.isActive).toBe(false);
  });
  it('does not replace edits made after the submitted snapshot', () => {
    const draft = createUserDetailDraft(user);
    const submitted = {
      form: { ...draft.form, firstName: 'Première saisie' },
      permissions: null,
      section: 'profile' as const,
    };
    draft.form.firstName = 'Seconde saisie';
    const next = receiveUserDetail(
      draft,
      { ...user, firstName: 'Première saisie' },
      submitted,
    );
    expect(next.form.firstName).toBe('Seconde saisie');
    expect(next.user?.firstName).toBe('Première saisie');
  });
  it('rebases only unchanged fields when another administrator updates the account', () => {
    const draft = createUserDetailDraft(user);
    draft.form.firstName = 'Mon brouillon';
    const next = receiveUserDetail(draft, {
      ...user,
      firstName: 'Autre admin',
      lastName: 'Nom actualisé',
    });
    expect(next.form.firstName).toBe('Mon brouillon');
    expect(next.form.lastName).toBe('Nom actualisé');
  });
  it('keeps permission additions and removals across a background refresh', () => {
    const initial = {
      ...user,
      permissions: { 'account:update_profile': false, 'users:view': true },
    };
    const draft = createUserDetailDraft(initial);
    draft.permissions = { 'users:view': true, 'users:view_contact': true };
    const next = receiveUserDetail(draft, {
      ...initial,
      permissions: { ...initial.permissions, 'users:view_security': true },
    });
    expect(next.permissions).toEqual({
      'users:view': true,
      'users:view_contact': true,
      'users:view_security': true,
    });
  });
  it('resolves a saved account policy while preserving a pending administrative change', () => {
    const draft = createUserDetailDraft(user);
    draft.permissions = { 'account:update_profile': false, 'users:view': true };
    const next = receiveUserDetail(
      draft,
      { ...user, permissions: { 'account:update_profile': false } },
      { form: draft.form, permissions: draft.permissions, section: 'account' },
    );
    expect(next.permissions).toEqual(draft.permissions);
  });
});

describe('profile validation shares the server contact rule', () => {
  it('rejects consecutive dots and preserves per-field errors', () => {
    const validation = userProfileSchema.safeParse({
      contactEmail: 'a..b@example.test',
      firstName: 'Camille',
      lastName: '',
      loginName: 'camille',
    });
    expect(validation.success).toBe(false);
    if (!validation.success)
      expect(
        getProfileFieldErrors(validation.error.flatten().fieldErrors)
          .contactEmail,
      ).toBe('Email invalide');
  });
  it('ignores unknown server field names while keeping the contact message', () => {
    expect(
      getProfileFieldErrors({
        contactEmail: ['Adresse refusée'],
        passwordHash: ['secret'],
      }),
    ).toEqual({
      contactEmail: 'Adresse refusée',
      firstName: null,
      lastName: null,
      loginName: null,
    });
  });
});
