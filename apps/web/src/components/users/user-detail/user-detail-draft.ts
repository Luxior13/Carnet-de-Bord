import type { PermissionsData } from '$constants/permissions.constants';
import {
  createUserSchema,
  getCreationFieldErrors,
} from '$features/users/create-user.schema';
import type { UserType } from '$types/auth.types';

import {
  ACCESS_PERMISSION_KEYS,
  ACCOUNT_PERMISSION_KEYS,
  resetPermissionOverridesForKeys,
} from './user-detail-page.helpers';

export type UserDetailForm = {
  contactEmail: string;
  firstName: string;
  isActive: boolean;
  lastName: string;
  loginName: string;
  role: UserType['role'];
};
export type UserDetailDraft = {
  form: UserDetailForm;
  permissions: PermissionsData | null;
  user: UserType | null;
};
export type SubmittedUserDraft = {
  form: UserDetailForm;
  permissions: PermissionsData | null;
  section: 'profile' | 'access' | 'account' | 'security';
};

export const userProfileSchema = createUserSchema.omit({ role: true });
export const getProfileFieldErrors = (
  details?: Record<string, string[]>,
): Record<
  'contactEmail' | 'firstName' | 'lastName' | 'loginName',
  string | null
> => {
  const errors = getCreationFieldErrors(details);

  return {
    contactEmail: errors.contactEmail ?? null,
    firstName: errors.firstName ?? null,
    lastName: errors.lastName ?? null,
    loginName: errors.loginName ?? null,
  };
};

export const createUserDetailDraft = (
  user?: UserType | null,
): UserDetailDraft => ({
  form: {
    contactEmail: user?.contactEmail ?? '',
    firstName: user?.firstName ?? '',
    isActive: user?.isActive ?? true,
    lastName: user?.lastName ?? '',
    loginName: user?.loginName ?? '',
    role: user?.role ?? 'USER',
  },
  permissions: user?.permissions ?? null,
  user: user ?? null,
});

/**
 * Cancel one section: its fields go back to the saved user, other sections
 * keep their draft. Without a saved user the draft is left unchanged.
 */
export const restoreUserDetailSection = (
  current: UserDetailDraft,
  section: SubmittedUserDraft['section'],
): UserDetailDraft => {
  const user = current.user;
  if (!user) return current;
  if (section === 'profile')
    return {
      ...current,
      form: {
        ...current.form,
        contactEmail: user.contactEmail ?? '',
        firstName: user.firstName,
        lastName: user.lastName,
        loginName: user.loginName,
      },
    };
  if (section === 'security')
    return { ...current, form: { ...current.form, isActive: user.isActive } };

  return {
    ...current,
    form:
      section === 'access'
        ? { ...current.form, role: user.role }
        : current.form,
    permissions: resetPermissionOverridesForKeys(
      current.permissions,
      user.permissions,
      section === 'access' ? ACCESS_PERMISSION_KEYS : ACCOUNT_PERMISSION_KEYS,
    ),
  };
};

/** Merge a server response against the last displayed version (or the submitted
 * values for the saved section). Later input and other dirty sections survive. */
export const receiveUserDetail = (
  current: UserDetailDraft,
  user: UserType,
  submitted?: SubmittedUserDraft,
): UserDetailDraft => {
  if (!current.user || current.user.id !== user.id)
    return createUserDetailDraft(user);
  // A background read may finish after a newer mutation response. Never move
  // the saved version backwards or replace its fields with that older read.
  if (
    user.updatedAt &&
    current.user.updatedAt &&
    new Date(user.updatedAt).getTime() <
      new Date(current.user.updatedAt).getTime()
  )
    return current;
  const next = createUserDetailDraft(user);
  const baseline = createUserDetailDraft(current.user);
  const profileBase =
    submitted?.section === 'profile' ? submitted.form : baseline.form;
  const securityBase =
    submitted?.section === 'security' ? submitted.form : baseline.form;
  const accessBase =
    submitted?.section === 'access' ? submitted.form : baseline.form;
  next.form = {
    contactEmail:
      current.form.contactEmail === profileBase.contactEmail
        ? next.form.contactEmail
        : current.form.contactEmail,
    firstName:
      current.form.firstName === profileBase.firstName
        ? next.form.firstName
        : current.form.firstName,
    isActive:
      current.form.isActive === securityBase.isActive
        ? next.form.isActive
        : current.form.isActive,
    lastName:
      current.form.lastName === profileBase.lastName
        ? next.form.lastName
        : current.form.lastName,
    loginName:
      current.form.loginName === profileBase.loginName
        ? next.form.loginName
        : current.form.loginName,
    role:
      current.form.role === accessBase.role
        ? next.form.role
        : current.form.role,
  };
  const oldPermissions = new Map(
    Object.entries(current.user.permissions ?? {}),
  );
  const currentPermissions = new Map(Object.entries(current.permissions ?? {}));
  const submittedPermissions = new Map(
    Object.entries(submitted?.permissions ?? {}),
  );
  const result = new Map(Object.entries(user.permissions ?? {}));
  const savedKeys = new Set(
    submitted?.section === 'access'
      ? ACCESS_PERMISSION_KEYS
      : submitted?.section === 'account'
        ? ACCOUNT_PERMISSION_KEYS
        : [],
  );
  for (const key of new Set([
    ...oldPermissions.keys(),
    ...currentPermissions.keys(),
    ...submittedPermissions.keys(),
  ])) {
    const base = savedKeys.has(key)
      ? submittedPermissions.get(key)
      : oldPermissions.get(key);
    const local = currentPermissions.get(key);
    if (local === base) continue;
    if (local === undefined) result.delete(key);
    else result.set(key, local);
  }
  next.permissions = result.size ? Object.fromEntries(result) : null;

  return next;
};
