'use client';

import { Avatar, Style } from '@dicebear/core';
import voxelBotDefinition from '@dicebear/styles/voxel-bot.json';
import React, { type FC } from 'react';

import type { UserType } from '$types/auth.types';
import { DiceBearAvatar } from '$ui/dicebear-avatar';
import { cn } from '$utils/css.utils';

type AvatarUser = Pick<UserType, 'firstName' | 'id' | 'lastName' | 'loginName'>;

type UserAvatarProps = {
  className?: string;
  user: AvatarUser;
};

const ACCOUNT_BACKGROUND_COLORS = [
  'b9a7e8',
  'a8b6e8',
  'c3a5dd',
  '9eafe0',
  'c9b4e8',
];

const VOXEL_BOT_STYLE = new Style(voxelBotDefinition);

const createAccountAvatarDataUri = (seed: string): string =>
  new Avatar(VOXEL_BOT_STYLE, {
    backgroundColor: ACCOUNT_BACKGROUND_COLORS,
    borderRadius: 0,
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
      className={cn('bg-nav-system text-nav-system-foreground', className)}
      createDataUri={createAccountAvatarDataUri}
      fallback={initials}
      label={`Avatar de ${displayName}`}
      seed={user.id}
    />
  );
};
