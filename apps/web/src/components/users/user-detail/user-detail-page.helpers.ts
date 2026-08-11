import {
  DEFAULT_USER_HISTORY_FILTERS,
  type UserHistoryFilters,
} from '$components/users/user-detail/UserHistoryTab';
import { FEATURES } from '$constants/feature-registry.constants';
import {
  getAccessPermissionKeys,
  getAccountPermissionKeys,
  PERMISSION_CATEGORIES,
  type PermissionsData,
} from '$constants/permissions.constants';
import type { GuardedNavigationAction } from '$utils/guarded-navigation.utils';

import type { UserDetailSectionId } from './UserDetailNavigation';

export type UserDetailPendingNavigation =
  | {
      action?: GuardedNavigationAction;
      href: string;
      kind: 'href';
    }
  | {
      href: string;
      kind: 'section';
    };

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/;
export const LOGIN_NAME_PATTERN = /^[a-z0-9][a-z0-9._-]{1,30}[a-z0-9]$/;

const DEFAULT_PERMISSION_PAGE_KEY = PERMISSION_CATEGORIES[0]?.key ?? '';
export const ACCESS_PERMISSION_KEYS = getAccessPermissionKeys();
export const ACCOUNT_PERMISSION_KEYS = getAccountPermissionKeys();

export const havePermissionOverridesChangedForKeys = (
  first: PermissionsData | null | undefined,
  second: PermissionsData | null | undefined,
  permissionKeys: readonly string[],
): boolean => {
  const firstPermissionsMap = new Map(Object.entries(first ?? {}));
  const secondPermissionsMap = new Map(Object.entries(second ?? {}));

  for (const permissionKey of permissionKeys) {
    if (
      firstPermissionsMap.get(permissionKey) !==
      secondPermissionsMap.get(permissionKey)
    ) {
      return true;
    }
  }

  return false;
};

export const resetPermissionOverridesForKeys = (
  currentPermissions: PermissionsData | null | undefined,
  originalPermissions: PermissionsData | null | undefined,
  permissionKeys: readonly string[],
): PermissionsData | null => {
  const nextPermissionsMap = new Map(Object.entries(currentPermissions ?? {}));
  const originalPermissionsMap = new Map(
    Object.entries(originalPermissions ?? {}),
  );

  for (const permissionKey of permissionKeys) {
    const originalValue = originalPermissionsMap.get(permissionKey);

    if (typeof originalValue === 'boolean') {
      nextPermissionsMap.set(permissionKey, originalValue);
    } else {
      nextPermissionsMap.delete(permissionKey);
    }
  }

  return nextPermissionsMap.size > 0
    ? (Object.fromEntries(nextPermissionsMap) as PermissionsData)
    : null;
};

export const selectPermissionOverridesForKeys = (
  permissions: PermissionsData | null | undefined,
  permissionKeys: readonly string[],
): PermissionsData | null => {
  const permissionKeySet = new Set(permissionKeys);
  const selectedPermissions = Object.fromEntries(
    Object.entries(permissions ?? {}).filter(([permissionKey]) =>
      permissionKeySet.has(permissionKey),
    ),
  ) as PermissionsData;

  return Object.keys(selectedPermissions).length > 0
    ? selectedPermissions
    : null;
};

export const buildUserDetailSectionHref = (
  pathname: string,
  currentQueryString: string,
  sectionId: UserDetailSectionId,
): string => {
  const nextParams = new URLSearchParams(currentQueryString);

  if (sectionId === 'profile') {
    nextParams.delete('section');
  } else {
    nextParams.set('section', sectionId);
  }

  const nextQueryString = nextParams.toString();

  return nextQueryString ? `${pathname}?${nextQueryString}` : pathname;
};

export const normalizePermissionPageKey = (pageKey: string | null): string => {
  if (!pageKey) return DEFAULT_PERMISSION_PAGE_KEY;

  const canonicalPageKey =
    pageKey === 'audit' ? FEATURES.systemActivity.audit.pageKey : pageKey;

  return PERMISSION_CATEGORIES.some(
    (category) => category.key === canonicalPageKey,
  )
    ? canonicalPageKey
    : DEFAULT_PERMISSION_PAGE_KEY;
};

export const appendUserAuditFilters = (
  params: URLSearchParams,
  filters: UserHistoryFilters,
): void => {
  params.set('scope', filters.activityScope);
  params.set('period', filters.dateFilter);
  if (filters.poleFilter !== 'all') {
    params.set('poleKey', filters.poleFilter);
  }
  if (filters.pageFilter !== 'all') {
    params.set('pageKey', filters.pageFilter);
  }
};

export const getUserAuditFiltersFromParams = (params: {
  get: (name: string) => string | null;
}): UserHistoryFilters => {
  const requestedScope = params.get('scope');
  const requestedPeriod = params.get('period');

  return {
    activityScope:
      requestedScope === 'all' ||
      requestedScope === 'by' ||
      requestedScope === 'on'
        ? requestedScope
        : DEFAULT_USER_HISTORY_FILTERS.activityScope,
    dateFilter:
      requestedPeriod === 'all' ||
      requestedPeriod === '7' ||
      requestedPeriod === '30' ||
      requestedPeriod === '90'
        ? requestedPeriod
        : DEFAULT_USER_HISTORY_FILTERS.dateFilter,
    pageFilter:
      params.get('pageKey') || DEFAULT_USER_HISTORY_FILTERS.pageFilter,
    poleFilter:
      params.get('poleKey') || DEFAULT_USER_HISTORY_FILTERS.poleFilter,
  };
};

export const getUserAuditFiltersKey = (filters: UserHistoryFilters): string =>
  [
    filters.activityScope,
    filters.dateFilter,
    filters.poleFilter,
    filters.pageFilter,
  ].join('|');

export const isPlainLeftClick = (event: MouseEvent): boolean =>
  event.button === 0 &&
  !event.metaKey &&
  !event.altKey &&
  !event.ctrlKey &&
  !event.shiftKey;

export const findAnchorElement = (
  target: EventTarget | null,
): HTMLAnchorElement | null => {
  if (!(target instanceof Element)) return null;

  return target.closest('a[href]');
};

export const isInternalNavigationLink = (
  anchor: HTMLAnchorElement,
): boolean => {
  const target = anchor.getAttribute('target');
  const href = anchor.getAttribute('href');

  if (!href) return false;
  if (target && target !== '_self') return false;
  if (
    href.startsWith('#') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:')
  ) {
    return false;
  }

  return anchor.origin === window.location.origin;
};
