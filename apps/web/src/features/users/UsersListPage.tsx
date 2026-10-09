'use client';

import { UserRole } from '@repo/shared';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Plus,
  RotateCcw,
  Search,
  UserMinus,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import React, {
  type FC,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { ContentState } from '$components/layout/ContentState';
import { PageAsideLayout } from '$components/layout/PageAsideLayout';
import { PageIdentityHero } from '$components/layout/PageIdentityHero';
import { UserAvatar } from '$components/users/UserAvatar';
import { FEATURES } from '$constants/feature-registry.constants';
import { PAGINATION } from '$constants/pagination.constants';
import {
  getAccessLabel,
  hasPermission,
  PERMISSIONS,
} from '$constants/permissions.constants';
import { PAGE_PATHS, userDetailPath } from '$constants/routes.constants';
import { useUser } from '$context/UserContext';
import {
  canSearchUserContact,
  formatUserLastLogin,
} from '$features/users/users-list.utils';
import { UsersOverview } from '$features/users/UsersOverview';
import type {
  PaginationInfo,
  UserStatsType,
  UserType,
} from '$types/auth.types';
import { Button } from '$ui/button';
import {
  DataTableDesktop,
  DataTableMobileList,
  DataTableSection,
} from '$ui/data-table-section';
import directoryStyles from '$ui/directory.module.css';
import { Input } from '$ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '$ui/select';
import { Skeleton } from '$ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '$ui/table';
import { cn } from '$utils/css.utils';
import {
  getUserDisplayName,
  getUserLoginDisplay,
  isUserIdentityMasked,
} from '$utils/user-display.utils';

type FilterStatus = 'all' | 'active' | 'inactive' | 'pending';
type FilterRole = 'all' | UserRole;
type SortOption = 'name' | 'recent' | 'created';

const FILTER_STATUS_OPTIONS: readonly FilterStatus[] = [
  'all',
  'active',
  'inactive',
  'pending',
];
const FILTER_ROLE_OPTIONS: readonly FilterRole[] = [
  'all',
  UserRole.ADMIN,
  UserRole.USER,
];
const SORT_OPTIONS: readonly SortOption[] = ['name', 'recent', 'created'];
const USER_SEARCH_MAX_LENGTH = 100;

/** Couleur d'accès par niveau d'importance, du plus élevé au plus courant. */
const ACCESS_LEVEL_TONES = {
  admin: 'border-warning/40 bg-warning/15 text-warning',
  protected: 'border-destructive/40 bg-destructive/15 text-destructive',
  user: 'border-info/40 bg-info/15 text-info',
} as const;

const getAccessToneClass = (
  user: Pick<UserType, 'isProtected' | 'role'>,
): string =>
  user.isProtected
    ? ACCESS_LEVEL_TONES.protected
    : user.role === UserRole.ADMIN
      ? ACCESS_LEVEL_TONES.admin
      : ACCESS_LEVEL_TONES.user;

const getSortLabel = (sort: SortOption): string => {
  switch (sort) {
    case 'created':
      return 'Date de création';
    case 'recent':
      return 'Dernière connexion';
    case 'name':
    default:
      return 'Nom (A–Z)';
  }
};

const normalizeFilterStatus = (value: string | null): FilterStatus =>
  FILTER_STATUS_OPTIONS.includes(value as FilterStatus)
    ? (value as FilterStatus)
    : 'all';

const normalizeFilterRole = (value: string | null): FilterRole =>
  FILTER_ROLE_OPTIONS.includes(value as FilterRole)
    ? (value as FilterRole)
    : 'all';

const normalizeSortOption = (value: string | null): SortOption =>
  SORT_OPTIONS.includes(value as SortOption) ? (value as SortOption) : 'name';

const normalizePage = (value: string | null): number => {
  const parsed = Number.parseInt(value ?? '1', 10);

  return Number.isFinite(parsed) && parsed > 0
    ? Math.min(parsed, PAGINATION.MAX_PAGE)
    : 1;
};

const normalizeSearchQuery = (value: string | null): string =>
  (value ?? '').trim().slice(0, USER_SEARCH_MAX_LENGTH);

const buildUsersQueryParams = ({
  limit,
  page,
  role,
  search,
  sort,
  status,
}: {
  limit: number | null;
  page: number;
  role: FilterRole;
  search: string;
  sort: SortOption;
  status: FilterStatus;
}): URLSearchParams => {
  const params = new URLSearchParams();
  params.set('page', String(page));
  if (limit !== null) params.set('limit', String(limit));
  if (search) params.set('search', search);
  if (status !== 'all') params.set('status', status);
  if (role !== 'all') params.set('role', role);
  if (sort !== 'name') params.set('sort', sort);

  return params;
};

const buildUsersPageUrlParams = ({
  page,
  role,
  search,
  sort,
  status,
}: {
  page: number;
  role: FilterRole;
  search: string;
  sort: SortOption;
  status: FilterStatus;
}): URLSearchParams => {
  const params = new URLSearchParams();
  const normalizedSearch = normalizeSearchQuery(search);

  if (page > 1) params.set('page', String(page));
  if (normalizedSearch) params.set('search', normalizedSearch);
  if (status !== 'all') params.set('status', status);
  if (role !== 'all') params.set('role', role);
  if (sort !== 'name') params.set('sort', sort);

  return params;
};

const UserAccessLabel: FC<{
  user: Pick<UserType, 'isProtected' | 'role'>;
}> = ({ user }) => {
  return (
    <span
      className={cn(
        'inline-flex w-fit shrink-0 items-center gap-1.5 rounded-[5px] border px-2 py-0.5 text-xs leading-5 font-medium whitespace-nowrap',
        getAccessToneClass(user),
      )}
    >
      <span
        aria-hidden="true"
        className="size-1.5 shrink-0 rounded-full bg-current"
      />
      {getAccessLabel(user)}
    </span>
  );
};

const UserStatusLabel: FC<{ isActive: boolean }> = ({ isActive }) => {
  return (
    <span
      className={cn(
        'inline-flex w-fit shrink-0 items-center gap-1.5 rounded-[5px] border px-2 py-0.5 text-xs leading-5 font-medium whitespace-nowrap',
        isActive
          ? 'border-success/40 bg-success/15 text-success'
          : 'border-warning/40 bg-warning/15 text-warning',
      )}
    >
      <span
        aria-hidden="true"
        className={cn('size-1.5 shrink-0 rounded-full', 'bg-current')}
      />
      {isActive ? 'Actif' : 'Désactivé'}
    </span>
  );
};

export const UsersListPage: FC = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentQueryString = searchParams.toString();
  const { userData: currentUser } = useUser();
  const canCreateUsers =
    !!currentUser &&
    (currentUser.isProtected ||
      hasPermission(
        currentUser.role,
        PERMISSIONS.USERS.CREATE,
        currentUser.permissions,
      ));
  const canRequestSecurityDetails =
    !!currentUser &&
    (currentUser.isProtected ||
      hasPermission(
        currentUser.role,
        PERMISSIONS.USERS.VIEW_SECURITY,
        currentUser.permissions,
      ));

  const [users, setUsers] = useState<UserType[]>([]);
  const [stats, setStats] = useState<UserStatsType | null>(null);
  const [securityDetailsVisible, setSecurityDetailsVisible] = useState(false);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastSuccessfulLoadAt, setLastSuccessfulLoadAt] = useState<Date | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState(() =>
    normalizeSearchQuery(searchParams.get('search')),
  );
  const [debouncedSearch, setDebouncedSearch] = useState(() =>
    normalizeSearchQuery(searchParams.get('search')),
  );
  const [filterStatus, setFilterStatus] = useState<FilterStatus>(() =>
    normalizeFilterStatus(searchParams.get('status')),
  );
  const [filterRole, setFilterRole] = useState<FilterRole>(() =>
    normalizeFilterRole(searchParams.get('role')),
  );
  const [sortBy, setSortBy] = useState<SortOption>(() =>
    normalizeSortOption(searchParams.get('sort')),
  );
  const hasLoadedUsersRef = useRef(false);
  const effectivePageSizeRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isSyncingStateFromUrlRef = useRef(false);
  const lastSyncedQueryStringRef = useRef(currentQueryString);

  // Pagination
  const [currentPage, setCurrentPage] = useState(() =>
    normalizePage(searchParams.get('page')),
  );
  const effectiveFilterStatus: FilterStatus =
    currentUser && !canRequestSecurityDetails && filterStatus === 'pending'
      ? 'all'
      : filterStatus;

  const fetchUsers = useCallback(
    async (
      page = 1,
      search = '',
      status: FilterStatus = 'all',
      role: FilterRole = 'all',
      sort: SortOption = 'name',
    ): Promise<void> => {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        setLoadError(null);
        if (hasLoadedUsersRef.current) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }

        if (page === 1) effectivePageSizeRef.current = null;
        const params = buildUsersQueryParams({
          limit: page > 1 ? effectivePageSizeRef.current : null,
          page,
          role,
          search,
          sort,
          status,
        });

        const response = await fetch(`/api/users?${params.toString()}`, {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;

        // A network failure may keep the last response; an access refusal must
        // discard it, even when the refusal body is not valid JSON.
        if (response.status === 401 || response.status === 403) {
          setUsers([]);
          setStats(null);
          setPagination(null);
          setSecurityDetailsVisible(false);
          setLastSuccessfulLoadAt(null);
        }
        const data = await response.json();

        if (controller.signal.aborted) return;

        if (response.ok && data.success) {
          const nextPagination = data.data.pagination as PaginationInfo;
          effectivePageSizeRef.current = nextPagination.limit;
          const resolvedTotalPages = Math.max(
            1,
            nextPagination.totalPages || 0,
          );

          if (page > resolvedTotalPages) {
            setCurrentPage(resolvedTotalPages);

            return;
          }

          setUsers(data.data.users);
          setStats(data.data.stats);
          setSecurityDetailsVisible(data.data.securityDetailsVisible === true);
          setPagination(nextPagination);
          setLastSuccessfulLoadAt(new Date());
        } else {
          const message =
            data.error?.message || 'Impossible de charger les utilisateurs';
          setLoadError(message);
        }
      } catch {
        if (controller.signal.aborted) return;
        const message = 'Impossible de charger les utilisateurs';
        setLoadError(message);
      } finally {
        if (abortControllerRef.current !== controller) return;

        abortControllerRef.current = null;
        hasLoadedUsersRef.current = true;
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [],
  );

  useEffect((): (() => void) => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect((): void => {
    if (currentQueryString === lastSyncedQueryStringRef.current) return;

    const nextSearch = normalizeSearchQuery(searchParams.get('search'));

    isSyncingStateFromUrlRef.current = true;
    lastSyncedQueryStringRef.current = currentQueryString;
    setSearchQuery(nextSearch);
    setDebouncedSearch(nextSearch);
    setFilterStatus(normalizeFilterStatus(searchParams.get('status')));
    setFilterRole(normalizeFilterRole(searchParams.get('role')));
    setSortBy(normalizeSortOption(searchParams.get('sort')));
    setCurrentPage(normalizePage(searchParams.get('page')));
  }, [currentQueryString, searchParams]);

  useEffect((): void => {
    if (isSyncingStateFromUrlRef.current) {
      isSyncingStateFromUrlRef.current = false;

      return;
    }

    const params = buildUsersPageUrlParams({
      page: currentPage,
      role: filterRole,
      search: debouncedSearch,
      sort: sortBy,
      status: effectiveFilterStatus,
    });
    const nextQueryString = params.toString();

    if (currentQueryString === nextQueryString) return;

    lastSyncedQueryStringRef.current = nextQueryString;
    window.history.replaceState(
      null,
      '',
      nextQueryString ? `${pathname}?${nextQueryString}` : pathname,
    );
  }, [
    currentPage,
    currentQueryString,
    debouncedSearch,
    filterRole,
    effectiveFilterStatus,
    pathname,
    sortBy,
  ]);

  // Fetch on mount and when filters change
  useEffect((): void => {
    fetchUsers(
      currentPage,
      debouncedSearch,
      effectiveFilterStatus,
      filterRole,
      sortBy,
    );
  }, [
    fetchUsers,
    currentPage,
    debouncedSearch,
    effectiveFilterStatus,
    filterRole,
    sortBy,
  ]);

  useEffect((): void => {
    if (
      !currentUser ||
      canRequestSecurityDetails ||
      filterStatus !== 'pending'
    ) {
      return;
    }

    setFilterStatus('all');
    setCurrentPage(1);
  }, [canRequestSecurityDetails, currentUser, filterStatus]);

  // Handle search with debounce
  useEffect((): (() => void) => {
    const normalizedSearch = normalizeSearchQuery(searchQuery);

    // On mount and after a browser history navigation, both values already
    // come from the URL. Avoid forcing a valid deep-linked page back to 1.
    if (normalizedSearch === debouncedSearch) return () => undefined;

    const timer = setTimeout(() => {
      setDebouncedSearch(normalizedSearch);
      setCurrentPage(1); // Reset to page 1 on search
    }, 400);

    return () => clearTimeout(timer);
  }, [debouncedSearch, searchQuery]);

  // Handle other filter changes
  const handleFilterChange = (
    type: 'status' | 'role' | 'sort',
    value: string,
  ): void => {
    setCurrentPage(1); // Reset to page 1 on filter change
    if (type === 'status') {
      const nextStatus = normalizeFilterStatus(value);
      setFilterStatus(nextStatus);
    } else if (type === 'role') {
      const nextRole = normalizeFilterRole(value);
      setFilterRole(nextRole);
    } else {
      const nextSort = normalizeSortOption(value);
      setSortBy(nextSort);
    }
  };

  const clearFilters = (): void => {
    setSearchQuery('');
    setDebouncedSearch('');
    setFilterStatus('all');
    setFilterRole('all');
    setSortBy('name');
    setCurrentPage(1);
  };

  const getUserDetailHref = (userId: string): string =>
    userId === currentUser?.id
      ? '/mon-compte'
      : `${userDetailPath(userId)}?${new URLSearchParams({ returnTo: `${PAGE_PATHS.users}${currentQueryString ? `?${currentQueryString}` : ''}` })}`;
  const createUserHref = `${PAGE_PATHS.newUser}?${new URLSearchParams({ returnTo: `${PAGE_PATHS.users}${currentQueryString ? `?${currentQueryString}` : ''}` })}`;

  const hasActiveFilters =
    !!searchQuery ||
    filterStatus !== 'all' ||
    filterRole !== 'all' ||
    sortBy !== 'name';

  const displayedUsers = users;

  // Total pages from server pagination
  const totalPages = Math.min(pagination?.totalPages || 1, PAGINATION.MAX_PAGE);
  const hasTruncatedPagination =
    (pagination?.totalPages ?? 0) > PAGINATION.MAX_PAGE;
  const totalFiltered = pagination?.total ?? users.length;
  const pageSize = pagination?.limit ?? PAGINATION.DEFAULT_LIMIT;

  return (
    <PageAsideLayout
      aside={
        <UsersOverview
          isLoading={isLoading}
          securityDetailsVisible={
            isLoading ? canRequestSecurityDetails : securityDetailsVisible
          }
          stats={stats}
        />
      }
      header={
        <PageIdentityHero
          actions={
            canCreateUsers ? (
              <Button asChild className={directoryStyles.addButton}>
                <Link href={createUserHref}>
                  <Plus aria-hidden="true" />
                  Nouvel utilisateur
                </Link>
              </Button>
            ) : undefined
          }
          description="Gérez les comptes et leurs accès."
          icon={<Users aria-hidden="true" />}
          title={FEATURES.users.label}
        />
      }
    >
      <div className="space-y-4">
        {loadError && (
          <ContentState
            action={
              <Button
                onClick={() =>
                  void fetchUsers(
                    currentPage,
                    debouncedSearch,
                    effectiveFilterStatus,
                    filterRole,
                    sortBy,
                  )
                }
                size="sm"
                type="button"
                variant="outline"
              >
                Réessayer
              </Button>
            }
            description={
              lastSuccessfulLoadAt
                ? `Les dernières données fiables, actualisées à ${lastSuccessfulLoadAt.toLocaleTimeString(
                    'fr-FR',
                    {
                      hour: '2-digit',
                      minute: '2-digit',
                    },
                  )}, restent affichées.`
                : undefined
            }
            kind="error"
            title={loadError}
          />
        )}
        <DataTableSection
          className="border-border-content bg-surface-content rounded-[10px]"
          headerClassName="bg-surface-content-header"
          contentClassName={
            isRefreshing ? 'opacity-60 transition-opacity' : undefined
          }
          toolbar={
            <div className="w-full">
              <form
                aria-label="Rechercher et filtrer les utilisateurs"
                className={directoryStyles.filterForm}
                onSubmit={(event) => {
                  event.preventDefault();
                  setDebouncedSearch(normalizeSearchQuery(searchQuery));
                  setCurrentPage(1);
                }}
                role="search"
              >
                <div className={directoryStyles.search}>
                  <Search aria-hidden="true" />
                  <Input
                    aria-label="Rechercher un compte utilisateur"
                    autoCapitalize="none"
                    autoComplete="off"
                    className={directoryStyles.searchInput}
                    enterKeyHint="search"
                    maxLength={USER_SEARCH_MAX_LENGTH}
                    name="directory-search"
                    placeholder="Rechercher…"
                    spellCheck={false}
                    title={
                      currentUser && canSearchUserContact(currentUser)
                        ? 'Nom, identifiant ou email'
                        : 'Nom ou identifiant'
                    }
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                  />
                  {searchQuery ? (
                    <Button
                      aria-label="Effacer la recherche"
                      className={directoryStyles.searchClear}
                      onClick={() => setSearchQuery('')}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <X aria-hidden="true" />
                    </Button>
                  ) : (
                    <Button
                      aria-label="Rechercher les comptes"
                      className={directoryStyles.searchClear}
                      size="icon"
                      type="submit"
                      variant="ghost"
                    >
                      <ChevronRight aria-hidden="true" />
                    </Button>
                  )}
                </div>
                <div className={directoryStyles.filterSelects}>
                  <Select
                    value={filterStatus}
                    onValueChange={(value) =>
                      handleFilterChange('status', value)
                    }
                  >
                    <SelectTrigger
                      aria-label="Filtrer par état du compte"
                      className={directoryStyles.selectTrigger}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={directoryStyles.selectContent}>
                      <SelectItem
                        className={directoryStyles.selectOption}
                        value="all"
                      >
                        Tous les états
                      </SelectItem>
                      <SelectItem
                        className={directoryStyles.selectOption}
                        value="active"
                      >
                        Actifs
                      </SelectItem>
                      <SelectItem
                        className={directoryStyles.selectOption}
                        value="inactive"
                      >
                        Désactivés
                      </SelectItem>
                      {canRequestSecurityDetails && (
                        <SelectItem
                          className={directoryStyles.selectOption}
                          value="pending"
                        >
                          Mot de passe à changer
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <Select
                    value={filterRole}
                    onValueChange={(value) => handleFilterChange('role', value)}
                  >
                    <SelectTrigger
                      aria-label="Filtrer par rôle"
                      className={directoryStyles.selectTrigger}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={directoryStyles.selectContent}>
                      <SelectItem
                        className={directoryStyles.selectOption}
                        value="all"
                      >
                        Tous les rôles
                      </SelectItem>
                      <SelectItem
                        className={directoryStyles.selectOption}
                        value="ADMIN"
                      >
                        Administrateurs
                      </SelectItem>
                      <SelectItem
                        className={directoryStyles.selectOption}
                        value="USER"
                      >
                        Utilisateurs
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={sortBy}
                    onValueChange={(value) => handleFilterChange('sort', value)}
                  >
                    <SelectTrigger
                      aria-label="Trier les comptes utilisateurs"
                      className={directoryStyles.selectTrigger}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={directoryStyles.selectContent}>
                      <SelectItem
                        className={directoryStyles.selectOption}
                        value="name"
                      >
                        {getSortLabel('name')}
                      </SelectItem>
                      <SelectItem
                        className={directoryStyles.selectOption}
                        value="recent"
                      >
                        {getSortLabel('recent')}
                      </SelectItem>
                      <SelectItem
                        className={directoryStyles.selectOption}
                        value="created"
                      >
                        {getSortLabel('created')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {hasActiveFilters && (
                    <Button
                      aria-label="Réinitialiser les filtres"
                      className={directoryStyles.iconButton}
                      onClick={clearFilters}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <RotateCcw aria-hidden="true" />
                    </Button>
                  )}
                </div>
              </form>
              <div className={directoryStyles.listCaption}>
                <p role="status" aria-live="polite">
                  {isLoading
                    ? 'Chargement…'
                    : isRefreshing
                      ? 'Actualisation…'
                      : loadError
                        ? 'Résultats non actualisés'
                        : `${totalFiltered.toLocaleString('fr-FR')} compte${totalFiltered !== 1 ? 's' : ''} trouvé${totalFiltered !== 1 ? 's' : ''}`}
                  {!isLoading &&
                    !isRefreshing &&
                    !loadError &&
                    hasTruncatedPagination && (
                      <>
                        . Affinez la recherche : seules les{' '}
                        {PAGINATION.MAX_PAGE.toLocaleString('fr-FR')} premières
                        pages sont accessibles.
                      </>
                    )}
                </p>
                <span>{pageSize} par page</span>
              </div>
            </div>
          }
        >
          <>
            {isLoading ? (
              <div role="status" aria-label="Chargement" className="p-4">
                <Skeleton className="h-72 rounded-lg" />
              </div>
            ) : (
              <>
                <DataTableDesktop>
                  <Table
                    aria-label="Comptes utilisateurs"
                    className={directoryStyles.table}
                  >
                    <TableHeader>
                      <TableRow>
                        <TableHead>Compte</TableHead>
                        <TableHead className="w-[130px]">Accès</TableHead>
                        <TableHead className="w-[130px]">État</TableHead>
                        {securityDetailsVisible && (
                          <TableHead className="w-[130px]">
                            Mot de passe
                          </TableHead>
                        )}
                        <TableHead className="w-[150px]">
                          Dernière connexion
                        </TableHead>
                        <TableHead className="w-12">
                          <span className="sr-only">Action</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedUsers.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={securityDetailsVisible ? 6 : 5}
                            className="h-44 text-center"
                          >
                            <ContentState
                              className="min-h-0 border-0 bg-transparent p-0"
                              icon={<UserMinus className="size-5" />}
                              layout="panel"
                              title={
                                loadError
                                  ? 'Utilisateurs indisponibles'
                                  : 'Aucun utilisateur trouvé'
                              }
                              action={
                                !loadError &&
                                hasActiveFilters && (
                                  <Button
                                    type="button"
                                    variant="link"
                                    size="sm"
                                    onClick={clearFilters}
                                  >
                                    Réinitialiser
                                  </Button>
                                )
                              }
                            />
                          </TableCell>
                        </TableRow>
                      ) : (
                        displayedUsers.map((user) => (
                          <TableRow
                            className="group/row focus-within:ring-ring relative cursor-pointer focus-within:ring-2 focus-within:ring-inset"
                            key={user.id}
                          >
                            <TableCell className="h-16 py-2 align-top">
                              <Link
                                aria-label={
                                  user.id === currentUser?.id
                                    ? 'Ouvrir mon compte'
                                    : `Ouvrir le compte de ${getUserDisplayName(user)}`
                                }
                                className="group/link flex min-w-0 items-start gap-2.5 rounded-md outline-none after:absolute after:inset-0 after:z-10 after:content-['']"
                                href={getUserDetailHref(user.id)}
                                prefetch={false}
                              >
                                <UserAvatar
                                  user={user}
                                  className="border-border-default size-9 shrink-0 rounded-full border"
                                />
                                <div className="min-w-0">
                                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                                    <span className="text-foreground truncate text-sm font-semibold">
                                      {getUserDisplayName(user)}
                                    </span>
                                    {isUserIdentityMasked(user) && (
                                      <span className="text-muted-foreground text-xs leading-5">
                                        Identité protégée
                                      </span>
                                    )}
                                  </div>
                                  <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                                    <p className="text-muted-foreground flex max-w-full min-w-0 items-center gap-1.5 truncate text-sm leading-5">
                                      <span className="min-w-0 truncate">
                                        {getUserLoginDisplay(user)}
                                      </span>
                                      {user.contactEmail && (
                                        <span className="truncate">
                                          · {user.contactEmail}
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                </div>
                              </Link>
                            </TableCell>
                            <TableCell className="pointer-events-none py-3">
                              <UserAccessLabel user={user} />
                            </TableCell>
                            <TableCell className="pointer-events-none py-3">
                              <UserStatusLabel isActive={user.isActive} />
                            </TableCell>
                            {securityDetailsVisible && (
                              <TableCell className="pointer-events-none py-3">
                                {user.mustChangePassword ? (
                                  <span className="border-warning/40 bg-warning/15 text-warning inline-flex w-fit shrink-0 items-center gap-1.5 rounded-[5px] border px-2 py-0.5 text-xs leading-5 font-medium whitespace-nowrap">
                                    <span
                                      aria-hidden="true"
                                      className="size-1.5 shrink-0 rounded-full bg-current"
                                    />
                                    À changer
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-xs">
                                    —
                                  </span>
                                )}
                              </TableCell>
                            )}
                            <TableCell className="text-muted-foreground pointer-events-none py-3 text-sm leading-5 tabular-nums">
                              {formatUserLastLogin(user)}
                            </TableCell>
                            <TableCell className="pointer-events-none py-3">
                              <ArrowRight
                                aria-hidden="true"
                                className="text-muted-foreground size-4"
                              />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </DataTableDesktop>
                <DataTableMobileList className={directoryStyles.mobileList}>
                  {displayedUsers.length === 0 ? (
                    <ContentState
                      className="min-h-48 border-0 bg-transparent"
                      icon={<UserMinus className="size-5" />}
                      layout="panel"
                      title={
                        loadError
                          ? 'Utilisateurs indisponibles'
                          : 'Aucun utilisateur trouvé'
                      }
                      action={
                        !loadError &&
                        hasActiveFilters && (
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            onClick={clearFilters}
                          >
                            Réinitialiser
                          </Button>
                        )
                      }
                    />
                  ) : (
                    displayedUsers.map((user) => (
                      <Link
                        aria-label={
                          user.id === currentUser?.id
                            ? 'Ouvrir mon compte'
                            : `Ouvrir le compte de ${getUserDisplayName(user)}`
                        }
                        className="focus-visible:bg-primary/10 focus-visible:ring-primary/70 block px-4 py-3 hover:bg-[var(--surface-row-hover)] focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
                        href={getUserDetailHref(user.id)}
                        key={user.id}
                        prefetch={false}
                      >
                        <div className="flex items-start gap-3">
                          <UserAvatar
                            user={user}
                            className="border-border-default size-9 shrink-0 rounded-full border"
                          />
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="min-w-0">
                              <div className="flex min-w-0 flex-wrap items-center gap-2">
                                <h3 className="text-foreground min-w-0 text-sm font-semibold [overflow-wrap:anywhere]">
                                  {getUserDisplayName(user)}
                                </h3>
                                {isUserIdentityMasked(user) && (
                                  <span className="text-muted-foreground text-xs leading-5">
                                    Identité protégée
                                  </span>
                                )}
                              </div>
                              <p className="text-muted-foreground mt-0.5 truncate text-sm leading-5">
                                {getUserLoginDisplay(user)}
                              </p>
                              {user.contactEmail && (
                                <p className="text-muted-foreground mt-0.5 text-sm leading-5 [overflow-wrap:anywhere]">
                                  {user.contactEmail}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                              <UserAccessLabel user={user} />
                              <UserStatusLabel isActive={user.isActive} />
                            </div>
                            {securityDetailsVisible &&
                              user.mustChangePassword && (
                                <div>
                                  <span className="border-warning/40 bg-warning/15 text-warning inline-flex w-fit shrink-0 items-center gap-1.5 rounded-[5px] border px-2 py-0.5 text-xs leading-5 font-medium whitespace-nowrap">
                                    <span
                                      aria-hidden="true"
                                      className="size-1.5 shrink-0 rounded-full bg-current"
                                    />
                                    Mot de passe à changer
                                  </span>
                                </div>
                              )}
                            <p className="text-muted-foreground text-sm leading-5 tabular-nums">
                              Dernière connexion :{' '}
                              {formatUserLastLogin(user).toLowerCase()}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                </DataTableMobileList>
              </>
            )}
            <nav
              aria-label="Pagination des utilisateurs"
              className={directoryStyles.pagination}
            >
              <p>
                Page <strong>{currentPage}</strong>
              </p>
              <div className={directoryStyles.paginationActions}>
                <Button
                  aria-label="Page précédente"
                  className={directoryStyles.pageButton}
                  disabled={isLoading || currentPage <= 1}
                  onClick={() =>
                    setCurrentPage((page) => Math.max(1, page - 1))
                  }
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <ChevronLeft aria-hidden="true" />
                </Button>
                <Button
                  aria-label="Page suivante"
                  className={directoryStyles.pageButton}
                  disabled={isLoading || currentPage >= totalPages}
                  onClick={() =>
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <ChevronRight aria-hidden="true" />
                </Button>
              </div>
            </nav>
          </>
        </DataTableSection>
      </div>
    </PageAsideLayout>
  );
};
