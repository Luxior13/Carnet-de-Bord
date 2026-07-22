import 'server-only';

import { Prisma } from '@prisma/client';

import {
  hashPersonNormalizedUrl,
  normalizePersonEmail,
  normalizePersonSearchValue,
  normalizePersonSocialIdentifier,
  normalizePersonSocialUrl,
} from './person-normalization';

const escapeLikePattern = (value: string): string =>
  value.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_');

export type PersonSearchFragments = {
  contactSearchClause: Prisma.Sql;
  normalizedQuery: string;
  searchClause: Prisma.Sql;
};

export const buildPersonSearchFragments = (
  rawQuery: string,
): PersonSearchFragments => {
  const normalizedQuery = normalizePersonSearchValue(rawQuery);
  const normalizedEmailQuery = normalizePersonEmail(rawQuery);
  const normalizedIdentifierQuery = normalizePersonSocialIdentifier(rawQuery);
  const normalizedPhoneQuery = rawQuery.trim().replace(/[^\d+]/g, '');
  let normalizedProfileUrl: string | null = null;
  let normalizedProfileUrlHash: string | null = null;
  try {
    const candidateProfileUrl = normalizePersonSocialUrl(rawQuery);
    const protocol = new URL(candidateProfileUrl).protocol;
    if (protocol === 'http:' || protocol === 'https:') {
      normalizedProfileUrl = candidateProfileUrl;
      normalizedProfileUrlHash = hashPersonNormalizedUrl(candidateProfileUrl);
    }
  } catch {
    // Most terms are not URLs. Valid absolute HTTP(S) URLs alone use the
    // exact hash lookup; they still participate in identity search.
  }

  const escapedQuery = escapeLikePattern(normalizedQuery);
  const identityPrefixPattern = `${escapedQuery}%`;
  const identityTrigramPattern = `%${escapedQuery}%`;
  const emailPrefixPattern = `${escapeLikePattern(normalizedEmailQuery)}%`;
  const identifierPrefixPattern = `${escapeLikePattern(normalizedIdentifierQuery)}%`;
  const phonePrefixPattern = `${escapeLikePattern(normalizedPhoneQuery)}%`;
  const identityTrigramClause =
    normalizedQuery.length >= 3
      ? Prisma.sql`
          OR p."normalizedNickname" LIKE ${identityTrigramPattern} ESCAPE '\\'
          OR p."normalizedFirstName" LIKE ${identityTrigramPattern} ESCAPE '\\'
          OR p."normalizedLastName" LIKE ${identityTrigramPattern} ESCAPE '\\'
        `
      : Prisma.empty;
  const phoneSearchClause = normalizedPhoneQuery
    ? Prisma.sql`OR EXISTS (
          SELECT 1 FROM "PersonPhone" phone
          WHERE phone."personId" = p."id"
            AND (
              phone."normalizedPhone" = ${normalizedPhoneQuery}
              OR phone."normalizedPhone" LIKE ${phonePrefixPattern} ESCAPE '\\'
            )
        )`
    : Prisma.empty;
  const profileUrlSearchClause =
    normalizedProfileUrlHash && normalizedProfileUrl
      ? Prisma.sql`OR EXISTS (
          SELECT 1 FROM "PersonSocialProfile" social_url
          WHERE social_url."personId" = p."id"
            AND social_url."normalizedProfileUrlHash" = ${normalizedProfileUrlHash}
            AND social_url."normalizedProfileUrl" = ${normalizedProfileUrl}
        )`
      : Prisma.empty;
  const contactSearchClause = Prisma.sql`
        EXISTS (
          SELECT 1 FROM "PersonEmail" email
          WHERE email."personId" = p."id"
            AND (
              email."normalizedEmail" = ${normalizedEmailQuery}
              OR email."normalizedEmail" LIKE ${emailPrefixPattern} ESCAPE '\\'
            )
        )
        ${phoneSearchClause}
        OR EXISTS (
          SELECT 1 FROM "PersonSocialProfile" social
          WHERE social."personId" = p."id"
            AND (
              social."normalizedIdentifier" = ${normalizedIdentifierQuery}
              OR social."normalizedIdentifier" LIKE ${identifierPrefixPattern} ESCAPE '\\'
            )
        )
        ${profileUrlSearchClause}
  `;
  const searchClause = normalizedQuery
    ? Prisma.sql`AND (
        p."normalizedNickname" = ${normalizedQuery}
        OR p."normalizedFirstName" = ${normalizedQuery}
        OR p."normalizedLastName" = ${normalizedQuery}
        OR p."normalizedNickname" LIKE ${identityPrefixPattern} ESCAPE '\\'
        OR p."normalizedFirstName" LIKE ${identityPrefixPattern} ESCAPE '\\'
        OR p."normalizedLastName" LIKE ${identityPrefixPattern} ESCAPE '\\'
        ${identityTrigramClause}
        OR ${contactSearchClause}
      )`
    : Prisma.empty;

  return { contactSearchClause, normalizedQuery, searchClause };
};
