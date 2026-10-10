import { UserRole } from '@repo/shared';

import { PAGINATION } from '$constants/pagination.constants';

export type FilterStatus = 'all' | 'active' | 'inactive' | 'pending';
export type FilterRole = 'all' | 'SUPERADMIN' | UserRole;
export type SortOption = 'name' | 'recent' | 'created';

export const FILTER_STATUS_OPTIONS: readonly FilterStatus[] = [
  'all',
  'active',
  'inactive',
  'pending',
];
export const FILTER_ROLE_OPTIONS: readonly FilterRole[] = [
  'all',
  'SUPERADMIN',
  UserRole.ADMIN,
  UserRole.USER,
];
export const SORT_OPTIONS: readonly SortOption[] = [
  'name',
  'recent',
  'created',
];
export const USER_SEARCH_MAX_LENGTH = 100;

export const getSortLabel = (sort: SortOption): string => {
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

export const normalizeFilterStatus = (value: string | null): FilterStatus =>
  FILTER_STATUS_OPTIONS.includes(value as FilterStatus)
    ? (value as FilterStatus)
    : 'all';

export const normalizeFilterRole = (value: string | null): FilterRole =>
  FILTER_ROLE_OPTIONS.includes(value as FilterRole)
    ? (value as FilterRole)
    : 'all';

export const normalizeSortOption = (value: string | null): SortOption =>
  SORT_OPTIONS.includes(value as SortOption) ? (value as SortOption) : 'name';

export const normalizePage = (value: string | null): number => {
  const parsed = value && /^[1-9]\d*$/u.test(value) ? Number(value) : 1;

  return Number.isFinite(parsed) && parsed > 0
    ? Math.min(parsed, PAGINATION.MAX_PAGE)
    : 1;
};

export const normalizeSearchQuery = (value: string | null): string =>
  (value ?? '').trim().slice(0, USER_SEARCH_MAX_LENGTH);

export const buildUsersQueryParams = ({
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

export const buildUsersPageUrlParams = ({
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
