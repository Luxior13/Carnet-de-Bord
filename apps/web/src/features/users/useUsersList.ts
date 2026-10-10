'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { PAGINATION } from '$constants/pagination.constants';
import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import { useUser } from '$context/UserContext';
import type {
  PaginationInfo,
  UserStatsType,
  UserType,
} from '$types/auth.types';

import {
  buildUsersPageUrlParams,
  buildUsersQueryParams,
  type FilterRole,
  type FilterStatus,
  normalizeFilterRole,
  normalizeFilterStatus,
  normalizePage,
  normalizeSearchQuery,
  normalizeSortOption,
  type SortOption,
} from './users-list-state';

export const useUsersList = (): UsersListController => {
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
  const canViewContact =
    !!currentUser &&
    (currentUser.isProtected ||
      hasPermission(
        currentUser.role,
        PERMISSIONS.USERS.VIEW_CONTACT,
        currentUser.permissions,
      ) ||
      hasPermission(
        currentUser.role,
        PERMISSIONS.USERS.UPDATE_CONTACT,
        currentUser.permissions,
      ));

  const [users, setUsers] = useState<UserType[]>([]);
  const [responseQuery, setResponseQuery] = useState<string | null>(null);
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
          setResponseQuery(null);
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
          setResponseQuery(
            buildUsersPageUrlParams({
              page,
              role,
              search,
              sort,
              status,
            }).toString(),
          );
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

  const hasActiveFilters =
    !!searchQuery ||
    filterStatus !== 'all' ||
    filterRole !== 'all' ||
    sortBy !== 'name';

  const query = buildUsersPageUrlParams({
    page: currentPage,
    role: filterRole,
    search: debouncedSearch,
    sort: sortBy,
    status: effectiveFilterStatus,
  }).toString();
  // A retained response is only meaningful for the criteria that produced it.
  // This also prevents stale rows flashing under a new filter during loading.
  const hasMatchingResponse = responseQuery === query;
  const displayedUsers = hasMatchingResponse ? users : [];

  // Total pages from server pagination
  const visiblePagination = hasMatchingResponse ? pagination : null;
  const totalPages = Math.min(
    visiblePagination?.totalPages || 1,
    PAGINATION.MAX_PAGE,
  );
  const hasTruncatedPagination =
    (visiblePagination?.totalPages ?? 0) > PAGINATION.MAX_PAGE;
  const totalFiltered = visiblePagination?.total ?? displayedUsers.length;
  const pageSize = visiblePagination?.limit ?? PAGINATION.DEFAULT_LIMIT;

  return {
    canCreateUsers,
    canRequestSecurityDetails,
    canViewContact,
    clearFilters,
    currentPage,
    currentQueryString: query,
    currentUser,
    debouncedSearch,
    displayedUsers,
    fetchUsers,
    filterRole,
    filterStatus: effectiveFilterStatus,
    handleFilterChange,
    hasActiveFilters,
    hasTruncatedPagination,
    isLoading: isLoading || (!hasMatchingResponse && !loadError),
    isRefreshing,
    lastSuccessfulLoadAt: hasMatchingResponse ? lastSuccessfulLoadAt : null,
    loadError,
    pageSize,
    pagination: visiblePagination,
    searchQuery,
    securityDetailsVisible,
    setCurrentPage,
    setDebouncedSearch,
    setSearchQuery,
    sortBy,
    stats,
    totalFiltered,
    totalPages,
  };
};
export type UsersListController = {
  canCreateUsers: boolean;
  canRequestSecurityDetails: boolean;
  canViewContact: boolean;
  clearFilters: () => void;
  currentPage: number;
  currentQueryString: string;
  currentUser: UserType | null;
  debouncedSearch: string;
  displayedUsers: UserType[];
  fetchUsers: (
    page?: number,
    search?: string,
    status?: FilterStatus,
    role?: FilterRole,
    sort?: SortOption,
  ) => Promise<void>;
  filterRole: FilterRole;
  filterStatus: FilterStatus;
  handleFilterChange: (type: 'status' | 'role' | 'sort', value: string) => void;
  hasActiveFilters: boolean;
  hasTruncatedPagination: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  lastSuccessfulLoadAt: Date | null;
  loadError: string | null;
  pageSize: number;
  pagination: PaginationInfo | null;
  searchQuery: string;
  securityDetailsVisible: boolean;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  setDebouncedSearch: React.Dispatch<React.SetStateAction<string>>;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  sortBy: SortOption;
  stats: UserStatsType | null;
  totalFiltered: number;
  totalPages: number;
};
