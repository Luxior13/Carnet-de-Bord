import { UserRole } from '@repo/shared';
import React, { type FC } from 'react';

import { getAccessLabel } from '$constants/permissions.constants';
import type { UserType } from '$types/auth.types';
import { StatusBadge, type StatusBadgeTone } from '$ui/status-badge';

const getAccessTone = (
  user: Pick<UserType, 'isProtected' | 'role'>,
): StatusBadgeTone =>
  user.isProtected
    ? 'danger'
    : user.role === UserRole.ADMIN
      ? 'warning'
      : 'info';

export const UserAccessBadge: FC<{
  user: Pick<UserType, 'isProtected' | 'role'>;
}> = ({ user }) => (
  <StatusBadge tone={getAccessTone(user)}>{getAccessLabel(user)}</StatusBadge>
);

export const UserStatusBadge: FC<{ isActive: boolean }> = ({ isActive }) => (
  <StatusBadge tone={isActive ? 'success' : 'warning'}>
    {isActive ? 'Actif' : 'Désactivé'}
  </StatusBadge>
);
