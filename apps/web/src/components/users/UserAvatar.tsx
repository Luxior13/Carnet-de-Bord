'use client';

import { createAvatar } from '@dicebear/core';
import * as notionistsNeutral from '@dicebear/notionists-neutral';
import React, { type FC, useMemo } from 'react';

import type { UserType } from '$types/auth.types';
import { cn } from '$utils/css.utils';

type AvatarUser = Pick<UserType, 'email' | 'firstName' | 'lastName'>;

type UserAvatarProps = {
  className?: string;
  user: AvatarUser;
};

const DICEBEAR_BACKGROUND_COLORS = [
  'dbeafe',
  'e0f2fe',
  'e2e8f0',
  'bfdbfe',
  'cbd5e1',
];

function getDisplayName(user: AvatarUser): string {
  return `${user.firstName} ${user.lastName}`.trim() || user.email;
}

function getAvatarInitials(user: AvatarUser): string {
  const firstInitial = user.firstName.trim().charAt(0);
  const lastInitial = user.lastName.trim().charAt(0);

  return `${firstInitial}${lastInitial}`.toUpperCase() || '?';
}

function getDiceBearAvatarDataUri(user: AvatarUser): string {
  const seed = user.firstName.trim() || user.email || getDisplayName(user);

  return createAvatar(notionistsNeutral, {
    backgroundColor: DICEBEAR_BACKGROUND_COLORS,
    radius: 12,
    seed,
    size: 96,
  }).toDataUri();
}

export const UserAvatar: FC<UserAvatarProps> = ({ className, user }) => {
  const { email, firstName, lastName } = user;
  const displayName = getDisplayName(user);
  const initials = getAvatarInitials(user);
  const avatarDataUri = useMemo(
    () => getDiceBearAvatarDataUri({ email, firstName, lastName }),
    [email, firstName, lastName],
  );

  return (
    <span
      role="img"
      aria-label={`Avatar de ${displayName}`}
      className={cn(
        'bg-sidebar-primary text-sidebar-primary-foreground relative flex shrink-0 items-center justify-center overflow-hidden shadow-sm',
        className,
      )}
    >
      <span aria-hidden="true" className="text-xs font-semibold">
        {initials}
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={avatarDataUri}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 size-full object-cover"
        draggable={false}
        onError={(event) => {
          event.currentTarget.style.display = 'none';
        }}
      />
    </span>
  );
};
