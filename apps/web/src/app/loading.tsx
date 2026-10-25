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
      <span className="sr-only">Chargement de la page…</span>
      <PageCanvas contentClassName="space-y-4">
        <Skeleton aria-hidden="true" className="rounded-panel h-[78px]" />
        <Skeleton aria-hidden="true" className="rounded-panel h-[30rem]" />
      </PageCanvas>
    </PageShell>
  );
}
