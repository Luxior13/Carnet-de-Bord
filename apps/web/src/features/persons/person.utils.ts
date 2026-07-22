const COMBINING_MARKS_PATTERN = /[\u0300-\u036f]/g;
const SPACE_PATTERN = /\s+/g;
export const APPLICATION_CIVIL_TIME_ZONE = 'Europe/Paris';

const APPLICATION_DATE_PARTS_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  day: 'numeric',
  month: 'numeric',
  timeZone: APPLICATION_CIVIL_TIME_ZONE,
  year: 'numeric',
});

export const getApplicationCivilDateParts = (
  now = new Date(),
): Readonly<{ day: number; month: number; year: number }> | null => {
  const parts = Object.fromEntries(
    APPLICATION_DATE_PARTS_FORMATTER.formatToParts(now)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  );
  const year = parts.year;
  const month = parts.month;
  const day = parts.day;

  return year && month && day ? { day, month, year } : null;
};

/**
 * Stable v1 search normalisation. Keep this function backward compatible when
 * adding new search capabilities: persisted columns and incoming queries must
 * always use the same algorithm.
 */
export const normalizePersonSearchValue = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(COMBINING_MARKS_PATTERN, '')
    .toLocaleLowerCase('fr-FR')
    .trim()
    .replace(SPACE_PATTERN, ' ');

export const normalizePersonEmail = (value: string): string =>
  value.trim().toLocaleLowerCase('en-US');

export const normalizePersonSocialIdentifier = (value: string): string =>
  value.trim().toLocaleLowerCase('en-US');

export const normalizePersonSocialUrl = (value: string): string => {
  const url = new URL(value.trim());
  if (
    (url.protocol !== 'https:' && url.protocol !== 'http:') ||
    url.username ||
    url.password
  ) {
    throw new TypeError('Unsupported social profile URL');
  }
  url.hash = '';
  url.hostname = url.hostname.toLocaleLowerCase('en-US');
  url.protocol = url.protocol.toLocaleLowerCase('en-US');

  if (
    (url.protocol === 'https:' && url.port === '443') ||
    (url.protocol === 'http:' && url.port === '80')
  ) {
    url.port = '';
  }

  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '');

  const sortedParams = [...url.searchParams.entries()].sort(
    ([leftKey, left], [rightKey, right]) =>
      leftKey === rightKey
        ? left.localeCompare(right)
        : leftKey.localeCompare(rightKey),
  );
  url.search = '';
  for (const [key, item] of sortedParams) url.searchParams.append(key, item);

  return url.toString();
};

export const formatPersonDisplayName = (person: {
  firstName: string | null;
  lastName: string | null;
  nickname: string | null;
}): string => {
  const legalName = [person.firstName, person.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();

  if (person.nickname && legalName) return `${person.nickname} · ${legalName}`;

  return person.nickname ?? legalName;
};

export const serializeCivilDate = (value: Date | null): string | null =>
  value ? value.toISOString().slice(0, 10) : null;

export const parseCivilDate = (value: string | null): Date | null =>
  value ? new Date(`${value}T00:00:00.000Z`) : null;

export const calculateCivilAge = (
  birthDate: string | null,
  now = new Date(),
): number | null => {
  if (!birthDate) return null;
  const [year, month, day] = birthDate.split('-').map(Number);
  if (!year || !month || !day) return null;

  const current = getApplicationCivilDateParts(now);
  if (!current) return null;

  let age = current.year - year;
  const birthdayHasPassed =
    current.month > month || (current.month === month && current.day >= day);
  if (!birthdayHasPassed) age -= 1;

  return age;
};
