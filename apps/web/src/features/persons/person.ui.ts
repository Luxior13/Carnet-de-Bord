import type { ZodError } from 'zod';

import { calculateCivilAge } from './person.utils';
import type { PersonDetail, PersonStructureStatus } from './types/person.types';

export type PersonFormErrors = Record<string, string>;

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const DATE_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'long',
  timeZone: 'UTC',
});

export const getPersonDisplayName = (person: {
  firstName: string | null;
  lastName: string | null;
  nickname: string | null;
}): string => {
  const civilName = [person.firstName, person.lastName]
    .filter((value): value is string => Boolean(value))
    .join(' ');

  if (person.nickname && civilName) return `${person.nickname} · ${civilName}`;

  return person.nickname ?? (civilName || 'Personne sans nom');
};

export const getPersonInitials = (person: {
  firstName: string | null;
  lastName: string | null;
  nickname: string | null;
}): string => {
  const source = person.nickname
    ? [person.nickname]
    : [person.firstName, person.lastName];

  return source
    .filter((value): value is string => Boolean(value))
    .map((value) => value.trim().charAt(0).toUpperCase())
    .join('')
    .slice(0, 2);
};

export const formatPersonDateTime = (value: string): string =>
  DATE_TIME_FORMATTER.format(new Date(value));

export const formatPersonBirthDate = (value: string): string =>
  DATE_FORMATTER.format(new Date(`${value}T00:00:00.000Z`));

export const calculatePersonAge = (
  birthDate: string | null,
  now = new Date(),
): number | null => calculateCivilAge(birthDate, now);

export const getAgeDescription = (birthDate: string | null): string | null => {
  const age = calculatePersonAge(birthDate);
  if (age === null) return null;

  return `${age} ans · ${age >= 18 ? 'Majeur' : 'Mineur'}`;
};

export const getStructureStatusTone = (
  status: PersonStructureStatus,
): 'secondary' | 'success' =>
  status === 'IN_STRUCTURE' ? 'success' : 'secondary';

export const getPersonFieldJournalHref = (input: {
  fieldKey: string;
  personId: string;
  recordId?: string;
  sectionKey: string;
}): string => {
  const params = new URLSearchParams({
    entityId: input.personId,
    entityType: 'PERSON',
    fieldKey: input.fieldKey,
    sectionKey: input.sectionKey,
  });
  if (input.recordId) params.set('recordId', input.recordId);

  return `/systeme/journal-activite?${params}`;
};

export const zodErrorMap = (error: ZodError): PersonFormErrors => {
  const errors = new Map<string, string>();
  for (const issue of error.issues) {
    const key = issue.path.join('.');
    if (key && !errors.has(key)) errors.set(key, issue.message);
  }

  return Object.fromEntries(errors);
};

export const isPersonIdentityEqual = (
  person: PersonDetail,
  form: {
    birthDate: string;
    firstName: string;
    lastName: string;
    nickname: string;
    structureStatus: PersonStructureStatus;
  },
): boolean =>
  (person.birthDate ?? '') === form.birthDate &&
  (person.firstName ?? '') === form.firstName.trim() &&
  (person.lastName ?? '') === form.lastName.trim() &&
  (person.nickname ?? '') === form.nickname.trim() &&
  person.structureStatus === form.structureStatus;
