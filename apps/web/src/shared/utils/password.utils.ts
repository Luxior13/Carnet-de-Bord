/**
 * Password policy shared by the browser and the server (NIST SP 800-63B):
 * a minimum length, no composition rule, and refusal of guessable values.
 * The server adds the common-password list (`$server/password-policy`).
 */
export type PasswordValidationResult = {
  errors: string[];
  isValid: boolean;
};

/** Personal words a new password must not contain. */
export type PasswordIdentity = {
  firstName?: string | null;
  lastName?: string | null;
  loginName?: string | null;
};

export const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_MAX_LENGTH = 128;

export const PASSWORD_RULES = {
  maxLength: `Le mot de passe ne doit pas dépasser ${PASSWORD_MAX_LENGTH} caractères`,
  minLength: `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères`,
  personal:
    'Le mot de passe ne doit contenir ni votre identifiant, ni votre nom, ni le nom de la structure',
  trivial:
    'Le mot de passe ne doit pas être une suite ou une répétition simple',
} as const;

// Words tied to the structure itself; any password containing one is guessable.
const STRUCTURE_WORDS = ['noctambule', 'carnet'];
// Keyboard and alphabet runs, read cyclically in both directions.
const SEQUENCES = [
  'abcdefghijklmnopqrstuvwxyz',
  '0123456789',
  'azertyuiop',
  'qsdfghjklm',
  'wxcvbn',
  'qwertyuiop',
  'asdfghjkl',
  'zxcvbnm',
];
// Shorter fragments (« Léo ») would refuse unrelated passwords.
const MIN_PERSONAL_WORD_LENGTH = 4;

/** Counts Unicode code points, as a person counts characters. */
export const getPasswordLength = (password: string): number =>
  Array.from(password).length;

/**
 * Upper bound applied before any hash computation, including to a current
 * password being proved; legitimate passwords are far shorter.
 */
export const isPasswordWithinLengthLimit = (password: string): boolean =>
  getPasswordLength(password) <= PASSWORD_MAX_LENGTH;

const foldText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

const isTrivialPassword = (password: string): boolean => {
  const folded = foldText(password);
  // One short block repeated (`aaaa…`, `abcabc…`, `121212…`).
  if (/^(.{1,4})\1+$/u.test(folded)) return true;

  return SEQUENCES.some((sequence) =>
    [sequence, [...sequence].reverse().join('')].some((run) =>
      run.repeat(Math.ceil(folded.length / run.length) + 1).includes(folded),
    ),
  );
};

const getPersonalWords = (identity: PasswordIdentity): string[] =>
  [
    identity.loginName,
    ...(identity.loginName?.split(/[._-]+/) ?? []),
    identity.firstName,
    identity.lastName,
    ...STRUCTURE_WORDS,
  ]
    .map((word) => foldText(word?.trim() ?? ''))
    .filter((word) => word.length >= MIN_PERSONAL_WORD_LENGTH);

export function validatePassword(
  password: string,
  identity: PasswordIdentity = {},
): PasswordValidationResult {
  const errors: string[] = [];
  const length = getPasswordLength(password);
  if (length < PASSWORD_MIN_LENGTH) errors.push(PASSWORD_RULES.minLength);
  if (length > PASSWORD_MAX_LENGTH) errors.push(PASSWORD_RULES.maxLength);
  if (password.length > 0 && isTrivialPassword(password))
    errors.push(PASSWORD_RULES.trivial);
  const folded = foldText(password);
  if (getPersonalWords(identity).some((word) => folded.includes(word)))
    errors.push(PASSWORD_RULES.personal);

  return { errors, isValid: errors.length === 0 };
}
