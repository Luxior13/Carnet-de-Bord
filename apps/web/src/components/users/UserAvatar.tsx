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
  'dce7e5',
  'dfe5e8',
  'ced9d8',
  'e2e0d8',
  'd8dde5',
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
  // Use stable account identity rather than only the first name so two users
  // named alike do not receive the same generated avatar.
  const seed = user.email.trim().toLowerCase() || getDisplayName(user);

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
        'bg-sidebar-primary text-sidebar-primary-foreground relative flex shrink-0 items-center justify-center overflow-hidden shadow-none',
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
