'use client';

import { Avatar, Style } from '@dicebear/core';
import voxelBotDefinition from '@dicebear/styles/voxel-bot.json';
import { UserRole } from '@repo/shared';
import React, { type FC } from 'react';

import type { UserType } from '$types/auth.types';
import { DiceBearAvatar } from '$ui/dicebear-avatar';
import { cn } from '$utils/css.utils';

type AvatarUser = Pick<
  UserType,
  'firstName' | 'id' | 'isProtected' | 'lastName' | 'loginName' | 'role'
>;

type UserAvatarProps = {
  className?: string;
  user: AvatarUser;
};

const VOXEL_BOT_STYLE = new Style(voxelBotDefinition);

const createAccountAvatarDataUri = (seed: string): string =>
  new Avatar(VOXEL_BOT_STYLE, {
    // Keep the seeded robot intact; the access colour belongs to its container.
    backgroundColor: ['00000000'],
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
  const accessBackground = user.isProtected
    ? 'bg-destructive'
    : user.role === UserRole.ADMIN
      ? 'bg-warning'
      : 'bg-info';

  return (
    <DiceBearAvatar
      className={cn(
        'text-surface-canvas [&_[data-slot=avatar-fallback]]:bg-transparent [&_[data-slot=avatar-fallback]]:text-inherit',
        accessBackground,
        className,
      )}
      createDataUri={createAccountAvatarDataUri}
      fallback={initials}
      label={`Avatar de ${displayName}`}
      seed={user.id}
    />
  );
};
