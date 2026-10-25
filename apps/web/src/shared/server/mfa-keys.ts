import 'server-only';

// Exactly 32 bytes in canonical Base64, as for the audit keys.
const KEY_PATTERN = /^[A-Za-z0-9+/]{43}=$/u;

/**
 * Version used to encrypt new TOTP secrets (`MFA_ENCRYPTION_CURRENT_VERSION`,
 * 1 when absent). Older versions stay readable while their key is set; the
 * `db:mfa:reencrypt` script moves stored secrets to the current version.
 */
export const getCurrentMfaKeyVersion = (): number => {
  const raw = process.env.MFA_ENCRYPTION_CURRENT_VERSION;
  if (raw === undefined || raw === '') return 1;
  const version = Number(raw);
  if (!Number.isSafeInteger(version) || version < 1) {
    throw new Error(
      'MFA_ENCRYPTION_CURRENT_VERSION must be a positive integer',
    );
  }

  return version;
};

const readMfaKey = (version: number): Buffer | null => {
  const raw = process.env[`MFA_ENCRYPTION_KEY_V${version}`];
  if (!raw || !KEY_PATTERN.test(raw)) return null;
  const key = Buffer.from(raw, 'base64');

  return key.length === 32 && key.toString('base64') === raw ? key : null;
};

/** The AES-256 key of a version; throws when it is absent or malformed. */
export const getMfaEncryptionKey = (version: number): Buffer => {
  const key =
    Number.isSafeInteger(version) && version > 0 ? readMfaKey(version) : null;
  if (!key) {
    throw new Error(`MFA encryption key V${version} is missing or invalid`);
  }

  return key;
};

/** True when the current key and every stored version can be read. */
export const areMfaKeysConfigured = (
  storedVersions: readonly number[],
): boolean => {
  try {
    return [getCurrentMfaKeyVersion(), ...storedVersions].every(
      (version) => readMfaKey(version) !== null,
    );
  } catch {
    return false;
  }
};
