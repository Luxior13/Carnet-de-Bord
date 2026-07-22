'use client';

import { createAvatar } from '@dicebear/core';
import * as notionistsNeutral from '@dicebear/notionists-neutral';
import React, { type FC } from 'react';

import type { UserType } from '$types/auth.types';
import { DiceBearAvatar } from '$ui/dicebear-avatar';

type AvatarUser = Pick<UserType, 'firstName' | 'id' | 'lastName' | 'loginName'>;

type UserAvatarProps = {
  className?: string;
  user: AvatarUser;
};

const ACCOUNT_BACKGROUND_COLORS = [
  'dce7e5',
  'dfe5e8',
  'ced9d8',
  'e2e0d8',
  'd8dde5',
];

const createAccountAvatarDataUri = (seed: string): string =>
  createAvatar(notionistsNeutral, {
    backgroundColor: ACCOUNT_BACKGROUND_COLORS,
    radius: 12,
    seed,
    size: 96,
  }).toDataUri();

function getDisplayName(user: AvatarUser): string {
  return `${user.firstName} ${user.lastName}`.trim() || user.loginName;
}

function getAvatarInitials(user: AvatarUser): string {
  const firstInitial = user.firstName.trim().charAt(0);
  const lastInitial = user.lastName.trim().charAt(0);

  return (
    `${firstInitial}${lastInitial}`.toUpperCase() ||
    user.loginName.slice(0, 2).toUpperCase() ||
    '?'
  );
}

export const UserAvatar: FC<UserAvatarProps> = ({ className, user }) => {
  const displayName = getDisplayName(user);
  const initials = getAvatarInitials(user);

  return (
    <DiceBearAvatar
      className={className}
      createDataUri={createAccountAvatarDataUri}
      fallback={initials}
      label={`Avatar de ${displayName}`}
      seed={user.id}
    />
  );
};
