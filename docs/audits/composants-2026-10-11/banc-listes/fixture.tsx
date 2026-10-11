import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useSearchParams } from 'next/navigation';

import { PersonsList } from '$features/persons/components/PersonsList';
import { PersonsListToolbar } from '$features/persons/components/PersonsListToolbar';
import { UsersListToolbar } from '$features/users/UsersListToolbar';
import { Button } from '$ui/button';
import directoryStyles from '$ui/directory.module.css';
import { ListPagination } from '$ui/pagination';
import { listPage } from './data.cjs';

const mode = new URLSearchParams(location.search).get('mode') ?? 'users';
const initialState = { data: listPage(1), request: { sort: 'name' } } as const;

function DirectoryFixture() {
  const params = useSearchParams();
  return <main className={directoryStyles.directory}>
    <PersonsList canCreate={false} createHref="/membres/repertoire/nouveau" initialState={initialState} returnHref={`/membres/repertoire?${params}`} navigationScope="audit-persons" />
  </main>;
}

function Fixture() {
  const [query, setQuery] = useState('Camille');
  const [applied, setApplied] = useState(query);
  const [page, setPage] = useState(2);
  const [status, setStatus] = useState<any>(mode === 'persons' ? 'ALL' : 'all');
  const [role, setRole] = useState('all');
  const [sort, setSort] = useState<any>('name');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [totalKnown, setTotalKnown] = useState(true);
  const [previousKnown, setPreviousKnown] = useState(true);
  const [missingContacts, setMissingContacts] = useState(false);
  const applyFilters = (q: string, state: string, order: string, missing = missingContacts) => {
    setQuery(q);
    setApplied(q);
    setStatus(state);
    setSort(order);
    setMissingContacts(missing);
    setPage(1);
  };
  const state = JSON.stringify({ query, applied, page, status, role, sort, missingContacts });
  return (
    <main className={`${directoryStyles.directory} mx-auto max-w-6xl space-y-4 p-4`}>
      <h1>Contrôles de liste — données fictives</h1>
      <div id="tools" className="flex flex-wrap gap-2">
        <Button id="before" type="button">Avant</Button>
        <Button id="pending" type="button" onClick={() => setLoading(value => !value)}>Attente</Button>
        <Button id="error" type="button" onClick={() => setError(value => !value)}>Erreur</Button>
        <Button id="known" type="button" onClick={() => setTotalKnown(value => !value)}>Total inconnu</Button>
        <Button id="history" type="button" onClick={() => setPreviousKnown(value => !value)}>Historique absent</Button>
      </div>
      {mode === 'persons' ? (
        <PersonsListToolbar
          applyFilters={applyFilters}
          draftQuery={query}
          error={error ? new Error('Exemple') : null}
          isRefreshing={loading}
          missingContacts={missingContacts}
          setDraftQuery={setQuery}
          sort={sort}
          status={status}
          total={57}
        />
      ) : (
        <UsersListToolbar list={{
          canRequestSecurityDetails: true,
          clearFilters: () => { applyFilters('', 'all', 'name'); setRole('all'); },
          currentUser: { id: 'fictif', role: 'USER', permissions: {}, isProtected: false },
          filterRole: role,
          filterStatus: status,
          handleFilterChange: (type: string, value: string) => {
            if (type === 'role') setRole(value);
            if (type === 'status') setStatus(value);
            if (type === 'sort') setSort(value);
            setPage(1);
          },
          hasActiveFilters: !!query || status !== 'all' || role !== 'all' || sort !== 'name',
          hasTruncatedPagination: false,
          isLoading: false,
          isRefreshing: loading,
          loadError: error ? 'Exemple' : null,
          pageSize: 25,
          searchQuery: query,
          setCurrentPage: setPage,
          setDebouncedSearch: setApplied,
          setSearchQuery: setQuery,
          sortBy: sort,
          totalFiltered: 57,
        } as any} />
      )}
      <ListPagination
        ariaLabel="Pagination de la liste"
        canNext={page < 3}
        canPrevious={page > 1 && previousKnown}
        disabled={error}
        isLoading={loading}
        leadingAction={page > 1 ? <Button type="button" disabled={loading} onClick={() => setPage(1)} size="sm" variant="outline">Première page</Button> : null}
        onNext={() => setPage(value => value + 1)}
        onPrevious={() => setPage(value => value - 1)}
        page={page}
        totalPages={totalKnown ? 3 : undefined}
      />
      <output id="state" className="block text-xs [overflow-wrap:anywhere]">{state}</output>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(mode === 'directory' ? <DirectoryFixture /> : <Fixture />);
