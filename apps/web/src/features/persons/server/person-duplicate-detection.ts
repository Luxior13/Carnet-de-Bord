import 'server-only';

import { type Prisma, type PrismaClient } from '@prisma/client';

import type { PersonDuplicateWarning } from '../types/person.types';
import { normalizePersonEmail } from './person-normalization';

type PersonClient = Prisma.TransactionClient | PrismaClient;

type CreationSocialProfile = Readonly<{
  networkKey: string;
  normalizedIdentifier: string | null;
  normalizedProfileUrl: string | null;
  normalizedProfileUrlHash: string | null;
}>;

type CreationDuplicateInput = Readonly<{
  emails: readonly Readonly<{ email: string }>[];
  phones: readonly Readonly<{ normalizedPhone: string }>[];
  socialProfiles: readonly CreationSocialProfile[];
}>;

type CreationDuplicateWarnings = Readonly<{
  emailWarnings: PersonDuplicateWarning[];
  phoneWarnings: PersonDuplicateWarning[];
  socialWarnings: PersonDuplicateWarning[];
}>;

const socialIdentifierKey = (
  networkKey: string,
  normalizedIdentifier: string,
): string => `${networkKey}\u0000${normalizedIdentifier}`;

const socialUrlKey = (
  networkKey: string,
  normalizedProfileUrlHash: string,
  normalizedProfileUrl: string,
): string =>
  `${networkKey}\u0000${normalizedProfileUrlHash}\u0000${normalizedProfileUrl}`;

/**
 * Checks every initial collection with at most one indexed query per table.
 * The bounded creation limits keep each `IN`/`OR` clause small, while avoiding
 * a query per field as more contacts are added to the form.
 */
export const getCreationDuplicateWarnings = async (
  client: PersonClient,
  input: CreationDuplicateInput,
): Promise<CreationDuplicateWarnings> => {
  const normalizedEmails = input.emails.map((item) =>
    normalizePersonEmail(item.email),
  );
  const normalizedPhones = input.phones.map((item) => item.normalizedPhone);
  const socialPredicates = input.socialProfiles.flatMap((profile) => [
    ...(profile.normalizedIdentifier
      ? [
          {
            networkKey: profile.networkKey,
            normalizedIdentifier: profile.normalizedIdentifier,
          },
        ]
      : []),
    ...(profile.normalizedProfileUrlHash && profile.normalizedProfileUrl
      ? [
          {
            networkKey: profile.networkKey,
            normalizedProfileUrl: profile.normalizedProfileUrl,
            normalizedProfileUrlHash: profile.normalizedProfileUrlHash,
          },
        ]
      : []),
  ]);

  const [emailMatches, phoneMatches, socialMatches] = await Promise.all([
    normalizedEmails.length > 0
      ? client.personEmail.findMany({
          select: { normalizedEmail: true },
          where: { normalizedEmail: { in: [...new Set(normalizedEmails)] } },
        })
      : Promise.resolve([]),
    normalizedPhones.length > 0
      ? client.personPhone.findMany({
          select: { normalizedPhone: true },
          where: { normalizedPhone: { in: [...new Set(normalizedPhones)] } },
        })
      : Promise.resolve([]),
    socialPredicates.length > 0
      ? client.personSocialProfile.findMany({
          select: {
            networkKey: true,
            normalizedIdentifier: true,
            normalizedProfileUrl: true,
            normalizedProfileUrlHash: true,
          },
          where: { OR: socialPredicates },
        })
      : Promise.resolve([]),
  ]);

  const matchedEmails = new Set(
    emailMatches.map((item) => item.normalizedEmail),
  );
  const matchedPhones = new Set(
    phoneMatches.map((item) => item.normalizedPhone),
  );
  const matchedSocialIdentifiers = new Set(
    socialMatches.flatMap((item) =>
      item.normalizedIdentifier
        ? [socialIdentifierKey(item.networkKey, item.normalizedIdentifier)]
        : [],
    ),
  );
  const matchedSocialUrls = new Set(
    socialMatches.flatMap((item) =>
      item.normalizedProfileUrlHash && item.normalizedProfileUrl
        ? [
            socialUrlKey(
              item.networkKey,
              item.normalizedProfileUrlHash,
              item.normalizedProfileUrl,
            ),
          ]
        : [],
    ),
  );

  return {
    emailWarnings: normalizedEmails.map((email) => ({
      duplicateFound: matchedEmails.has(email),
      ...(matchedEmails.has(email) ? { fields: ['email'] } : {}),
    })),
    phoneWarnings: normalizedPhones.map((phone) => ({
      duplicateFound: matchedPhones.has(phone),
      ...(matchedPhones.has(phone) ? { fields: ['phone'] } : {}),
    })),
    socialWarnings: input.socialProfiles.map((profile) => {
      const fields: string[] = [];
      if (
        profile.normalizedIdentifier &&
        matchedSocialIdentifiers.has(
          socialIdentifierKey(profile.networkKey, profile.normalizedIdentifier),
        )
      ) {
        fields.push('identifier');
      }
      if (
        profile.normalizedProfileUrlHash &&
        profile.normalizedProfileUrl &&
        matchedSocialUrls.has(
          socialUrlKey(
            profile.networkKey,
            profile.normalizedProfileUrlHash,
            profile.normalizedProfileUrl,
          ),
        )
      ) {
        fields.push('profileUrl');
      }

      return {
        duplicateFound: fields.length > 0,
        ...(fields.length > 0 ? { fields } : {}),
      };
    }),
  };
};

export const getDuplicateWarning = async (
  client: PersonClient,
  input: {
    email?: string;
    excludePersonId?: string;
    networkKey?: string;
    normalizedIdentifier?: string | null;
    normalizedPhone?: string;
    normalizedProfileUrl?: string | null;
    normalizedProfileUrlHash?: string | null;
  },
): Promise<PersonDuplicateWarning> => {
  const duplicateChecks: Promise<unknown>[] = [];
  const duplicateFields: string[] = [];
  const personFilter = input.excludePersonId
    ? { personId: { not: input.excludePersonId } }
    : {};

  if (input.email) {
    duplicateFields.push('email');
    duplicateChecks.push(
      client.personEmail.findFirst({
        select: { id: true },
        where: {
          normalizedEmail: normalizePersonEmail(input.email),
          ...personFilter,
        },
      }),
    );
  }
  if (input.normalizedPhone) {
    duplicateFields.push('phone');
    duplicateChecks.push(
      client.personPhone.findFirst({
        select: { id: true },
        where: { normalizedPhone: input.normalizedPhone, ...personFilter },
      }),
    );
  }
  if (input.networkKey && input.normalizedIdentifier) {
    duplicateFields.push('identifier');
    duplicateChecks.push(
      client.personSocialProfile.findFirst({
        select: { id: true },
        where: {
          networkKey: input.networkKey,
          normalizedIdentifier: input.normalizedIdentifier,
          ...personFilter,
        },
      }),
    );
  }
  if (
    input.networkKey &&
    input.normalizedProfileUrl &&
    input.normalizedProfileUrlHash
  ) {
    duplicateFields.push('profileUrl');
    duplicateChecks.push(
      client.personSocialProfile.findFirst({
        select: { id: true },
        where: {
          networkKey: input.networkKey,
          normalizedProfileUrl: input.normalizedProfileUrl,
          normalizedProfileUrlHash: input.normalizedProfileUrlHash,
          ...personFilter,
        },
      }),
    );
  }

  const duplicates = await Promise.all(duplicateChecks);
  const fields = duplicateFields.filter((_, index) =>
    Boolean(duplicates.at(index)),
  );

  return {
    duplicateFound: fields.length > 0,
    ...(fields.length > 0 ? { fields } : {}),
  };
};
