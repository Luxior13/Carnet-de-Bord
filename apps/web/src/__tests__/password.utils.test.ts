import { describe, expect, it } from 'vitest';

import {
  getPasswordStrengthColor,
  getPasswordStrengthLabel,
  validatePassword,
} from '../shared/utils/password.utils';

describe('validatePassword', () => {
  it('rejects passwords shorter than 8 characters', () => {
    const result = validatePassword('Ab1');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      'Le mot de passe doit contenir au moins 8 caractères',
    );
  });

  it('rejects passwords without uppercase', () => {
    const result = validatePassword('abcdefgh1');
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('majuscule'))).toBe(true);
  });

  it('rejects passwords without lowercase', () => {
    const result = validatePassword('ABCDEFGH1');
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('minuscule'))).toBe(true);
  });

  it('rejects passwords without numbers', () => {
    const result = validatePassword('Abcdefgh');
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('chiffre'))).toBe(true);
  });

  it('accepts valid passwords', () => {
    const result = validatePassword('Abcdefg1');
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('gives higher score for special characters', () => {
    // Use a password missing one required category so base score isn't maxed at 4
    // Without uppercase: length(1) + lowercase(1) + number(1) = 3
    const withoutSpecial = validatePassword('abcdefg1');
    // Without uppercase but with special: length(1) + lowercase(1) + number(1) + special(1) = 4
    const withSpecial = validatePassword('abcdef1!');
    expect(withSpecial.score).toBeGreaterThan(withoutSpecial.score);
  });

  it('returns score of 4 for excellent passwords', () => {
    const result = validatePassword('MyP@ssw0rd!');
    expect(result.score).toBe(4);
  });

  it('returns multiple errors for very weak passwords', () => {
    const result = validatePassword('abc');
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });

  it('handles empty password', () => {
    const result = validatePassword('');
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBe(4); // length, uppercase, lowercase, number
  });

  it('considers 8 character passwords as meeting minimum length', () => {
    const result = validatePassword('Abcdefg1');
    expect(result.errors).not.toContain(
      'Le mot de passe doit contenir au moins 8 caractères',
    );
  });
});

describe('getPasswordStrengthLabel', () => {
  it('returns Faible for score 0-1', () => {
    expect(getPasswordStrengthLabel(0)).toBe('Faible');
    expect(getPasswordStrengthLabel(1)).toBe('Faible');
  });

  it('returns Moyen for score 2', () => {
    expect(getPasswordStrengthLabel(2)).toBe('Moyen');
  });

  it('returns Bon for score 3', () => {
    expect(getPasswordStrengthLabel(3)).toBe('Bon');
  });

  it('returns Excellent for score 4', () => {
    expect(getPasswordStrengthLabel(4)).toBe('Excellent');
  });

  it('returns Faible for invalid scores', () => {
    expect(getPasswordStrengthLabel(-1)).toBe('Faible');
    expect(getPasswordStrengthLabel(5)).toBe('Faible');
  });
});

describe('getPasswordStrengthColor', () => {
  it('returns bg-red-500 for score 0-1', () => {
    expect(getPasswordStrengthColor(0)).toBe('bg-red-500');
    expect(getPasswordStrengthColor(1)).toBe('bg-red-500');
  });

  it('returns bg-orange-500 for score 2', () => {
    expect(getPasswordStrengthColor(2)).toBe('bg-orange-500');
  });

  it('returns bg-yellow-500 for score 3', () => {
    expect(getPasswordStrengthColor(3)).toBe('bg-yellow-500');
  });

  it('returns bg-green-500 for score 4', () => {
    expect(getPasswordStrengthColor(4)).toBe('bg-green-500');
  });

  it('returns bg-gray-500 for invalid scores', () => {
    expect(getPasswordStrengthColor(-1)).toBe('bg-gray-500');
    expect(getPasswordStrengthColor(5)).toBe('bg-gray-500');
  });
});
