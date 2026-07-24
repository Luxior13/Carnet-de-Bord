import 'server-only';

import { parsePhoneNumberFromString } from 'libphonenumber-js';

const CIVIL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const isLeapYear = (year: number): boolean =>
  year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

const parseCivilDateParts = (
  value: string,
): Readonly<{ day: number; month: number; year: number }> | null => {
  const match = CIVIL_DATE_PATTERN.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year === 0 || month < 1 || month > 12 || day < 1) return null;

  const daysInMonth = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  if (day > (daysInMonth[month - 1] ?? 0)) return null;

  return { day, month, year };
};

export const normalizePartnerSearchValue = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('fr-FR')
    .replace(/\s+/gu, ' ')
    .trim();

export const normalizePartnerWebsite = (
  value: string | null | undefined,
): { domain: string | null; website: string | null } => {
  const trimmed = value?.trim() || null;
  if (!trimmed) return { domain: null, website: null };
  const parsed = new URL(trimmed);

  return {
    domain: parsed.hostname.toLocaleLowerCase('en-US').replace(/\.$/u, ''),
    website: parsed.toString(),
  };
};

export const normalizePartnerChannel = (channel: {
  normalizedValue?: string;
  type: 'EMAIL' | 'PHONE';
  value: string;
}): string => {
  if (channel.type === 'EMAIL') return channel.value.trim().toLowerCase();

  return (
    channel.normalizedValue ??
    parsePhoneNumberFromString(channel.value)?.number ??
    channel.value.replace(/\D/gu, '')
  );
};

export const toCivilDate = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const parts = parseCivilDateParts(value);
  if (!parts) throw new RangeError('Invalid civil date');

  const result = new Date(0);
  result.setUTCFullYear(parts.year, parts.month - 1, parts.day);

  return result;
};

export const fromCivilDate = (value: Date | null): string | null => {
  if (!value) return null;
  if (Number.isNaN(value.getTime())) throw new RangeError('Invalid civil date');

  const year = value.getUTCFullYear();
  if (year < 1 || year > 9999) throw new RangeError('Invalid civil date');

  return [
    String(year).padStart(4, '0'),
    String(value.getUTCMonth() + 1).padStart(2, '0'),
    String(value.getUTCDate()).padStart(2, '0'),
  ].join('-');
};
