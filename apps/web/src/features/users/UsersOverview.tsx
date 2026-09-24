import React, { type FC } from 'react';

import type { UserStatsType } from '$types/auth.types';
import { Skeleton } from '$ui/skeleton';
import { cn } from '$utils/css.utils';

type UsersOverviewProps = {
  isLoading?: boolean;
  securityDetailsVisible: boolean;
  stats: UserStatsType | null;
};

export const UsersOverview: FC<UsersOverviewProps> = ({
  isLoading = false,
  securityDetailsVisible,
  stats,
}) => {
  if (!stats && !isLoading) return null;

  const metrics = [
    {
      detail: null,
      label: 'Total des comptes',
      value: stats?.total,
      warning: false,
    },
    {
      detail: null,
      label: 'Comptes actifs',
      value: stats?.active,
      warning: false,
    },
    ...(securityDetailsVisible &&
    (isLoading || stats?.pendingPasswordChange != null)
      ? [
          {
            detail: 'À changer',
            label: 'Mots de passe',
            value: stats?.pendingPasswordChange,
            warning: (stats?.pendingPasswordChange ?? 0) > 0,
          },
        ]
      : []),
  ];

  return (
    <aside
      aria-labelledby="users-overview-title"
      aria-busy={isLoading}
      className="border-border-default bg-surface-panel @container/users-overview order-first min-w-0 overflow-hidden rounded-2xl border min-[110rem]:order-last"
    >
      <h2
        id="users-overview-title"
        className="border-border-divider bg-surface-panel-header border-b px-4 py-3.5 text-sm font-semibold"
      >
        Vue d’ensemble
      </h2>
      <dl className="grid @min-[32rem]/users-overview:auto-cols-fr @min-[32rem]/users-overview:grid-flow-col">
        {metrics.map(({ detail, label, value, warning }) => (
          <div
            key={label}
            className={cn(
              'border-border-divider flex min-h-16 min-w-0 items-center justify-between gap-3 border-t px-4 py-3 first:border-t-0 @min-[32rem]/users-overview:border-t-0 @min-[32rem]/users-overview:border-l @min-[32rem]/users-overview:first:border-l-0',
              warning && 'bg-warning/5',
            )}
          >
            <dt className="min-w-0 text-xs leading-5">
              <span className="block font-medium">{label}</span>
              {detail && (
                <span
                  className={warning ? 'text-warning' : 'text-muted-foreground'}
                >
                  {detail}
                </span>
              )}
            </dt>
            <dd
              className={cn(
                'shrink-0 text-right text-xl leading-7 font-semibold tabular-nums',
                warning && 'text-warning',
              )}
            >
              {isLoading ? (
                <Skeleton className="h-7 w-8" />
              ) : (
                value?.toLocaleString('fr-FR')
              )}
            </dd>
          </div>
        ))}
      </dl>
    </aside>
  );
};
