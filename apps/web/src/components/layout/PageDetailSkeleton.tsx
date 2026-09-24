import React, { type FC } from 'react';

import { Skeleton } from '$ui/skeleton';

export const PageDetailSkeleton: FC = () => (
  <div aria-label="Chargement de la fiche" className="space-y-4" role="status">
    <div aria-hidden="true" className="flex min-h-16 items-start gap-3">
      <Skeleton className="size-10 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-7 w-64 max-w-full" />
        <Skeleton className="h-4 w-40 max-w-full" />
      </div>
    </div>
    <div
      aria-hidden="true"
      className="border-border-divider flex h-12 items-center gap-4 border-b"
    >
      <Skeleton className="h-5 w-16" />
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-5 w-16" />
    </div>
    <Skeleton className="h-[32rem] rounded-xl" />
  </div>
);
