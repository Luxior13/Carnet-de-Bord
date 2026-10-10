'use client';

import React, { type FC } from 'react';

import { UserStatusBadge } from '$features/users/user-badges';
import type { UserType } from '$types/auth.types';
import directoryStyles from '$ui/directory.module.css';
import { cn } from '$utils/css.utils';

const formatDetailDate = (value: Date | string | undefined): string => {
  const date = value instanceof Date ? value : value ? new Date(value) : null;

  if (!date || Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const UserOverviewCard: FC<{ user: UserType }> = ({ user }) => (
  <aside
    aria-label="Vue d'ensemble"
    className={cn(directoryStyles.overviewCard, 'min-w-0')}
  >
    <h2
      className={cn(
        directoryStyles.overviewHeader,
        'border-border-divider border-b px-4 py-3 text-sm font-semibold',
      )}
    >
      Vue d&apos;ensemble
    </h2>
    <div className="divide-border-divider divide-y">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
        <span className="text-muted-foreground text-xs">État</span>
        <UserStatusBadge isActive={user.isActive} />
      </div>
      {user.isProtected && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5">
          <span className="text-muted-foreground text-xs">Protection</span>
          <span className="border-warning/40 bg-warning/15 text-warning inline-flex w-fit items-center gap-1.5 rounded-[5px] border px-2 py-0.5 text-xs leading-5 font-medium whitespace-nowrap">
            <span
              aria-hidden="true"
              className="size-1.5 shrink-0 rounded-full bg-current"
            />
            Compte racine
          </span>
        </div>
      )}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
        <span className="text-muted-foreground text-xs">Mot de passe</span>
        <span
          className={cn(
            'inline-flex w-fit items-center gap-1.5 rounded-[5px] border px-2 py-0.5 text-xs leading-5 font-medium whitespace-nowrap',
            user.mustChangePassword
              ? 'border-warning/40 bg-warning/15 text-warning'
              : 'border-success/40 bg-success/15 text-success',
          )}
        >
          <span
            aria-hidden="true"
            className="size-1.5 shrink-0 rounded-full bg-current"
          />
          {user.mustChangePassword ? 'À changer' : 'À jour'}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
        <span className="text-muted-foreground text-xs">Créé le</span>
        <span className="text-foreground text-xs tabular-nums">
          {formatDetailDate(user.createdAt)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
        <span className="text-muted-foreground text-xs">
          Dernière modification
        </span>
        <span className="text-foreground text-xs tabular-nums">
          {formatDetailDate(user.updatedAt)}
        </span>
      </div>
    </div>
  </aside>
);
