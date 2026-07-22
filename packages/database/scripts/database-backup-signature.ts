import {
  createHash,
  createPrivateKey,
  createPublicKey,
  type KeyObject,
  sign,
  verify,
} from 'node:crypto';

import {
  type BackupManifest,
  type BackupTableProperty,
  DATABASE_BACKUP_FORMAT_VERSION,
  DATABASE_BACKUP_TABLES,
} from './database-backup-format.ts';

export const DATABASE_BACKUP_SIGNATURE_DOMAIN =
  'carnet-de-bord:database-backup:v1';
export const DATABASE_BACKUP_SIGNATURE_FORMAT_VERSION = 1;
export const DATABASE_BACKUP_SIGNATURE_ALGORITHM = 'Ed25519';
export const MAX_DATABASE_BACKUP_SIGNATURE_BYTES = 64 * 1024;

const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const ED25519_SIGNATURE_PATTERN = /^[A-Za-z0-9+/]{86}==$/u;
const SPKI_PUBLIC_KEY_PEM_PATTERN =
  /^-----BEGIN PUBLIC KEY-----\n[\s\S]+\n-----END PUBLIC KEY-----$/u;

type UnknownRecord = Record<string, unknown>;

export type DatabaseBackupSignatureMaterial = Readonly<{
  backupSizeBytes: number;
  counts: Readonly<Record<BackupTableProperty, number>>;
  manifest: BackupManifest;
  sha256: string;
}>;

export type DatabaseBackupSignatureEnvelope = Readonly<{
  algorithm: typeof DATABASE_BACKUP_SIGNATURE_ALGORITHM;
  backupCreatedAt: string;
  backupFormatVersion: typeof DATABASE_BACKUP_FORMAT_VERSION;
  backupId: string;
  backupSha256: string;
  backupSizeBytes: number;
  counts: Record<BackupTableProperty, number>;
  domain: typeof DATABASE_BACKUP_SIGNATURE_DOMAIN;
  manifestSha256: string;
  signature: string;
  signatureFormatVersion: typeof DATABASE_BACKUP_SIGNATURE_FORMAT_VERSION;
  signingKeyVersion: number;
}>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const assertClosedKeys = (
  value: UnknownRecord,
  expectedKeys: readonly string[],
  context: string,
): void => {
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  if (
    actual.length !== expected.length ||
    // Both arrays contain only own keys collected immediately above.
    // eslint-disable-next-line security/detect-object-injection
    actual.some((key, index) => key !== expected[index])
  ) {
    throw new Error(`${context} has unknown or missing properties`);
  }
};

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value)
        // Cryptographic canonicalization must not depend on ICU or a process
        // locale. JavaScript's relational string comparison is a stable
        // UTF-16 code-unit order on every backup and restore runtime.
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([key, nested]) => [key, canonicalize(nested)]),
    );
  }

  return value;
};

export const canonicalDatabaseBackupSignatureJson = (value: unknown): string =>
  JSON.stringify(canonicalize(value));

const hashCanonicalDocument = (value: unknown): string =>
  createHash('sha256')
    .update(canonicalDatabaseBackupSignatureJson(value), 'utf8')
    .digest('hex');

const normalizePem = (value: string): string =>
  value.replaceAll('\\n', '\n').replaceAll('\r\n', '\n').trim();

const readPositiveVersion = (
  environment: NodeJS.ProcessEnv,
  name: string,
): number => {
  // The name is fixed internally or derived from a validated positive version.
  // eslint-disable-next-line security/detect-object-injection
  const value = environment[name];
  if (!value || !/^[1-9]\d*$/u.test(value)) {
    throw new Error(`${name} must be a positive integer`);
  }
  const version = Number(value);
  if (!Number.isSafeInteger(version)) {
    throw new Error(`${name} exceeds the safe integer range`);
  }

  return version;
};

const readVersionedKey = (
  environment: NodeJS.ProcessEnv,
  prefix: string,
  version: number,
): string => {
  const name = `${prefix}_V${String(version)}`;
  // The suffix is a validated positive integer and the prefix is fixed.
  // eslint-disable-next-line security/detect-object-injection
  const value = environment[name];
  if (!value?.trim()) throw new Error(`${name} is required`);

  return normalizePem(value);
};

const validateCounts = (
  value: unknown,
): Record<BackupTableProperty, number> => {
  if (!isRecord(value)) throw new Error('Backup signature counts are invalid');
  assertClosedKeys(
    value,
    DATABASE_BACKUP_TABLES.map(({ property }) => property),
    'Backup signature counts',
  );
  const counts = {} as Record<BackupTableProperty, number>;
  for (const { property } of DATABASE_BACKUP_TABLES) {
    // Property names come from the closed static backup contract.
    // eslint-disable-next-line security/detect-object-injection
    const count = value[property];
    if (!Number.isSafeInteger(count) || Number(count) < 0) {
      throw new Error(`Backup signature count for ${property} is invalid`);
    }
    // Property names come from the closed static backup contract.
    // eslint-disable-next-line security/detect-object-injection
    counts[property] = Number(count);
  }

  return counts;
};

const buildUnsignedEnvelope = (
  material: DatabaseBackupSignatureMaterial,
  signingKeyVersion: number,
): Omit<DatabaseBackupSignatureEnvelope, 'signature'> => {
  if (!SHA256_PATTERN.test(material.sha256)) {
    throw new Error('Database backup SHA-256 must be lowercase hexadecimal');
  }
  if (
    !Number.isSafeInteger(material.backupSizeBytes) ||
    material.backupSizeBytes < 1
  ) {
    throw new Error('Database backup size is invalid');
  }
  if (!UUID_V4_PATTERN.test(material.manifest.backupId)) {
    throw new Error('Database backup id is invalid');
  }
  const counts = validateCounts(material.counts);

  return {
    algorithm: DATABASE_BACKUP_SIGNATURE_ALGORITHM,
    backupCreatedAt: material.manifest.createdAt,
    backupFormatVersion: DATABASE_BACKUP_FORMAT_VERSION,
    backupId: material.manifest.backupId,
    backupSha256: material.sha256,
    backupSizeBytes: material.backupSizeBytes,
    counts,
    domain: DATABASE_BACKUP_SIGNATURE_DOMAIN,
    manifestSha256: hashCanonicalDocument(material.manifest),
    signatureFormatVersion: DATABASE_BACKUP_SIGNATURE_FORMAT_VERSION,
    signingKeyVersion,
  };
};

export const createDatabaseBackupSignature = (
  material: DatabaseBackupSignatureMaterial,
  environment: NodeJS.ProcessEnv = process.env,
): DatabaseBackupSignatureEnvelope => {
  const signingKeyVersion = readPositiveVersion(
    environment,
    'DATABASE_BACKUP_SIGNING_CURRENT_VERSION',
  );
  const privateKeyName = `DATABASE_BACKUP_SIGNING_PRIVATE_KEY_V${String(signingKeyVersion)}`;
  let privateKey: KeyObject;
  try {
    privateKey = createPrivateKey(
      readVersionedKey(
        environment,
        'DATABASE_BACKUP_SIGNING_PRIVATE_KEY',
        signingKeyVersion,
      ),
    );
  } catch (error) {
    throw new Error(
      `${privateKeyName} must contain a valid Ed25519 private key`,
      {
        cause: error,
      },
    );
  }
  if (privateKey.asymmetricKeyType !== 'ed25519') {
    throw new Error(
      `${privateKeyName} must contain a valid Ed25519 private key`,
    );
  }
  const unsigned = buildUnsignedEnvelope(material, signingKeyVersion);
  const envelope: DatabaseBackupSignatureEnvelope = {
    ...unsigned,
    signature: sign(
      null,
      Buffer.from(canonicalDatabaseBackupSignatureJson(unsigned), 'utf8'),
      privateKey,
    ).toString('base64'),
  };

  // The backup job also receives the matching public key. Self-verification
  // prevents a rotated or mistyped pair from publishing an irrecoverable
  // artifact; restore jobs still receive public material only.
  verifyDatabaseBackupSignature(envelope, material, environment);

  return envelope;
};

const parseEnvelope = (value: unknown): DatabaseBackupSignatureEnvelope => {
  if (!isRecord(value)) throw new Error('Backup signature is not an object');
  assertClosedKeys(
    value,
    [
      'algorithm',
      'backupCreatedAt',
      'backupFormatVersion',
      'backupId',
      'backupSha256',
      'backupSizeBytes',
      'counts',
      'domain',
      'manifestSha256',
      'signature',
      'signatureFormatVersion',
      'signingKeyVersion',
    ],
    'Backup signature',
  );
  if (
    value.algorithm !== DATABASE_BACKUP_SIGNATURE_ALGORITHM ||
    value.domain !== DATABASE_BACKUP_SIGNATURE_DOMAIN ||
    value.signatureFormatVersion !== DATABASE_BACKUP_SIGNATURE_FORMAT_VERSION ||
    value.backupFormatVersion !== DATABASE_BACKUP_FORMAT_VERSION ||
    typeof value.backupId !== 'string' ||
    !UUID_V4_PATTERN.test(value.backupId) ||
    typeof value.backupCreatedAt !== 'string' ||
    !Number.isFinite(Date.parse(value.backupCreatedAt)) ||
    new Date(value.backupCreatedAt).toISOString() !== value.backupCreatedAt ||
    typeof value.backupSha256 !== 'string' ||
    !SHA256_PATTERN.test(value.backupSha256) ||
    typeof value.manifestSha256 !== 'string' ||
    !SHA256_PATTERN.test(value.manifestSha256) ||
    !Number.isSafeInteger(value.backupSizeBytes) ||
    Number(value.backupSizeBytes) < 1 ||
    !Number.isSafeInteger(value.signingKeyVersion) ||
    Number(value.signingKeyVersion) < 1 ||
    typeof value.signature !== 'string' ||
    !ED25519_SIGNATURE_PATTERN.test(value.signature) ||
    Buffer.from(value.signature, 'base64').length !== 64 ||
    Buffer.from(value.signature, 'base64').toString('base64') !==
      value.signature
  ) {
    throw new Error('Backup signature envelope is invalid');
  }

  return {
    algorithm: DATABASE_BACKUP_SIGNATURE_ALGORITHM,
    backupCreatedAt: value.backupCreatedAt,
    backupFormatVersion: DATABASE_BACKUP_FORMAT_VERSION,
    backupId: value.backupId,
    backupSha256: value.backupSha256,
    backupSizeBytes: Number(value.backupSizeBytes),
    counts: validateCounts(value.counts),
    domain: DATABASE_BACKUP_SIGNATURE_DOMAIN,
    manifestSha256: value.manifestSha256,
    signature: value.signature,
    signatureFormatVersion: DATABASE_BACKUP_SIGNATURE_FORMAT_VERSION,
    signingKeyVersion: Number(value.signingKeyVersion),
  };
};

export const verifyDatabaseBackupSignature = (
  value: unknown,
  material: DatabaseBackupSignatureMaterial,
  environment: NodeJS.ProcessEnv = process.env,
): DatabaseBackupSignatureEnvelope => {
  const envelope = parseEnvelope(value);
  const expected = buildUnsignedEnvelope(material, envelope.signingKeyVersion);
  const { signature, ...unsigned } = envelope;
  if (
    canonicalDatabaseBackupSignatureJson(unsigned) !==
    canonicalDatabaseBackupSignatureJson(expected)
  ) {
    throw new Error('Backup signature does not match the backup manifest');
  }
  const publicKeyName = `DATABASE_BACKUP_SIGNING_PUBLIC_KEY_V${String(envelope.signingKeyVersion)}`;
  let publicKey: KeyObject;
  try {
    const publicKeyPem = readVersionedKey(
      environment,
      'DATABASE_BACKUP_SIGNING_PUBLIC_KEY',
      envelope.signingKeyVersion,
    );
    // Node's createPublicKey also accepts a private PKCS#8 document and derives
    // its public half. Reject that key confusion: restore environments must
    // retain only an explicit SPKI public key.
    if (!SPKI_PUBLIC_KEY_PEM_PATTERN.test(publicKeyPem)) {
      throw new Error('not an explicit SPKI public key');
    }
    publicKey = createPublicKey(publicKeyPem);
  } catch (error) {
    throw new Error(
      `${publicKeyName} must contain a valid Ed25519 public key`,
      {
        cause: error,
      },
    );
  }
  if (
    publicKey.asymmetricKeyType !== 'ed25519' ||
    !verify(
      null,
      Buffer.from(canonicalDatabaseBackupSignatureJson(unsigned), 'utf8'),
      publicKey,
      Buffer.from(signature, 'base64'),
    )
  ) {
    throw new Error('Database backup signature verification failed');
  }

  return envelope;
};
