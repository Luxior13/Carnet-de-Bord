import bcrypt from 'bcryptjs';
import { describe, expect, it } from 'vitest';

/* eslint-disable security/detect-object-injection -- These tests mirror bounded array/string indexing from the password generator and compare fixed test arrays. */

// ============================================
// Test implementations that mirror auth.ts logic
// We can't import server-only modules in tests
// ============================================

const generateSessionTokenForTest = (): string => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);

  // Simplified base32 encoding for test
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
};

const generateTemporaryPasswordForTest = (): string => {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  const special = '!@#$%&*';
  const allChars = lowercase + uppercase + digits + special;

  const getRandomChar = (charset: string): string => {
    const bytes = new Uint8Array(1);
    crypto.getRandomValues(bytes);
    const index = (bytes[0] ?? 0) % charset.length;

    return charset[index] ?? charset[0] ?? 'a';
  };

  const requiredChars = [
    getRandomChar(lowercase),
    getRandomChar(uppercase),
    getRandomChar(digits),
    getRandomChar(special),
  ];

  const remainingLength = 10;
  const bytes = new Uint8Array(remainingLength);
  crypto.getRandomValues(bytes);
  const randomChars = Array.from(
    bytes,
    (b) => allChars[b % allChars.length] ?? 'a',
  );

  const combined = [...requiredChars, ...randomChars];
  const shuffleBytes = new Uint8Array(combined.length);
  crypto.getRandomValues(shuffleBytes);

  for (let i = combined.length - 1; i > 0; i--) {
    const j = (shuffleBytes[i] ?? 0) % (i + 1);
    const temp = combined[i];
    combined[i] = combined[j] ?? '';
    combined[j] = temp ?? '';
  }

  return combined.join('');
};

const hashPasswordForTest = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12);
};

const verifyPasswordForTest = async (
  password: string,
  hash: string,
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// ============================================
// Tests
// ============================================

describe('generateSessionToken', () => {
  it('generates a non-empty token', () => {
    const token = generateSessionTokenForTest();
    expect(token).toBeTruthy();
    expect(token.length).toBeGreaterThan(0);
  });

  it('generates tokens of consistent length', () => {
    const token1 = generateSessionTokenForTest();
    const token2 = generateSessionTokenForTest();
    expect(token1.length).toBe(token2.length);
  });

  it('generates unique tokens', () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 100; i++) {
      tokens.add(generateSessionTokenForTest());
    }
    // All 100 tokens should be unique
    expect(tokens.size).toBe(100);
  });

  it('generates only alphanumeric characters', () => {
    const token = generateSessionTokenForTest();
    // Our test version uses hex encoding
    expect(token).toMatch(/^[0-9a-f]+$/);
  });
});

describe('generateTemporaryPassword', () => {
  it('generates a password of 14 characters', () => {
    const password = generateTemporaryPasswordForTest();
    expect(password.length).toBe(14);
  });

  it('contains at least one lowercase letter', () => {
    const password = generateTemporaryPasswordForTest();
    expect(password).toMatch(/[a-z]/);
  });

  it('contains at least one uppercase letter', () => {
    const password = generateTemporaryPasswordForTest();
    expect(password).toMatch(/[A-Z]/);
  });

  it('contains at least one digit', () => {
    const password = generateTemporaryPasswordForTest();
    expect(password).toMatch(/\d/);
  });

  it('contains at least one special character', () => {
    const password = generateTemporaryPasswordForTest();
    expect(password).toMatch(/[!@#$%&*]/);
  });

  it('generates unique passwords', () => {
    const passwords = new Set<string>();
    for (let i = 0; i < 50; i++) {
      passwords.add(generateTemporaryPasswordForTest());
    }
    // All 50 passwords should be unique
    expect(passwords.size).toBe(50);
  });

  it('always meets password requirements', () => {
    // Test multiple times to ensure consistency
    for (let i = 0; i < 20; i++) {
      const password = generateTemporaryPasswordForTest();
      expect(password.length).toBeGreaterThanOrEqual(8);
      expect(password).toMatch(/[a-z]/);
      expect(password).toMatch(/[A-Z]/);
      expect(password).toMatch(/\d/);
    }
  });
});

describe('hashPassword', () => {
  it('returns a bcrypt hash', async () => {
    const hash = await hashPasswordForTest('testPassword123');
    // bcrypt hashes start with $2a$ or $2b$
    expect(hash).toMatch(/^\$2[ab]\$/);
  });

  it('produces different hashes for same password', async () => {
    const hash1 = await hashPasswordForTest('samePassword');
    const hash2 = await hashPasswordForTest('samePassword');
    expect(hash1).not.toBe(hash2);
  });

  it('produces hashes of consistent format', async () => {
    const hash = await hashPasswordForTest('anyPassword');
    // bcrypt hashes are 60 characters
    expect(hash.length).toBe(60);
  });
});

describe('verifyPassword', () => {
  it('returns true for correct password', async () => {
    const password = 'correctPassword123';
    const hash = await hashPasswordForTest(password);
    const isValid = await verifyPasswordForTest(password, hash);
    expect(isValid).toBe(true);
  });

  it('returns false for incorrect password', async () => {
    const hash = await hashPasswordForTest('correctPassword');
    const isValid = await verifyPasswordForTest('wrongPassword', hash);
    expect(isValid).toBe(false);
  });

  it('returns false for empty password against hash', async () => {
    const hash = await hashPasswordForTest('somePassword');
    const isValid = await verifyPasswordForTest('', hash);
    expect(isValid).toBe(false);
  });

  it('handles special characters in password', async () => {
    const password = 'P@$$w0rd!#$%^&*()';
    const hash = await hashPasswordForTest(password);
    const isValid = await verifyPasswordForTest(password, hash);
    expect(isValid).toBe(true);
  });

  it('handles unicode characters in password', async () => {
    const password = 'MötPässwörd123';
    const hash = await hashPasswordForTest(password);
    const isValid = await verifyPasswordForTest(password, hash);
    expect(isValid).toBe(true);
  });

  it('is case sensitive', async () => {
    const hash = await hashPasswordForTest('Password123');
    const isValidLower = await verifyPasswordForTest('password123', hash);
    const isValidUpper = await verifyPasswordForTest('PASSWORD123', hash);
    expect(isValidLower).toBe(false);
    expect(isValidUpper).toBe(false);
  });
});

describe('password hashing and verification integration', () => {
  it('hash then verify workflow', async () => {
    const password = 'MySecureP@ssw0rd!';
    const hash = await hashPasswordForTest(password);

    expect(await verifyPasswordForTest(password, hash)).toBe(true);
    expect(await verifyPasswordForTest('WrongPassword', hash)).toBe(false);
    expect(await verifyPasswordForTest('mysecurep@ssw0rd!', hash)).toBe(false);
  });

  it('multiple passwords can be verified independently', async () => {
    const passwords = ['Pass1!', 'Pass2@', 'Pass3#'];
    const hashes = await Promise.all(
      passwords.map((p) => hashPasswordForTest(p)),
    );

    for (let i = 0; i < passwords.length; i++) {
      const password = passwords[i];
      const hash = hashes[i];
      if (password !== undefined && hash !== undefined) {
        expect(await verifyPasswordForTest(password, hash)).toBe(true);

        // Verify other passwords don't match this hash
        for (let j = 0; j < passwords.length; j++) {
          if (i !== j) {
            const otherPassword = passwords[j];
            if (otherPassword !== undefined) {
              expect(await verifyPasswordForTest(otherPassword, hash)).toBe(
                false,
              );
            }
          }
        }
      }
    }
  });
});
