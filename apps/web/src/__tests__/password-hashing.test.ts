import bcrypt from 'bcryptjs';
import { describe, expect, it, vi } from 'vitest';

import { hashPassword, verifyPassword } from '$server/password';
import { generateTemporaryPassword } from '$server/temporary-password';
import { validatePassword } from '$utils/password.utils';

vi.mock('server-only', () => ({}));
vi.mock('$server/prisma', () => ({ prisma: {} }));

describe('generateTemporaryPassword', () => {
  it('generates distinct 14-character passwords that satisfy the policy', () => {
    const passwords = new Set<string>();
    for (let index = 0; index < 50; index++) {
      const password = generateTemporaryPassword();
      expect(password).toHaveLength(14);
      expect(validatePassword(password).isValid).toBe(true);
      passwords.add(password);
    }
    expect(passwords.size).toBe(50);
  });
});

describe('password hashing', () => {
  it('stores argon2id with the OWASP parameters and a fresh salt', async () => {
    const first = await hashPassword('nuage rouge sur la mer');
    const second = await hashPassword('nuage rouge sur la mer');

    expect(first).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(first).not.toBe(second);
  });

  it('verifies exactly, including case, spaces and Unicode', async () => {
    const password = ' Été 🙂 sur la côte ';
    const stored = await hashPassword(password);

    expect(await verifyPassword(password, stored)).toBe(true);
    expect(await verifyPassword(password.trim(), stored)).toBe(false);
    expect(await verifyPassword(password.toUpperCase(), stored)).toBe(false);
    expect(await verifyPassword('', stored)).toBe(false);
  });

  it('refuses a password above the length bound before hashing', async () => {
    await expect(hashPassword('a'.repeat(129))).rejects.toThrow(RangeError);
    const stored = await hashPassword('a'.repeat(128));
    expect(await verifyPassword('a'.repeat(129), stored)).toBe(false);
  });

  it('still verifies a legacy bcrypt hash, within its 72-byte limit', async () => {
    const legacy = await bcrypt.hash('ancien mot de passe', 4);

    expect(await verifyPassword('ancien mot de passe', legacy)).toBe(true);
    expect(await verifyPassword('autre mot de passe', legacy)).toBe(false);
  });

  it('rejects an unknown or malformed stored hash without throwing', async () => {
    expect(await verifyPassword('peu importe ici', '!deleted:abc')).toBe(false);
    expect(await verifyPassword('peu importe ici', '$argon2id$broken')).toBe(
      false,
    );
  });
});
