import { ChevronDown } from 'lucide-react';
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

  const metricsList = (
    <dl className="grid @min-[32rem]/users-overview:auto-cols-fr @min-[32rem]/users-overview:grid-flow-col">
      {metrics.map(({ color, detail, label, value, warning }) => (
        <div
          key={label}
          className="border-border-divider flex min-h-16 min-w-0 items-center justify-between gap-3 border-t px-4 py-3 first:border-t-0 @min-[32rem]/users-overview:border-t-0 @min-[32rem]/users-overview:border-l @min-[32rem]/users-overview:first:border-l-0"
        >
          <dt className="text-muted-foreground min-w-0 text-[0.8125rem] leading-5">
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
              'shrink-0 text-right text-xl leading-7 font-semibold tabular-nums',
              warning ? 'text-warning' : color,
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
  );

  return (
    <aside
      aria-label="Vue d’ensemble"
      aria-busy={isLoading}
      className="border-border-default bg-surface-panel @container/users-overview order-first min-w-0 overflow-hidden rounded-lg border @min-[94rem]/private-viewport:order-last"
    >
      <details className="group/overview @min-[32rem]/page:hidden">
        <summary className="hover:bg-surface-tile-hover focus-visible:ring-ring flex cursor-pointer list-none items-center justify-between gap-3 p-4 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset [&::-webkit-details-marker]:hidden">
          <span className="min-w-0">
            <span className="block text-sm font-semibold">Vue d’ensemble</span>
            <span className="text-muted-foreground mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[0.8125rem] leading-5">
              {isLoading ? (
                <Skeleton className="h-4 w-24" />
              ) : (
                <>
                  <span>
                    {stats?.total.toLocaleString('fr-FR')} compte
                    {stats?.total !== 1 ? 's' : ''}
                  </span>
                  {securityDetailsVisible &&
                    (stats?.pendingPasswordChange ?? 0) > 0 && (
                      <span className="text-warning">
                        · {stats?.pendingPasswordChange} à vérifier
                        <span className="sr-only">
                          {' '}
                          : mot de passe à changer
                        </span>
                      </span>
                    )}
                </>
              )}
            </span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className="text-muted-foreground size-4 shrink-0 transition-transform group-open/overview:rotate-180"
          />
        </summary>
        <div className="border-border-divider border-t">{metricsList}</div>
      </details>
      <div className="hidden @min-[32rem]/page:block">
        <h2 className="border-border-divider border-b px-4 py-3.5 text-sm font-semibold">
          Vue d’ensemble
        </h2>
        {metricsList}
      </div>
    </aside>
  );
};
