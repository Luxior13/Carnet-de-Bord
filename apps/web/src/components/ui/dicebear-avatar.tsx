'use client';

import React, { type FC, useMemo } from 'react';

import { cn } from '$utils/css.utils';

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
    <span
      aria-label={label}
      className={cn(
        'bg-primary text-primary-foreground relative flex shrink-0 items-center justify-center overflow-hidden shadow-none',
        className,
      )}
      role="img"
    >
      <span aria-hidden="true" className="text-xs font-semibold">
        {fallback || '?'}
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt=""
        aria-hidden="true"
        className="absolute inset-0 size-full object-cover"
        draggable={false}
        onError={(event) => {
          event.currentTarget.style.display = 'none';
        }}
        src={avatarDataUri}
      />
    </span>
  );
};
