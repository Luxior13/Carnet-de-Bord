import React, { type FC } from 'react';

import { Skeleton } from '$ui/skeleton';

export const PersonsListSkeleton: FC = () => (
  <div
    aria-label="Chargement du répertoire"
    className="border-border-content bg-surface-content overflow-hidden rounded-[10px] border"
    role="status"
  >
    <div className="bg-surface-content-header p-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <Skeleton className="bg-surface-table-head h-[38px] min-w-[180px] flex-1 rounded-md" />
        <Skeleton className="bg-surface-table-head hidden h-[38px] w-[170px] rounded-md sm:block" />
        <Skeleton className="bg-surface-table-head hidden h-[38px] w-[170px] rounded-md sm:block" />
      </div>
    </div>
    <div aria-hidden="true" className="divide-border-divider divide-y">
      {[...Array(6)].map((_, index) => (
        <div className="flex items-center gap-2.5 px-4 py-3" key={index}>
          <Skeleton className="bg-surface-table-head size-9 shrink-0 rounded-[7px]" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="bg-surface-table-head h-[13px] w-40 max-w-full rounded-sm" />
            <Skeleton className="bg-surface-table-head h-[10px] w-24 max-w-full rounded-sm" />
          </div>
          <Skeleton className="bg-surface-table-head hidden h-5 w-28 rounded-full sm:block" />
          <Skeleton className="bg-surface-table-head hidden h-4 w-28 rounded-sm lg:block" />
        </div>
      ))}
    </div>
  </div>
);
