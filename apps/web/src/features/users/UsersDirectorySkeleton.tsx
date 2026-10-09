'use client';

import React, { type FC } from 'react';

import { Skeleton } from '$ui/skeleton';

/**
 * Squelette de la liste des comptes, aligné sur la page de référence
 * `/membres/repertoire` : bandeau dégradé et carte de liste avec des lignes
 * lisibles, dans les mêmes surfaces et rayons.
 */
export const UsersDirectorySkeleton: FC = () => (
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
    <div
      aria-label="Chargement des utilisateurs"
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
            <Skeleton className="bg-surface-table-head size-9 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="bg-surface-table-head h-[13px] w-40 max-w-full rounded-sm" />
              <Skeleton className="bg-surface-table-head h-[10px] w-24 max-w-full rounded-sm" />
            </div>
            <Skeleton className="bg-surface-table-head hidden h-5 w-24 rounded-full sm:block" />
            <Skeleton className="bg-surface-table-head hidden h-5 w-20 rounded-full md:block" />
            <Skeleton className="bg-surface-table-head hidden h-4 w-24 rounded-sm lg:block" />
          </div>
        ))}
      </div>
    </div>
  </>
);
