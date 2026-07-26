'use client';

import React, { Suspense } from 'react';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { FEATURES } from '$constants/feature-registry.constants';
import { InternalNewsPage } from '$features/internal-news/components/InternalNewsPage';
import { PageCanvas, PageShell } from '$ui/page-shell';
import { Skeleton } from '$ui/skeleton';

const Loading = (): React.JSX.Element => (
  <PageShell className="py-0">
    <PageCanvas contentClassName="space-y-5">
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-20 rounded-xl" />
      <Skeleton className="h-52 rounded-2xl" />
    </PageCanvas>
  </PageShell>
);

export default function InternalNewsRoute(): React.JSX.Element {
  return (
    <AuthenticatedLayout
      breadcrumbs={[
        { label: FEATURES.internalNews.audit.poleLabel },
        { label: FEATURES.internalNews.label },
      ]}
    >
      <Suspense fallback={<Loading />}>
        <InternalNewsPage />
      </Suspense>
    </AuthenticatedLayout>
  );
}
