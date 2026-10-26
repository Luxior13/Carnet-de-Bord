import { type UserRole } from '@repo/shared';

import { getFeatureById } from '$constants/feature-registry.constants';
import {
  getEffectivePermissions,
  getPermissionItem,
  getRoleBasePermissions,
  normalizeRolePermissionOverrides,
  PERMISSION_CATEGORIES,
  PERMISSION_POLES,
  type PermissionCategory,
  type PermissionItem,
  type PermissionsData,
} from '$constants/permissions.constants';

/** Only capabilities belonging to currently usable pages are presented. */
export const PERMISSION_EDITOR_CATEGORIES = PERMISSION_CATEGORIES.flatMap(
  (category): Array<PermissionCategory & { scope: 'page' | 'cross-page' }> => {
    if (getFeatureById(category.key)?.availability !== 'live') return [];

    return [{ ...category, scope: 'page' }];
  },
);

export type PermissionEditorState = {
  configured: ReadonlyMap<string, boolean>;
  effective: ReadonlyMap<string, boolean>;
  roleDefaults: ReadonlyMap<string, boolean>;
};

export type PermissionCategoryResult = {
  enabled: number;
  incomplete: number;
  ready: number;
  total: number;
};

/** Keep the saved/draft choice distinct from access after dependencies. */
export const buildPermissionEditorState = (
  role: UserRole,
  permissions: PermissionsData | null,
): PermissionEditorState => {
  const overrides = normalizeRolePermissionOverrides(role, permissions);
  const roleDefaults = new Map(Object.entries(getRoleBasePermissions(role)));
  const configured = new Map(roleDefaults);
  for (const [key, value] of Object.entries(overrides ?? {})) {
    configured.set(key, value);
  }
  const effective = new Map(
    Object.entries(getEffectivePermissions(role, overrides)),
  );

  return { configured, effective, roleDefaults };
};

export const getMissingPermissionDependencies = (
  permission: PermissionItem,
  configured: ReadonlyMap<string, boolean>,
  effective: ReadonlyMap<string, boolean>,
): string[] => {
  if (!configured.get(permission.key)) return [];
  const missing = new Set<string>();
  const visited = new Set<string>();
  const visit = (key: string): void => {
    if (visited.has(key)) return;
    visited.add(key);
    for (const dependency of getPermissionItem(key)?.dependencies ?? []) {
      if (!effective.get(dependency)) missing.add(dependency);
      visit(dependency);
    }
  };
  visit(permission.key);

  return [...missing];
};

export const countCategoryPermissionResults = (
  category: PermissionCategory,
  configured: ReadonlyMap<string, boolean>,
  effective: ReadonlyMap<string, boolean>,
): PermissionCategoryResult => ({
  enabled: category.permissions.filter((item) => configured.get(item.key))
    .length,
  incomplete: category.permissions.filter(
    (item) => configured.get(item.key) && !effective.get(item.key),
  ).length,
  ready: category.permissions.filter((item) => effective.get(item.key)).length,
  total: category.permissions.length,
});

export type PermissionEditorCategory =
  (typeof PERMISSION_EDITOR_CATEGORIES)[number];

/**
 * Poles holding at least one live page, in catalog order. The editor
 * navigation lists them so it scales with new modules (26 October 2026).
 */
export const PERMISSION_EDITOR_POLES = PERMISSION_POLES.flatMap((pole) => {
  const categories = PERMISSION_EDITOR_CATEGORIES.filter(
    (category) => category.poleKey === pole.key,
  );

  return categories.length > 0 ? [{ ...pole, categories }] : [];
});

const DIACRITIC_PATTERN = /\p{Diacritic}/gu;

/** Accent- and case-insensitive form used by the permission search. */
export const normalizePermissionSearch = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(DIACRITIC_PATTERN, '')
    .toLocaleLowerCase('fr-FR')
    .trim()
    .replace(/\s+/g, ' ');

// Short French words that carry no meaning in a search (« mot de passe »).
const IGNORED_SEARCH_WORDS = new Set([
  'a',
  'au',
  'aux',
  'd',
  'de',
  'des',
  'du',
  'en',
  'et',
  'l',
  'la',
  'le',
  'les',
  'sa',
  'ses',
  'son',
  'un',
  'une',
]);

/** « utilisateurs » finds « utilisateur », and the reverse. */
const toSingular = (word: string): string =>
  word.length > 3 && /[sx]$/u.test(word) ? word.slice(0, -1) : word;

/**
 * Words of a search, accent- and case-insensitive, without filler words and
 * reduced to the singular. Empty when nothing meaningful was typed.
 */
export const getPermissionSearchTerms = (query: string): string[] =>
  normalizePermissionSearch(query)
    .split(/[^\da-z]+/u)
    .filter((word) => word !== '' && !IGNORED_SEARCH_WORDS.has(word))
    .map(toSingular);

/**
 * Every word must appear, in any order (same rule as the management lists),
 * in the permission label, its section, its description, its page or its
 * pole (26 October 2026: the former exact-phrase search was too strict).
 */
export const matchesPermissionSearch = (
  permission: PermissionItem,
  category: PermissionEditorCategory,
  terms: readonly string[],
  poleLabel = '',
): boolean => {
  if (terms.length === 0) return false;
  const searchable = normalizePermissionSearch(
    [
      permission.label,
      permission.module,
      permission.description,
      category.label,
      poleLabel,
    ].join(' '),
  );

  return terms.every((term) => searchable.includes(term));
};

/** Use the same live administrative scope in the editor and the saved overview. */
export const countUsablePermissions = (
  effective: ReadonlyMap<string, boolean>,
): Pick<PermissionCategoryResult, 'ready' | 'total'> => {
  const permissions = PERMISSION_EDITOR_CATEGORIES.flatMap(
    (category) => category.permissions,
  );

  return {
    ready: permissions.filter((item) => effective.get(item.key)).length,
    total: permissions.length,
  };
};
