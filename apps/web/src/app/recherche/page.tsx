import { Search } from 'lucide-react';
import React, { Suspense } from 'react';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { ContentState } from '$components/layout/ContentState';
import { SearchPage } from '$features/search/SearchPage';
import { PageCanvas, PageShell } from '$ui/page-shell';

const SearchPageFallback = (): React.ReactNode => (
  <AuthenticatedLayout breadcrumbs={[{ label: 'Recherche avancée' }]}>
    <PageShell className="py-0">
      <PageCanvas>
        <ContentState
          icon={<Search className="size-4" />}
          kind="loading"
          layout="panel"
          title="Préparation de la recherche…"
        />
      </PageCanvas>
    </PageShell>
  </AuthenticatedLayout>
);

export default function AdvancedSearchPage(): React.ReactNode {
  return (
    <Suspense fallback={<SearchPageFallback />}>
      <SearchPage />
    </Suspense>
  );
}
