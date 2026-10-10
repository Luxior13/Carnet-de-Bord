import Link from 'next/link';
import React, { type FC, type ReactNode } from 'react';

import { PAGE_PATHS } from '$constants/routes.constants';
import { Button } from '$ui/button';
import directoryStyles from '$ui/directory.module.css';
import { Skeleton } from '$ui/skeleton';
import { cn } from '$utils/css.utils';

import type { PersonOverview as PersonOverviewStats } from '../types/person.types';
import styles from './PersonOverview.module.css';

type PersonOverviewProps = {
  isLoading?: boolean;
  query?: string;
  stats: PersonOverviewStats | null;
};

export const PersonOverview: FC<PersonOverviewProps> = ({
  isLoading = false,
  query = '',
  stats,
}) => {
  if (!stats && !isLoading) return null;
  const params = new URLSearchParams(query);
  const sort = params.get('sort');
  const href = (filter?: [string, string]): string => {
    const next = new URLSearchParams();
    if (sort === 'created' || sort === 'updated') next.set('sort', sort);
    if (filter) next.set(...filter);

    return PAGE_PATHS.persons + (next.size ? '?' + next : '');
  };
  const status = params.get('structureStatus');
  const missing = params.get('contacts') === 'missing';
  const hasQuery = Boolean(params.get('q')?.trim());
  const counters = [
    {
      active: !hasQuery && !missing && status === 'IN_STRUCTURE',
      href: href(['structureStatus', 'IN_STRUCTURE']),
      label: 'Dans la structure',
      value: stats?.inStructure,
    },
    {
      active: !hasQuery && !missing && status === 'OUTSIDE_STRUCTURE',
      href: href(['structureStatus', 'OUTSIDE_STRUCTURE']),
      label: 'Hors structure',
      value: stats?.outsideStructure,
    },
    {
      active: !hasQuery && !status && missing,
      href: href(['contacts', 'missing']),
      label: 'Sans coordonnées',
      value: stats?.noContacts,
    },
  ];
  const value = (count?: number): ReactNode =>
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
            Tout le répertoire
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
            aria-label="Afficher toutes les fiches"
            aria-current={!hasQuery && !status && !missing ? 'page' : undefined}
          >
            {value(stats?.total)}
          </Link>
        </Button>
      </div>
      <div className={styles.counters}>
        {counters.map((counter) => (
          <Button
            asChild
            variant="ghost"
            key={counter.label}
            className={styles.counter}
          >
            <Link
              href={counter.href}
              scroll={false}
              aria-label={'Afficher les fiches : ' + counter.label}
              aria-current={counter.active ? 'page' : undefined}
            >
              <span className="text-muted-foreground text-[11px] font-normal">
                {counter.label}
              </span>
              <span className="text-sm font-semibold tabular-nums">
                {value(counter.value)}
              </span>
            </Link>
          </Button>
        ))}
      </div>
    </aside>
  );
};
