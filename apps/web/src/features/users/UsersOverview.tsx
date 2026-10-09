import React, { type FC } from 'react';

import type { UserStatsType } from '$types/auth.types';
import directoryStyles from '$ui/directory.module.css';
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
      color: 'text-primary-emphasis',
      detail: null,
      label: 'Total des comptes',
      value: stats?.total,
      warning: false,
    },
    {
      color: 'text-success',
      detail: null,
      label: 'Comptes actifs',
      value: stats?.active,
      warning: false,
    },
    ...(securityDetailsVisible &&
    (isLoading || stats?.pendingPasswordChange != null)
      ? [
          {
            color: 'text-muted-foreground',
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
      aria-busy={isLoading}
      aria-label="Vue d’ensemble"
      className={cn(
        directoryStyles.overviewCard,
        '@container/users-overview min-w-0',
      )}
    >
      <h2
        className={cn(
          directoryStyles.overviewHeader,
          'border-border-divider border-b px-4 py-4 text-sm font-semibold',
        )}
      >
        Vue d’ensemble
      </h2>
      <dl className="grid @min-[32rem]/users-overview:auto-cols-fr @min-[32rem]/users-overview:grid-flow-col">
        {metrics.map(({ color, detail, label, value, warning }) => (
          <div
            key={label}
            className={cn(
              directoryStyles.overviewMetric,
              'border-border-divider flex min-w-0 items-center justify-between gap-3 border-t px-4 py-3 first:border-t-0 @min-[32rem]/users-overview:border-t-0 @min-[32rem]/users-overview:border-l @min-[32rem]/users-overview:first:border-l-0',
            )}
          >
            <dt className="text-muted-foreground min-w-0 text-[11px] leading-5">
              <span className="block">{label}</span>
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
                'shrink-0 text-right text-[13px] leading-6 font-semibold tabular-nums',
                warning ? 'text-warning' : color,
              )}
            >
              {isLoading ? (
                <Skeleton className="h-6 w-8" />
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
