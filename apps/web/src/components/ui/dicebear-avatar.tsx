'use client';

import React, { type FC, useMemo } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '$ui/avatar';

type DiceBearAvatarProps = {
  className?: string;
  createDataUri: (seed: string) => string;
  fallback: string;
  label: string;
  seed: string;
};

export const DiceBearAvatar: FC<DiceBearAvatarProps> = ({
  className,
  createDataUri,
  fallback,
  label,
  seed,
}) => {
  const avatarDataUri = useMemo(
    () => createDataUri(seed),
    [createDataUri, seed],
  );

  return (
    <Avatar aria-label={label} className={className} role="img">
      <AvatarImage
        alt=""
        aria-hidden="true"
        className="object-cover"
        draggable={false}
        src={avatarDataUri}
      />
      <AvatarFallback aria-hidden="true">{fallback || '?'}</AvatarFallback>
    </Avatar>
  );
};
