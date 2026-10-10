'use client';

import { type SetStateAction, useCallback, useState } from 'react';

import type { PermissionsData } from '$constants/permissions.constants';
import type { UserType } from '$types/auth.types';

import {
  createUserDetailDraft,
  receiveUserDetail,
  type SubmittedUserDraft,
  type UserDetailForm,
} from './user-detail-draft';

type UserDetailDraftController = {
  editForm: UserDetailForm;
  permissions: PermissionsData | null;
  setEditForm: (update: SetStateAction<UserDetailForm>) => void;
  setPermissions: (update: SetStateAction<PermissionsData | null>) => void;
  syncUserState: (user: UserType, submitted?: SubmittedUserDraft) => void;
  user: UserType | null;
};

export const useUserDetailDraft = (
  initialUser?: UserType,
): UserDetailDraftController => {
  const [state, setState] = useState(() => createUserDetailDraft(initialUser));
  const setEditForm = useCallback(
    (update: SetStateAction<UserDetailForm>): void => {
      setState((current) => ({
        ...current,
        form: typeof update === 'function' ? update(current.form) : update,
      }));
    },
    [],
  );
  const setPermissions = useCallback(
    (update: SetStateAction<PermissionsData | null>): void => {
      setState((current) => ({
        ...current,
        permissions:
          typeof update === 'function' ? update(current.permissions) : update,
      }));
    },
    [],
  );
  const syncUserState = useCallback(
    (user: UserType, submitted?: SubmittedUserDraft): void => {
      setState((current) => receiveUserDetail(current, user, submitted));
    },
    [],
  );

  return {
    editForm: state.form,
    permissions: state.permissions,
    setEditForm,
    setPermissions,
    syncUserState,
    user: state.user,
  };
};
