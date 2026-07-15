'use client';

import { UserRole } from '@repo/database';
import {
  ArrowUpDown,
  Clock,
  Key,
  type LucideIcon,
  Search,
  Shield,
  User,
  UserCheck,
  UserMinus,
  Users,
  X,
} from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React, {
  type FC,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { ContentState } from '$components/layout/ContentState';
import { UserAvatar } from '$components/users/UserAvatar';
import {
  getAccessLabel,
  getRoleColor,
  hasPermission,
  PERMISSIONS,
} from '$constants/permissions.constants';
import { useUser } from '$context/UserContext';
import type {
  PaginationInfo,
  UserStatsType,
  UserType,
} from '$types/auth.types';
import { Badge } from '$ui/badge';
import { Button } from '$ui/button';
import { Card, CardContent } from '$ui/card';
import {
  DataTableDesktop,
  DataTableMobileList,
  DataTableSection,
} from '$ui/data-table-section';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '$ui/dropdown-menu';
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
import { ScrollableTabsList, Tabs, TabsTrigger } from '$ui/tabs';

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
const USERS_PER_PAGE = 20;

const getSortLabel = (sort: SortOption): string => {
  switch (sort) {
    case 'created':
      return 'Création';
    case 'recent':
      return 'Connexion';
    case 'name':
    default:
      return 'Nom';
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

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
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
  limit: number;
  page: number;
  role: FilterRole;
  search: string;
  sort: SortOption;
  status: FilterStatus;
}): URLSearchParams => {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
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

type UsersStatTone = 'neutral' | 'warning';

type UsersStatToneClassNames = {
  icon: string;
  value: string;
};

const getUsersStatToneClassNames = (
  tone: UsersStatTone,
): UsersStatToneClassNames => {
  if (tone === 'warning') {
    return {
      icon: 'border-warning/35 bg-warning/10 text-warning',
      value: 'text-warning',
    };
  }

  return {
    icon: 'border-border/50 bg-surface-raised text-muted-foreground',
    value: 'text-foreground',
  };
};

const UserStatusBadge: FC<{ isActive: boolean }> = ({ isActive }) => {
  if (isActive) return <Badge variant="secondary">Actif</Badge>;

  return (
    <Badge
      variant="outline"
      className="border-muted-foreground/35 bg-muted/30 text-muted-foreground"
    >
      Inactif
    </Badge>
  );
};

const UsersStatCard: FC<{
  icon: LucideIcon;
  label: string;
  tone?: UsersStatTone;
  value: number;
}> = ({ icon: Icon, label, tone = 'neutral', value }) => {
  const toneClassNames = getUsersStatToneClassNames(tone);

  return (
    <Card className="border-border/45 bg-surface-muted overflow-hidden rounded-md py-0 shadow-none">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div
            className={`${toneClassNames.icon} flex h-9 w-9 items-center justify-center rounded-lg border shadow-none`}
          >
            <Icon size={18} />
          </div>
          <div>
            <p className={`${toneClassNames.value} text-xl font-semibold`}>
              {value}
            </p>
            <p className="text-muted-foreground text-xs">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const UsersListPage: FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentQueryString = searchParams.toString();
  const { userData: currentUser } = useUser();
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

        const params = buildUsersQueryParams({
          limit: USERS_PER_PAGE,
          page,
          role,
          search,
          sort,
          status,
        });

        const response = await fetch(`/api/users?${params.toString()}`, {
          signal: controller.signal,
        });
        const data = await response.json();

        if (controller.signal.aborted) return;

        if (response.ok && data.success) {
          const nextPagination = data.data.pagination as PaginationInfo;
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

  const openUserDetail = (userId: string): void => {
    router.push(
      userId === currentUser?.id
        ? '/mon-compte'
        : `/administration/utilisateurs/${userId}`,
    );
  };

  const handleOpenUserKeyDown = (
    event: React.KeyboardEvent,
    userId: string,
  ): void => {
    if (event.key !== 'Enter' && event.key !== ' ') return;

    event.preventDefault();
    openUserDetail(userId);
  };

  const hasActiveFilters =
    !!searchQuery ||
    filterStatus !== 'all' ||
    filterRole !== 'all' ||
    sortBy !== 'name';

  const displayedUsers = users;

  // Total pages from server pagination
  const totalPages = pagination?.totalPages || 1;
  const totalFiltered = pagination?.total || users.length;

  const formatRelativeTime = (date: Date | string | null): string => {
    if (!date) return 'Jamais';
    const now = new Date();
    const then = new Date(date);
    if (Number.isNaN(then.getTime())) return 'Jamais';

    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `${diffMins}min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 30) return `${diffDays}j`;

    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6" role="status" aria-label="Chargement">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-12" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
    );
  }

  return (
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
            lastSuccessfulLoadAt && users.length > 0
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
      {/* Stats Cards */}
      {stats && (
        <div
          className={`grid grid-cols-2 gap-3 ${
            securityDetailsVisible ? 'md:grid-cols-4' : 'md:grid-cols-3'
          }`}
        >
          <UsersStatCard icon={Users} label="Total" value={stats.total} />
          <UsersStatCard icon={UserCheck} label="Actifs" value={stats.active} />
          {securityDetailsVisible && stats.pendingPasswordChange !== null && (
            <UsersStatCard
              icon={Key}
              label="MDP temporaire"
              value={stats.pendingPasswordChange}
              tone="warning"
            />
          )}
          <UsersStatCard
            icon={Clock}
            label="Cnx 24h"
            value={stats.recentLogins}
          />
        </div>
      )}
      <DataTableSection
        title="Annuaire utilisateurs"
        description={
          <>
            {totalFiltered} utilisateur
            {totalFiltered !== 1 ? 's' : ''}
            {hasActiveFilters && stats && ` sur ${stats.total}`}
            {pagination &&
              totalPages > 1 &&
              ` - Page ${currentPage}/${totalPages}`}
            {isRefreshing && ' - Mise à jour...'}
            {!isRefreshing && lastSuccessfulLoadAt && (
              <span className="ml-1">
                - Actualisé à{' '}
                {lastSuccessfulLoadAt.toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
          </>
        }
        contentClassName={
          isRefreshing ? 'opacity-60 transition-opacity' : undefined
        }
        toolbar={
          <>
            <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative w-full lg:max-w-xs">
                <Search
                  size={16}
                  className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2"
                />
                <Input
                  aria-label="Rechercher un utilisateur"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  maxLength={USER_SEARCH_MAX_LENGTH}
                  className="h-9 pr-8 pl-9"
                />
                {searchQuery && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setSearchQuery('')}
                    className="text-muted-foreground hover:text-foreground absolute top-1/2 right-1 size-7 -translate-y-1/2"
                    aria-label="Effacer la recherche"
                  >
                    <X size={14} />
                  </Button>
                )}
              </div>
              <Tabs
                value={filterStatus}
                onValueChange={(value) => handleFilterChange('status', value)}
                className="min-w-0"
              >
                <ScrollableTabsList className="h-9 p-1">
                  <TabsTrigger value="all" className="h-7 px-2.5 text-xs">
                    Tous
                  </TabsTrigger>
                  <TabsTrigger value="active" className="h-7 px-2.5 text-xs">
                    Actifs
                  </TabsTrigger>
                  <TabsTrigger value="inactive" className="h-7 px-2.5 text-xs">
                    Inactifs
                  </TabsTrigger>
                  {canRequestSecurityDetails && (
                    <TabsTrigger value="pending" className="h-7 px-2.5 text-xs">
                      MDP
                    </TabsTrigger>
                  )}
                </ScrollableTabsList>
              </Tabs>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={filterRole}
                onValueChange={(v) => handleFilterChange('role', v)}
              >
                <SelectTrigger className="h-9 w-[140px]">
                  <SelectValue placeholder="Rôle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les rôles</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="USER">Utilisateur</SelectItem>
                </SelectContent>
              </Select>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-1.5">
                    <ArrowUpDown size={14} />
                    <span>Trier: {getSortLabel(sortBy)}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => handleFilterChange('sort', 'name')}
                  >
                    Nom (A-Z)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleFilterChange('sort', 'recent')}
                  >
                    Dernière connexion
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleFilterChange('sort', 'created')}
                  >
                    Date de création
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-muted-foreground h-9"
                >
                  <X size={14} />
                  Effacer
                </Button>
              )}
            </div>
          </>
        }
        pagination={
          totalPages > 1
            ? {
                limit: USERS_PER_PAGE,
                onPageChange: setCurrentPage,
                page: currentPage,
                total: totalFiltered,
                totalPages,
              }
            : undefined
        }
      >
        <DataTableDesktop>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Statut</TableHead>
                {securityDetailsVisible && <TableHead>Mot de passe</TableHead>}
                <TableHead>Dernière connexion</TableHead>
                <TableHead className="w-24 text-right">Action</TableHead>
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
                    key={user.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`Voir ${user.firstName} ${user.lastName}`}
                    className="focus-visible:bg-primary/10 focus-visible:ring-primary/70 cursor-pointer focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
                    onClick={() => openUserDetail(user.id)}
                    onKeyDown={(event) => handleOpenUserKeyDown(event, user.id)}
                  >
                    <TableCell>
                      <div className="flex min-w-0 items-center gap-3">
                        <UserAvatar user={user} className="size-9 rounded-md" />
                        <div className="min-w-0">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="text-foreground truncate font-medium">
                              {user.firstName} {user.lastName}
                            </span>
                            {user.isProtected && (
                              <Shield
                                size={14}
                                className="text-warning shrink-0"
                              />
                            )}
                          </div>
                          <p className="text-muted-foreground truncate font-mono text-xs">
                            {user.loginName}
                          </p>
                          {user.contactEmail && (
                            <p className="text-muted-foreground/80 truncate text-xs">
                              {user.contactEmail}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={getRoleColor(user.role)}
                        className="shrink-0"
                      >
                        {user.role === 'ADMIN' ? (
                          <Shield size={10} className="mr-1" />
                        ) : (
                          <User size={10} className="mr-1" />
                        )}
                        {getAccessLabel(user)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <UserStatusBadge isActive={user.isActive} />
                    </TableCell>
                    {securityDetailsVisible && (
                      <TableCell>
                        {user.mustChangePassword ? (
                          <Badge
                            variant="outline"
                            className="border-warning/40 text-warning"
                          >
                            <Key size={10} className="mr-1" />À changer
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            À jour
                          </span>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="text-muted-foreground text-xs">
                      {formatRelativeTime(user.lastLoginAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          openUserDetail(user.id);
                        }}
                      >
                        {user.id === currentUser?.id ? 'Mon compte' : 'Ouvrir'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </DataTableDesktop>
        <DataTableMobileList>
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
              <div
                key={user.id}
                role="button"
                tabIndex={0}
                aria-label={`Voir ${user.firstName} ${user.lastName}`}
                className="hover:bg-surface-raised/70 focus-visible:bg-primary/10 focus-visible:ring-primary/70 cursor-pointer p-4 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
                onClick={() => openUserDetail(user.id)}
                onKeyDown={(event) => handleOpenUserKeyDown(event, user.id)}
              >
                <div className="flex items-start gap-3">
                  <UserAvatar user={user} className="size-11 rounded-lg" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <h3 className="text-foreground truncate font-medium">
                          {user.firstName} {user.lastName}
                        </h3>
                        {user.isProtected && (
                          <Shield size={14} className="text-warning shrink-0" />
                        )}
                      </div>
                      <p className="text-muted-foreground truncate font-mono text-sm">
                        {user.loginName}
                      </p>
                      {user.contactEmail && (
                        <p className="text-muted-foreground/80 truncate text-xs">
                          {user.contactEmail}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant={getRoleColor(user.role)}
                        className="text-xs"
                      >
                        {getAccessLabel(user)}
                      </Badge>
                      {!user.isActive && (
                        <UserStatusBadge isActive={user.isActive} />
                      )}
                      {securityDetailsVisible && user.mustChangePassword && (
                        <Badge
                          variant="outline"
                          className="border-warning/40 text-warning text-xs"
                        >
                          MDP temporaire
                        </Badge>
                      )}
                      <span className="text-muted-foreground ml-auto text-xs">
                        {formatRelativeTime(user.lastLoginAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </DataTableMobileList>
      </DataTableSection>
    </div>
  );
};
