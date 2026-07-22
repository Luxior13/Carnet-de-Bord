import 'server-only';

import { createHash } from 'node:crypto';

import {
  normalizePersonEmail,
  normalizePersonSearchValue,
  normalizePersonSocialIdentifier,
  normalizePersonSocialUrl,
  parseCivilDate,
} from '../person.utils';

export {
  normalizePersonEmail,
  normalizePersonSearchValue,
  normalizePersonSocialIdentifier,
  normalizePersonSocialUrl,
};

export const hashPersonNormalizedUrl = (value: string): string =>
  createHash('sha256').update(value, 'utf8').digest('hex');

export const personIdentityData = (input: {
  birthDate?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  nickname?: string | null;
  structureStatus: 'IN_STRUCTURE' | 'OUTSIDE_STRUCTURE';
}) => {
  const normalizedFirstName = input.firstName
    ? normalizePersonSearchValue(input.firstName)
    : null;
  const normalizedLastName = input.lastName
    ? normalizePersonSearchValue(input.lastName)
    : null;
  const normalizedNickname = input.nickname
    ? normalizePersonSearchValue(input.nickname)
    : null;

  return {
    birthDate: parseCivilDate(input.birthDate ?? null),
    firstName: input.firstName ?? null,
    lastName: input.lastName ?? null,
    nickname: input.nickname ?? null,
    normalizedFirstName,
    normalizedLastName,
    normalizedNickname,
    sortName:
      normalizedNickname ?? `${normalizedFirstName} ${normalizedLastName}`,
    structureStatus: input.structureStatus,
  };
};
