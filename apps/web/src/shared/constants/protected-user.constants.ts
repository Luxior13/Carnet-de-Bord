export const PROTECTED_USER_PUBLIC_FIRST_NAME = 'Compte';
export const PROTECTED_USER_PUBLIC_LAST_NAME = 'racine';
export const PROTECTED_USER_PUBLIC_DISPLAY_NAME = 'Superadministrateur';
export const PROTECTED_USER_MASKED_LOGIN_NAME = '••••••••';

const PROTECTED_USER_PUBLIC_SEARCH_TERMS = [
  PROTECTED_USER_PUBLIC_DISPLAY_NAME,
  `${PROTECTED_USER_PUBLIC_FIRST_NAME} ${PROTECTED_USER_PUBLIC_LAST_NAME}`,
  'superadmin',
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

  return PROTECTED_USER_PUBLIC_SEARCH_TERMS.some((term) =>
    normalizePublicSearchTerm(term).includes(normalizedSearch),
  );
};
