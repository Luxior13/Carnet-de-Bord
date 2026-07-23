import 'server-only';

import { parsePhoneNumberFromString } from 'libphonenumber-js';

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
  const [year, month, day] = value.split('-').map(Number);

  return new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
};

export const fromCivilDate = (value: Date | null): string | null =>
  value ? value.toISOString().slice(0, 10) : null;
