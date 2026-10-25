import 'server-only';

import {
  type PasswordIdentity,
  type PasswordValidationResult,
  validatePassword,
} from '$utils/password.utils';

import commonPasswords from './common-passwords.json';

export const COMMON_PASSWORD_MESSAGE =
  'Ce mot de passe est trop courant. Choisissez-en un autre.';

const COMMON_PHRASES = new Set(commonPasswords.phrases);
const COMMON_WORDS = new Set(commonPasswords.words);
// Usual substitutions inside a common word (« p@ssw0rd »).
const LEET_LETTERS: Readonly<Record<string, string>> = {
  '!': 'i',
  $: 's',
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '@': 'a',
};

const foldText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/**
 * True for a listed password, or a common word only decorated with digits
 * and symbols at its ends (« Soleil2026!! », « P@ssw0rd1 »).
 */
export const isCommonPassword = (password: string): boolean => {
  const folded = foldText(password);
  if (COMMON_PHRASES.has(folded)) return true;
  const core = folded.replace(/^[^a-z]+|[^a-z]+$/g, '').replace(
    /[!$013457@]/g,
    (character) =>
      // The pattern restricts `character` to the table's keys.
      // eslint-disable-next-line security/detect-object-injection
      LEET_LETTERS[character] ?? character,
  );

  return /^[a-z]+$/.test(core) && COMMON_WORDS.has(core);
};

/** Shared rules plus the common-password list, for every new password. */
export const validateNewPassword = (
  password: string,
  identity: PasswordIdentity,
): PasswordValidationResult => {
  const result = validatePassword(password, identity);
  if (!isCommonPassword(password)) return result;

  return {
    errors: [...result.errors, COMMON_PASSWORD_MESSAGE],
    isValid: false,
  };
};
