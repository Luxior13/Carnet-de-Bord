import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createCipheriv, randomBytes } from 'node:crypto';
import test from 'node:test';

import {
  decryptTotpSecret,
  encryptTotpSecret,
  readMfaKey,
} from '../scripts/totp-secret-crypto.ts';

const key = Buffer.alloc(32, 21);
const otherKey = Buffer.alloc(32, 22);
const seed = 'JBSWY3DPEHPK3PXP';

test('re-encrypts a seed for the same owner only', () => {
  const encrypted = encryptTotpSecret(seed, 'user-1', key);
  assert.equal(decryptTotpSecret(encrypted, 'user-1', key), seed);
  assert.throws(() => decryptTotpSecret(encrypted, 'user-2', key));
  assert.throws(() => decryptTotpSecret(encrypted, 'user-1', otherKey));
});

test('reads a secret written by the application format', () => {
  // Same envelope as apps/web/src/shared/server/mfa.ts.
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from('team-control:totp-secret:v1:user-1', 'utf8'));
  const ciphertext = Buffer.concat([
    cipher.update(seed, 'utf8'),
    cipher.final(),
  ]);
  const stored = {
    secretAuthTag: cipher.getAuthTag().toString('base64'),
    secretCiphertext: ciphertext.toString('base64'),
    secretIv: iv.toString('base64'),
  };
  assert.equal(decryptTotpSecret(stored, 'user-1', key), seed);
});

test('reads only a canonical 32-byte key of a positive version', () => {
  const environment = {
    MFA_ENCRYPTION_KEY_V1: key.toString('base64'),
    MFA_ENCRYPTION_KEY_V2: Buffer.alloc(16, 1).toString('base64'),
  };
  assert.deepEqual(readMfaKey(environment, 1), key);
  assert.throws(() => readMfaKey(environment, 2), /MFA_ENCRYPTION_KEY_V2/u);
  assert.throws(() => readMfaKey(environment, 3), /MFA_ENCRYPTION_KEY_V3/u);
  assert.throws(() => readMfaKey(environment, 0));
});
