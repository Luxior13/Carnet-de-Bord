import React from 'react';

import { PageCanvas, PageShell } from '$ui/page-shell';
import { Skeleton } from '$ui/skeleton';

export default function Loading(): React.JSX.Element {
  return (
    <PageShell
      className="py-0"
      role="status"
      aria-label="Chargement de la page"
    >
      <PageCanvas contentClassName="space-y-4">
        <Skeleton className="h-[78px] rounded-[10px]" />
        <Skeleton className="h-[30rem] rounded-[10px]" />
      </PageCanvas>
    </PageShell>
  );
}
