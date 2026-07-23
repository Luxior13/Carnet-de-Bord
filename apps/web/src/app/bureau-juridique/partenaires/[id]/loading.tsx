import React from 'react';

import { PageCanvas, PageShell } from '$ui/page-shell';
import { Skeleton } from '$ui/skeleton';

export default function Loading(): React.JSX.Element {
  return (
    <PageShell className="py-0">
      <PageCanvas>
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="mt-3 h-[30rem] rounded-xl" />
      </PageCanvas>
    </PageShell>
  );
}
