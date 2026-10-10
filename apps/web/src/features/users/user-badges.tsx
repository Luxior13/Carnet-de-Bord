import { UserRole } from '@repo/shared';
import React, { type FC } from 'react';

import { getAccessLabel } from '$constants/permissions.constants';
import type { UserType } from '$types/auth.types';
import { cn } from '$utils/css.utils';

const ACCESS_LEVEL_TONES = {
  admin: 'border-warning/40 bg-warning/15 text-warning',
  protected: 'border-destructive/40 bg-destructive/15 text-destructive',
  user: 'border-info/40 bg-info/15 text-info',
} as const;

const getAccessToneClass = (
  user: Pick<UserType, 'isProtected' | 'role'>,
): string =>
  user.isProtected
    ? ACCESS_LEVEL_TONES.protected
    : user.role === UserRole.ADMIN
      ? ACCESS_LEVEL_TONES.admin
      : ACCESS_LEVEL_TONES.user;

export const UserAccessBadge: FC<{
  user: Pick<UserType, 'isProtected' | 'role'>;
}> = ({ user }) => (
  <span
    className={cn(
      'inline-flex w-fit shrink-0 items-center gap-1.5 rounded-[5px] border px-2 py-0.5 text-xs leading-5 font-medium whitespace-nowrap',
      getAccessToneClass(user),
    )}
  >
    <span
      aria-hidden="true"
      className="size-1.5 shrink-0 rounded-full bg-current"
    />
    {getAccessLabel(user)}
  </span>
);

export const UserStatusBadge: FC<{ isActive: boolean }> = ({ isActive }) => (
  <span
    className={cn(
      'inline-flex w-fit shrink-0 items-center gap-1.5 rounded-[5px] border px-2 py-0.5 text-xs leading-5 font-medium whitespace-nowrap',
      isActive
        ? 'border-success/40 bg-success/15 text-success'
        : 'border-warning/40 bg-warning/15 text-warning',
    )}
  >
    <span
      aria-hidden="true"
      className={cn('size-1.5 shrink-0 rounded-full', 'bg-current')}
    />
    {isActive ? 'Actif' : 'Désactivé'}
  </span>
);
