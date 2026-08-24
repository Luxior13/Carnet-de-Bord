import React from 'react';

import { PageCanvas, PageShell } from '$ui/page-shell';
import { Skeleton } from '$ui/skeleton';

export default function Loading(): React.JSX.Element {
  return (
    <PageShell className="py-0">
      <PageCanvas contentClassName="space-y-4">
        <Skeleton className="h-28 rounded-xl" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </PageCanvas>
    </PageShell>
  );
}
