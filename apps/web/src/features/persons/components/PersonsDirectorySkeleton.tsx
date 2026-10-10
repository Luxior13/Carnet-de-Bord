'use client';

import React, { type FC } from 'react';

import { Skeleton } from '$ui/skeleton';

import { PersonsListSkeleton } from './PersonsListSkeleton';

/**
 * Squelette de la page Répertoire : bandeau dégradé et liste, dans les mêmes
 * surfaces et dimensions que la page réelle. Les os de chargement restent
 * visibles sur le fond sombre (`--surface-table-head`), et sur le dégradé du
 * bandeau ils passent en voile clair translucide.
 */
export const PersonsDirectorySkeleton: FC = () => (
  <>
    <div
      aria-hidden="true"
      className="rounded-[10px] border border-[var(--border-hero)] bg-[linear-gradient(110deg,var(--surface-hero-start),var(--surface-hero-end)_75%)] p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3.5">
        <div className="flex min-w-0 items-center gap-3.5">
          <Skeleton className="size-10 shrink-0 rounded-[10px] bg-white/15" />
          <div className="min-w-0 space-y-1.5">
            <Skeleton className="h-[23px] w-36 max-w-full rounded-md bg-white/15" />
            <Skeleton className="h-[11px] w-64 max-w-full rounded-sm bg-white/10" />
          </div>
        </div>
        <Skeleton className="bg-primary/40 h-9 w-32 rounded-md" />
      </div>
    </div>
    <PersonsListSkeleton />
  </>
);
