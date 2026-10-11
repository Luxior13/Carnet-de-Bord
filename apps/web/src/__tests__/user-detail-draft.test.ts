import { describe, expect, it } from 'vitest';

import {
  createUserDetailDraft,
  getProfileFieldErrors,
  receiveUserDetail,
  userProfileSchema,
} from '$components/users/user-detail/user-detail-draft';
import { getUserDetailScope } from '$features/users/user-detail-scope';
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
  it('never merges identity or permission drafts into a different target', () => {
    const draft = createUserDetailDraft(user);
    draft.form.firstName = 'Brouillon de la première personne';
    draft.permissions = { 'users:create': true };
    const different = {
      ...user,
      firstName: 'Autre personne',
      id: 'another-target',
      loginName: 'other',
    };
    expect(receiveUserDetail(draft, different)).toEqual(
      createUserDetailDraft(different),
    );
  });
  it('ignores a background snapshot older than the latest confirmed mutation', () => {
    const latest = {
      ...user,
      firstName: 'Identité enregistrée',
      mfaEnabledAt: null,
      updatedAt: '2026-10-11T21:00:02Z',
    };
    const draft = createUserDetailDraft(latest);
    draft.form.lastName = 'Nouvelle saisie';
    const old = {
      ...user,
      mfaEnabledAt: new Date('2026-10-10T12:00:00Z'),
      updatedAt: '2026-10-11T21:00:01Z',
    };
    expect(receiveUserDetail(draft, old)).toBe(draft);
    expect(draft.form.firstName).toBe('Identité enregistrée');
    expect(draft.form.lastName).toBe('Nouvelle saisie');
    expect(draft.user?.mfaEnabledAt).toBeNull();
  });
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

describe('user detail authorization scope', () => {
  it('keeps ordinary profile refreshes and equivalent override ordering in the same scope', () => {
    const actor = {
      ...user,
      permissions: { 'users:view': true, 'users:view_contact': false },
    };
    expect(getUserDetailScope(actor)).toBe(
      getUserDetailScope({
        ...actor,
        firstName: 'Nom actualisé',
        permissions: { 'users:view': true, 'users:view_contact': false },
        updatedAt: '2026-10-11T21:00:00Z',
      } as UserType),
    );
    expect(getUserDetailScope({ ...user, permissions: null })).toBe(
      getUserDetailScope({ ...user, permissions: {} }),
    );
  });

  it('isolates another actor, role, protection level and each permission change', () => {
    const scope = getUserDetailScope(user);
    for (const actor of [
      null,
      { ...user, id: 'another-actor' },
      { ...user, role: 'ADMIN' as const },
      { ...user, isProtected: true },
      { ...user, permissions: { 'users:view_contact': false } },
      { ...user, permissions: { 'users:reset_password': true } },
    ]) {
      expect(getUserDetailScope(actor)).not.toBe(scope);
    }
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
