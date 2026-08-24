import React, { Suspense } from 'react';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { FEATURES } from '$constants/feature-registry.constants';
import { InternalNewsPage } from '$features/internal-news/components/InternalNewsPage';
import { getInternalNewsCapabilities } from '$features/internal-news/internal-news.permissions';
import { internalNewsListQuerySchema } from '$features/internal-news/internal-news.schemas';
import type {
  InternalNewsFilter,
  InternalNewsResponse,
} from '$features/internal-news/internal-news.types';
import { listInternalNews } from '$features/internal-news/server/internal-news.service';
import { assertInternalNewsFeatureReady } from '$features/internal-news/server/internal-news-readiness';
import { getPageAuthSession } from '$server/auth';
import { PageCanvas, PageShell } from '$ui/page-shell';
import { Skeleton } from '$ui/skeleton';

type InternalNewsPageQuery = {
  filtre?: string | string[];
};

type InternalNewsRouteProps = {
  searchParams?: Promise<InternalNewsPageQuery>;
};

const Loading = (): React.JSX.Element => (
  <PageShell className="py-0">
    <PageCanvas contentClassName="space-y-5">
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-20 rounded-xl" />
      <Skeleton className="h-52 rounded-2xl" />
    </PageCanvas>
  </PageShell>
);

const readRequestedFilter = (
  value: string | string[] | undefined,
  canViewPartners: boolean,
): InternalNewsFilter => {
  const filter = Array.isArray(value) ? value[0] : value;
  if (filter === 'announcements') return filter;
  if (filter === 'partners' && canViewPartners) return filter;

  return 'all';
};

export default async function InternalNewsRoute({
  searchParams,
}: InternalNewsRouteProps): Promise<React.JSX.Element> {
  const [params, { user }] = await Promise.all([
    searchParams ?? Promise.resolve<InternalNewsPageQuery>({}),
    getPageAuthSession(),
  ]);
  const capabilities = getInternalNewsCapabilities(user);
  const filter = readRequestedFilter(
    params.filtre,
    capabilities.canViewPartners,
  );
  const parsed = internalNewsListQuerySchema.safeParse({ filter, limit: 20 });
  let initialState:
    { data: InternalNewsResponse; filter: InternalNewsFilter } | undefined;

  if (
    user &&
    !user.mustChangePassword &&
    capabilities.canView &&
    parsed.success
  ) {
    try {
      await assertInternalNewsFeatureReady();
      initialState = {
        data: await listInternalNews(parsed.data, {
          canViewPartners: capabilities.canViewPartners,
        }),
        filter,
      };
    } catch {
      // The client preserves the existing unavailable/retry states when the
      // server cannot produce a safe initial snapshot.
    }
  }

  return (
    <AuthenticatedLayout
      breadcrumbs={[
        { label: FEATURES.internalNews.audit.poleLabel },
        { label: FEATURES.internalNews.label },
      ]}
    >
      <Suspense fallback={<Loading />}>
        <InternalNewsPage initialState={initialState} />
      </Suspense>
    </AuthenticatedLayout>
  );
}
