import { describe, expect, it, vi } from 'vitest';

import {
  COMMON_PASSWORD_MESSAGE,
  isCommonPassword,
  validateNewPassword,
} from '$server/password-policy';
import {
  getPasswordLength,
  isPasswordWithinLengthLimit,
  PASSWORD_RULES,
  validatePassword,
} from '$utils/password.utils';

vi.mock('server-only', () => ({}));

const identity = {
  firstName: 'Camille',
  lastName: 'Durand',
  loginName: 'camille.durand',
};

describe('validatePassword', () => {
  it('requires 12 characters and no composition rule', () => {
    expect(validatePassword('Ab1!').errors).toContain(PASSWORD_RULES.minLength);
    expect(validatePassword('rivière bleue sous la pluie')).toEqual({
      errors: [],
      isValid: true,
    });
    expect(validatePassword('tortue verte en voyage').isValid).toBe(true);
  });

  it('counts characters, not UTF-8 bytes or UTF-16 units', () => {
    expect(getPasswordLength('éèàçù🙂')).toBe(6);
    expect(validatePassword('🙂'.repeat(11) + 'x').errors).not.toContain(
      PASSWORD_RULES.minLength,
    );
  });

  it('bounds the length before any hash computation', () => {
    expect(isPasswordWithinLengthLimit('a'.repeat(128))).toBe(true);
    expect(isPasswordWithinLengthLimit('a'.repeat(129))).toBe(false);
    expect(validatePassword('ab'.repeat(65) + 'c').errors).toContain(
      PASSWORD_RULES.maxLength,
    );
  });

  it.each([
    'aaaaaaaaaaaa',
    'abcabcabcabc',
    '121212121212',
    '123456789012',
    'abcdefghijklm',
    'zyxwvutsrqpo',
    'azertyuiopaz',
    'qwertyuiopqw',
  ])('refuses the simple run %s', (password) => {
    expect(validatePassword(password).errors).toContain(PASSWORD_RULES.trivial);
  });

  it('refuses the identifier, the names and the structure, accents ignored', () => {
    for (const password of [
      'mon camille.durand 24',
      'DURAND est ma clé',
      'je suis Câmille ici',
      'vive noctambule 2026',
    ]) {
      expect(validatePassword(password, identity).errors).toContain(
        PASSWORD_RULES.personal,
      );
    }
  });

  it('ignores personal fragments shorter than four letters', () => {
    expect(
      validatePassword('le chat dort au leon', {
        firstName: 'Léo',
        loginName: 'leo.ba',
      }).isValid,
    ).toBe(true);
  });

  it('keeps leading and trailing spaces as password characters', () => {
    expect(validatePassword('  ciel orage  ').isValid).toBe(true);
  });
});

describe('server password policy', () => {
  it.each([
    'qwerty123456',
    'Soleil2026!!',
    'P@ssw0rd2026',
    'motdepasse123',
    'Football!!!!',
  ])('refuses the common password %s', (password) => {
    expect(isCommonPassword(password)).toBe(true);
    expect(validateNewPassword(password, {}).errors).toContain(
      COMMON_PASSWORD_MESSAGE,
    );
  });

  it('accepts a long unlisted passphrase', () => {
    expect(isCommonPassword('cerf-volant sur la dune')).toBe(false);
    expect(validateNewPassword('cerf-volant sur la dune', identity)).toEqual({
      errors: [],
      isValid: true,
    });
  });
});
