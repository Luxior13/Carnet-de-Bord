// One visible name for the protected account (audit DRT-05, 25 October 2026).
export const PROTECTED_USER_PUBLIC_FIRST_NAME = 'Superadmin';
export const PROTECTED_USER_PUBLIC_LAST_NAME = '';
export const PROTECTED_USER_PUBLIC_DISPLAY_NAME = 'Superadmin';
export const PROTECTED_USER_MASKED_LOGIN_NAME = '••••••••';

const PROTECTED_USER_PUBLIC_SEARCH_TERMS = [
  PROTECTED_USER_PUBLIC_DISPLAY_NAME,
  // Former names, still typed by people looking for this account.
  'superadministrateur',
  'compte racine',
  'compte protege',
] as const;

const normalizePublicSearchTerm = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr')
    .trim();

export const matchesProtectedUserPublicIdentity = (search: string): boolean => {
  const normalizedSearch = normalizePublicSearchTerm(search);

  if (!normalizedSearch) return false;

  const words = normalizedSearch.split(/\s+/u);

  return PROTECTED_USER_PUBLIC_SEARCH_TERMS.some((term) => {
    const identity = normalizePublicSearchTerm(term);

    return words.every((word) => identity.includes(word));
  });
};
