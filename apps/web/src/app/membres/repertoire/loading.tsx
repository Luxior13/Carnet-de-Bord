import React from 'react';

import { PersonsDirectorySkeleton } from '$features/persons/components/PersonsDirectorySkeleton';
import { PageCanvas, PageShell } from '$ui/page-shell';

export default function PersonsLoading(): React.ReactNode {
  return (
    <PageShell className="py-0">
      <PageCanvas contentClassName="space-y-[18px]">
        <PersonsDirectorySkeleton />
      </PageCanvas>
    </PageShell>
  );
}
