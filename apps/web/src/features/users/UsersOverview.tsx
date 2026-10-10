import Link from 'next/link';
import React, { type FC, type ReactNode } from 'react';

import { PAGE_PATHS } from '$constants/routes.constants';
import type { UserStatsType } from '$types/auth.types';
import { Button } from '$ui/button';
import directoryStyles from '$ui/directory.module.css';
import { Skeleton } from '$ui/skeleton';
import { cn } from '$utils/css.utils';

import {
  buildUsersPageUrlParams,
  normalizeSortOption,
} from './users-list-state';
import styles from './UsersList.module.css';

type Props = {
  isLoading?: boolean;
  query?: string;
  securityDetailsVisible: boolean;
  stats: UserStatsType | null;
};
export const UsersOverview: FC<Props> = ({
  isLoading = false,
  query = '',
  securityDetailsVisible,
  stats,
}) => {
  if (!stats && !isLoading) return null;
  const params = new URLSearchParams(query);
  const sort = normalizeSortOption(params.get('sort'));
  const href = (filter?: [string, string]): string => {
    const next = buildUsersPageUrlParams({
      page: 1,
      role: 'all',
      search: '',
      sort,
      status: 'all',
    });
    if (filter) next.set(...filter);

    return PAGE_PATHS.users + (next.size ? '?' + next : '');
  };
  const status = params.get('status');
  const role = params.get('role');
  const hasQuery = Boolean(params.get('search'));
  const counters = [
    {
      filter: ['role', 'SUPERADMIN'],
      label: 'Superadmin',
      value: stats?.byRole.SUPERADMIN,
    },
    {
      filter: ['role', 'ADMIN'],
      label: 'Administrateurs',
      value: stats?.byRole.ADMIN,
    },
    {
      filter: ['role', 'USER'],
      label: 'Utilisateurs',
      value: stats?.byRole.USER,
    },
    { filter: ['status', 'active'], label: 'Actifs', value: stats?.active },
    {
      filter: ['status', 'inactive'],
      label: 'Désactivés',
      value: stats?.inactive,
    },
    ...(securityDetailsVisible
      ? [
          {
            filter: ['status', 'pending'],
            label: 'Mot de passe à changer',
            value: stats?.pendingPasswordChange,
          },
        ]
      : []),
  ];
  const value = (count: number | null | undefined): ReactNode =>
    isLoading ? (
      <Skeleton className="h-4 w-6" />
    ) : (
      (count ?? 0).toLocaleString('fr-FR')
    );

  return (
    <aside
      aria-busy={isLoading}
      aria-label="Vue d’ensemble"
      className={cn(directoryStyles.overviewCard, 'min-w-0')}
    >
      <div
        className={cn(
          directoryStyles.overviewHeader,
          'flex items-center justify-between gap-3 border-b px-4 py-2',
        )}
      >
        <div>
          <h2 className="text-sm font-semibold">Vue d’ensemble</h2>
          <p className="text-muted-foreground text-[11px] font-normal">
            Tous les comptes
          </p>
        </div>
        <Button
          asChild
          variant="ghost"
          className="h-auto min-h-11 px-2 text-2xl font-semibold tabular-nums"
        >
          <Link
            href={href()}
            scroll={false}
            aria-label="Afficher tous les comptes"
            aria-current={!hasQuery && !status && !role ? 'page' : undefined}
          >
            {value(stats?.total)}
          </Link>
        </Button>
      </div>
      <div className={styles.counters}>
        {counters.map((counter) => {
          const filter = counter.filter as [string, string];
          const active =
            !hasQuery &&
            (filter[0] === 'role'
              ? !status && role === filter[1]
              : !role && status === filter[1]);

          return (
            <Button
              asChild
              variant="ghost"
              key={counter.label}
              className={styles.counter}
            >
              <Link
                href={href(filter)}
                scroll={false}
                aria-label={'Afficher les comptes : ' + counter.label}
                aria-current={active ? 'page' : undefined}
              >
                <span className="text-muted-foreground text-[11px] font-normal">
                  {counter.label}
                </span>
                <span className="text-sm font-semibold tabular-nums">
                  {value(counter.value)}
                </span>
              </Link>
            </Button>
          );
        })}
      </div>
    </aside>
  );
};
