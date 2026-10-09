import React, { type FC, type ReactNode } from 'react';

import directoryStyles from '$ui/directory.module.css';
import { Skeleton } from '$ui/skeleton';
import { cn } from '$utils/css.utils';

import type { PersonOverview as PersonOverviewStats } from '../types/person.types';

type PersonOverviewProps = {
  isLoading?: boolean;
  stats: PersonOverviewStats | null;
};

const OverviewGroupHeader: FC<{ label: string }> = ({ label }) => (
  <div className="border-border-divider border-t px-4 pt-2.5 pb-1">
    <span className="text-muted-foreground text-[10px] font-medium tracking-[0.08em] uppercase">
      {label}
    </span>
  </div>
);

const OverviewRow: FC<{
  dotClassName: string;
  label: string;
  lastInGroup?: boolean;
  value: ReactNode;
}> = ({ dotClassName, label, lastInGroup = false, value }) => (
  <div
    className={cn(
      'flex items-center justify-between gap-3 px-4 py-1.5',
      lastInGroup && 'pb-2.5',
    )}
  >
    <span className="text-muted-foreground flex min-w-0 items-center gap-2 text-xs leading-5">
      <span
        aria-hidden="true"
        className={cn('size-1.5 shrink-0 rounded-full', dotClassName)}
      />
      {label}
    </span>
    <span className="text-foreground shrink-0 text-sm leading-5 font-semibold tabular-nums">
      {value}
    </span>
  </div>
);

export const PersonOverview: FC<PersonOverviewProps> = ({
  isLoading = false,
  stats,
}) => {
  if (!stats && !isLoading) return null;

  const displayValue = (rawValue: number | null | undefined): ReactNode =>
    isLoading ? (
      <Skeleton className="h-4 w-6" />
    ) : (
      (rawValue ?? 0).toLocaleString('fr-FR')
    );

  return (
    <aside
      aria-busy={isLoading}
      aria-label="Vue d’ensemble"
      className={cn(directoryStyles.overviewCard, 'min-w-0')}
    >
      <h2
        className={cn(
          directoryStyles.overviewHeader,
          'border-border-divider border-b px-4 py-3 text-sm font-semibold',
        )}
      >
        Vue d’ensemble
      </h2>
      <div className="border-border-divider border-b px-4 py-3">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-muted-foreground text-xs leading-5">
            Total des fiches
          </span>
          <span className="text-foreground text-2xl leading-8 font-semibold tabular-nums">
            {displayValue(stats?.total)}
          </span>
        </div>
      </div>

      <OverviewGroupHeader label="Statut" />
      <OverviewRow
        dotClassName="bg-success"
        label="Dans la structure"
        value={displayValue(stats?.inStructure)}
      />
      <OverviewRow
        dotClassName="bg-warning"
        lastInGroup
        label="Hors structure"
        value={displayValue(stats?.outsideStructure)}
      />

      <OverviewGroupHeader label="Statistiques" />
      <OverviewRow
        dotClassName="bg-info"
        lastInGroup
        label="Sans coordonnées"
        value={displayValue(stats?.noContacts)}
      />
    </aside>
  );
};
