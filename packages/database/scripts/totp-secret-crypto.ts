import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

// Must match apps/web/src/shared/server/mfa.ts: AES-256-GCM, 12-byte IV and
// the owner bound as authenticated data.
const TOTP_SECRET_AAD_PREFIX = 'team-control:totp-secret:v1:';
const KEY_PATTERN = /^[A-Za-z0-9+/]{43}=$/u;

export type EncryptedTotpSecret = {
  secretAuthTag: string;
  secretCiphertext: string;
  secretIv: string;
};

const totpSecretAad = (userId: string): Buffer =>
  Buffer.from(`${TOTP_SECRET_AAD_PREFIX}${userId}`, 'utf8');

/** Reads `MFA_ENCRYPTION_KEY_V<version>`; throws without naming its value. */
export const readMfaKey = (
  environment: NodeJS.ProcessEnv,
  version: number,
): Buffer => {
  const name = `MFA_ENCRYPTION_KEY_V${String(version)}`;
  // The suffix is a validated positive integer.
  // eslint-disable-next-line security/detect-object-injection
  const value = environment[name];
  const key =
    Number.isSafeInteger(version) &&
    version > 0 &&
    value !== undefined &&
    KEY_PATTERN.test(value)
      ? Buffer.from(value, 'base64')
      : null;
  if (!key || key.length !== 32 || key.toString('base64') !== value) {
    key?.fill(0);
    throw new Error(`${name} must contain exactly 32 bytes in Base64`);
  }

  return key;
};

export const decryptTotpSecret = (
  encrypted: EncryptedTotpSecret,
  userId: string,
  key: Buffer,
): string => {
  const decipher = createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(encrypted.secretIv, 'base64'),
  );
  decipher.setAAD(totpSecretAad(userId));
  decipher.setAuthTag(Buffer.from(encrypted.secretAuthTag, 'base64'));

  return Buffer.concat([
    decipher.update(Buffer.from(encrypted.secretCiphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8');
};

export const encryptTotpSecret = (
  secret: string,
  userId: string,
  key: Buffer,
): EncryptedTotpSecret => {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(totpSecretAad(userId));
  const ciphertext = Buffer.concat([
    cipher.update(secret, 'utf8'),
    cipher.final(),
  ]);

  return {
    secretAuthTag: cipher.getAuthTag().toString('base64'),
    secretCiphertext: ciphertext.toString('base64'),
    secretIv: iv.toString('base64'),
  };
};
