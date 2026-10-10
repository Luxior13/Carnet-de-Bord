import { Prisma } from '@prisma/client';

import { matchesProtectedUserPublicIdentity } from '$constants/protected-user.constants';

const USER_SEARCH_ACCENT_FROM = 'àâäéèêëîïôöùûüç';
const USER_SEARCH_ACCENT_TO = 'aaaeeeeiioouuuc';
const USER_SEARCH_TRANSLATE_FROM = `${USER_SEARCH_ACCENT_FROM}${USER_SEARCH_ACCENT_FROM.toLocaleUpperCase('fr-FR')}`;
const USER_SEARCH_TRANSLATE_TO = `${USER_SEARCH_ACCENT_TO}${USER_SEARCH_ACCENT_TO}`;

const normalizeUserSearchValue = (value: string): string => {
  const lowered = value.toLocaleLowerCase('fr-FR');
  let normalized = '';
  for (const character of lowered) {
    const index = USER_SEARCH_ACCENT_FROM.indexOf(character);
    // The index is bounded by the fixed accent table above.
    // eslint-disable-next-line security/detect-object-injection
    normalized += index >= 0 ? USER_SEARCH_ACCENT_TO[index] : character;
  }

  return normalized.trim().replace(/\s+/g, ' ');
};

const escapeUserSearchLikePattern = (value: string): string =>
  value.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_');

export const buildUserSearchQuery = (
  search: string,
  options: { canViewContact: boolean; isProtected: boolean },
): Prisma.Sql => {
  const query = normalizeUserSearchValue(search.trim().slice(0, 100));
  const field = (column: string, value: string): Prisma.Sql =>
    Prisma.sql`lower(translate(${Prisma.raw('"' + column + '"')}, ${USER_SEARCH_TRANSLATE_FROM}, ${USER_SEARCH_TRANSLATE_TO})) LIKE ${'%' + escapeUserSearchLikePattern(value) + '%'} ESCAPE '\\'`;
  // Every identity word must match a visible identity field. Contact remains a
  // whole-query match so fragments cannot be combined with a hidden address.
  const identity = Prisma.join(
    query.split(/\s+/u).map(
      (word) =>
        Prisma.sql`(${Prisma.join(
          ['loginName', 'firstName', 'lastName'].map((column) =>
            field(column, word),
          ),
          ' OR ',
        )})`,
    ),
    ' AND ',
  );
  const fields = Prisma.sql`((${identity})${options.canViewContact ? Prisma.sql` OR ${field('contactEmail', query)}` : Prisma.empty})`;
  const includeProtected =
    !options.isProtected && matchesProtectedUserPublicIdentity(search);
  const visible = options.isProtected
    ? fields
    : Prisma.sql`(("isProtected" = false AND ${fields})${includeProtected ? Prisma.sql` OR "isProtected" = true` : Prisma.empty})`;

  return Prisma.sql`SELECT "id" FROM "User" WHERE "deletedAt" IS NULL AND ${visible}`;
};
