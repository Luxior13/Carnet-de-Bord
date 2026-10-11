import 'server-only';

import { randomInt } from 'node:crypto';

/** Shared by account creation and password reset; never persisted in cleartext. */
export const generateTemporaryPassword = (): string => {
  const categories = [
    'abcdefghijklmnopqrstuvwxyz',
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    '0123456789',
    '!@#$%&*',
  ];
  const alphabet = categories.join('');
  const pick = (characters: string): string =>
    characters.charAt(randomInt(characters.length));
  const characters = categories.map(pick);
  while (characters.length < 14) characters.push(pick(alphabet));

  // randomInt avoids modulo bias in both character selection and shuffling.
  for (let index = characters.length - 1; index > 0; index--) {
    const other = randomInt(index + 1);
    const current = characters.at(index);
    const replacement = characters.at(other);
    if (current === undefined || replacement === undefined)
      throw new RangeError('Invalid temporary password shuffle index');
    // Both indices are bounded by the current array length.
    // eslint-disable-next-line security/detect-object-injection
    characters[index] = replacement;
    // eslint-disable-next-line security/detect-object-injection
    characters[other] = current;
  }

  return characters.join('');
};
