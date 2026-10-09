import React from 'react';

import { UsersDirectorySkeleton } from '$features/users/UsersDirectorySkeleton';
import { PageCanvas, PageShell } from '$ui/page-shell';

export default function UsersLoading(): React.ReactNode {
  return (
    <PageShell className="py-0">
      <PageCanvas contentClassName="space-y-[18px]">
        <UsersDirectorySkeleton />
      </PageCanvas>
    </PageShell>
  );
}
