import { Buffer } from 'node:buffer';
import { createDecipheriv, createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import type { FileHandle } from 'node:fs/promises';
import { TextDecoder } from 'node:util';

import {
  type BackupFormatExpectation,
  type BackupStreamSummary,
  BackupStreamValidator,
  MAX_BACKUP_LINE_BYTES,
  MAX_DATABASE_BACKUP_BYTES,
  type ParsedBackupRecord,
  type ValidatedBackupManifest,
} from './database-backup-format.ts';

export type BackupRecordHandler = (
  record: ParsedBackupRecord,
  lineNumber: number,
) => Promise<void> | void;

export type BackupStreamDigest = Readonly<{
  sha256: string;
  sizeBytes: number;
  summary: BackupStreamSummary;
}>;

type BackupStreamSource = FileHandle | string;

const decodeLine = (
  fragments: readonly Buffer[],
  byteLength: number,
): string => {
  const joined =
    fragments.length === 1 && fragments[0]
      ? fragments[0]
      : Buffer.concat(fragments, byteLength);
  const content =
    joined.at(-1) === 13 ? joined.subarray(0, joined.length - 1) : joined;

  return new TextDecoder('utf-8', { fatal: true }).decode(content);
};

async function* readBoundedBackupLines(
  source: BackupStreamSource,
  onChunk?: (chunk: Buffer) => void,
): AsyncGenerator<string> {
  let input;
  if (typeof source === 'string') {
    // The operator-provided path is resolved and bounded before this helper is
    // called by the restore entry point.
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    input = createReadStream(source);
  } else {
    input = source.createReadStream({ autoClose: false, start: 0 });
  }
  let fragments: Buffer[] = [];
  let pendingBytes = 0;
  let totalBytes = 0;

  const append = (fragment: Buffer): void => {
    pendingBytes += fragment.length;
    if (pendingBytes > MAX_BACKUP_LINE_BYTES) {
      throw new Error('A backup line exceeds the safe limit');
    }
    if (fragment.length > 0) fragments.push(fragment);
  };

  try {
    for await (const rawChunk of input) {
      const chunk = Buffer.isBuffer(rawChunk)
        ? rawChunk
        : Buffer.from(rawChunk as Uint8Array);
      totalBytes += chunk.length;
      if (totalBytes > MAX_DATABASE_BACKUP_BYTES) {
        throw new Error('Backup exceeds the safe restore size limit');
      }
      onChunk?.(chunk);
      let start = 0;
      for (
        let index = chunk.indexOf(10, start);
        index >= 0;
        index = chunk.indexOf(10, start)
      ) {
        append(chunk.subarray(start, index));
        yield decodeLine(fragments, pendingBytes);
        fragments = [];
        pendingBytes = 0;
        start = index + 1;
      }
      append(chunk.subarray(start));
    }
    if (pendingBytes > 0) yield decodeLine(fragments, pendingBytes);
  } finally {
    // A FileHandle is intentionally reused for the authenticated validation
    // and restore passes. Destroying its wrapper would close that shared fd on
    // Node even with autoClose=false.
    if (typeof source === 'string') input.destroy();
  }
}

export const readAndValidateBackupStream = async (
  source: BackupStreamSource,
  onRecord?: BackupRecordHandler,
  formatExpectation: BackupFormatExpectation = 'current-signed',
): Promise<BackupStreamSummary> => {
  const validator = new BackupStreamValidator(formatExpectation);
  let lineNumber = 0;

  for await (const line of readBoundedBackupLines(source)) {
    lineNumber += 1;
    const record = validator.consume(line, lineNumber);
    await onRecord?.(record, lineNumber);
  }

  return validator.finish();
};

export const readAndValidateBackupStreamWithDigest = async (
  source: BackupStreamSource,
  onRecord?: BackupRecordHandler,
  formatExpectation: BackupFormatExpectation = 'current-signed',
): Promise<BackupStreamDigest> => {
  const validator = new BackupStreamValidator(formatExpectation);
  const hash = createHash('sha256');
  let lineNumber = 0;
  let sizeBytes = 0;

  for await (const line of readBoundedBackupLines(source, (chunk) => {
    hash.update(chunk);
    sizeBytes += chunk.length;
  })) {
    lineNumber += 1;
    const record = validator.consume(line, lineNumber);
    await onRecord?.(record, lineNumber);
  }

  const summary = validator.finish();

  return {
    sha256: hash.digest('hex'),
    sizeBytes,
    summary,
  };
};

const readPositiveEnvironmentVersion = (
  environment: NodeJS.ProcessEnv,
  name: string,
): number => {
  // Names are fixed internally or derived from validated positive versions.
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

const readBase64Aes256Key = (
  environment: NodeJS.ProcessEnv,
  name: string,
): Buffer => {
  // The suffix is a validated positive integer.
  // eslint-disable-next-line security/detect-object-injection
  const value = environment[name];
  const decoded = value ? Buffer.from(value, 'base64') : null;
  if (
    value === undefined ||
    decoded === null ||
    !/^[A-Za-z0-9+/]{43}=$/u.test(value) ||
    decoded.length !== 32 ||
    decoded.toString('base64') !== value
  ) {
    decoded?.fill(0);
    throw new Error(
      `${name} must contain exactly 32 bytes encoded as canonical Base64`,
    );
  }

  return decoded;
};

export const validateRestoreEnvironment = (
  manifest: ValidatedBackupManifest,
  environment: NodeJS.ProcessEnv = process.env,
): void => {
  const currentAuditVersion = readPositiveEnvironmentVersion(
    environment,
    'AUDIT_ENCRYPTION_CURRENT_VERSION',
  );
  const requiredAuditVersions = new Set([
    currentAuditVersion,
    ...manifest.requiredAuditEncryptionKeyVersions,
  ]);
  for (const version of requiredAuditVersions) {
    readBase64Aes256Key(
      environment,
      `AUDIT_ENCRYPTION_KEY_V${String(version)}`,
    ).fill(0);
  }
};

const readString = (value: unknown): string => {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error('Invalid encrypted backup envelope');
  }

  return value;
};

const readBase64 = (value: unknown): Buffer => {
  const encoded = readString(value);
  const decoded = Buffer.from(encoded, 'base64');
  if (decoded.length === 0 || decoded.toString('base64') !== encoded) {
    throw new Error('Invalid Base64 encrypted backup envelope');
  }

  return decoded;
};

const readBytea = (value: unknown): Buffer => {
  const encoded = readString(value);
  if (!/^\\x[0-9a-f]+$/u.test(encoded) || encoded.length % 2 !== 0) {
    throw new Error('Invalid bytea encrypted backup envelope');
  }

  return Buffer.from(encoded.slice(2), 'hex');
};

const verifyEncryptedValue = (input: {
  aad: Buffer;
  authTag: Buffer;
  ciphertext: Buffer;
  iv: Buffer;
  key: Buffer;
  validatePlaintext: (plaintext: string) => void;
}): void => {
  let prefix: Buffer | undefined;
  let suffix: Buffer | undefined;
  let plaintext: Buffer | undefined;
  try {
    if (input.iv.length !== 12 || input.authTag.length !== 16) {
      throw new Error('Invalid AES-GCM envelope');
    }
    const decipher = createDecipheriv('aes-256-gcm', input.key, input.iv);
    decipher.setAAD(input.aad);
    decipher.setAuthTag(input.authTag);
    prefix = decipher.update(input.ciphertext);
    suffix = decipher.final();
    plaintext = Buffer.concat([prefix, suffix]);
    input.validatePlaintext(
      new TextDecoder('utf-8', { fatal: true }).decode(plaintext),
    );
  } catch {
    // Never include ciphertext, clear values or native parser errors in CLI output.
    throw new Error(
      'Encrypted backup value cannot be authenticated or decoded with the configured key',
    );
  } finally {
    prefix?.fill(0);
    suffix?.fill(0);
    plaintext?.fill(0);
    input.key.fill(0);
  }
};

const validateEncryptedRecord = (
  record: ParsedBackupRecord,
  environment: NodeJS.ProcessEnv,
): void => {
  if (record.type !== 'row') return;
  const row = record.value;
  if (
    record.property === 'totpCredentials' ||
    record.property === 'totpEnrollments'
  ) {
    if (row.secretKeyVersion !== 1) {
      throw new Error('Unsupported TOTP encryption key version');
    }
    // Match shared/server/mfa.ts: the owner is part of the authenticated data.
    const aad = Buffer.from(
      `team-control:totp-secret:v1:${readString(row.userId)}`,
    );
    const authTag = readBase64(row.secretAuthTag);
    const ciphertext = readBase64(row.secretCiphertext);
    const iv = readBase64(row.secretIv);
    verifyEncryptedValue({
      aad,
      authTag,
      ciphertext,
      iv,
      key: readBase64Aes256Key(environment, 'MFA_ENCRYPTION_KEY_V1'),
      validatePlaintext: (plaintext) => {
        if (!/^[A-Z2-7]+$/u.test(plaintext))
          throw new Error('Invalid TOTP seed');
      },
    });
  } else if (
    record.property === 'auditFieldChanges' &&
    row.valueMode === 'ENCRYPTED'
  ) {
    const version = row.valueKeyVersion;
    if (
      typeof version !== 'number' ||
      !Number.isSafeInteger(version) ||
      version < 1
    ) {
      throw new Error('Invalid audit encryption key version');
    }
    if (
      row.entityType !== 'PERSON' ||
      (row.recordId !== null && typeof row.recordId !== 'string')
    ) {
      throw new Error('Invalid encrypted audit context');
    }
    // Exact canonical key order and fields produced by person-audit.ts.
    const aad = Buffer.from(
      JSON.stringify({
        auditLogId: readString(row.auditLogId),
        changeType: readString(row.changeType),
        entityId: readString(row.entityId),
        entityType: 'PERSON',
        fieldKey: readString(row.fieldKey),
        recordId: row.recordId,
        sectionKey: readString(row.sectionKey),
      }),
    );
    const authTag = readBytea(row.valuesAuthTag);
    const ciphertext = readBytea(row.valuesCiphertext);
    const iv = readBytea(row.valuesIv);
    if (ciphertext.length > 8 * 1024)
      throw new Error('Encrypted audit value exceeds its storage limit');
    verifyEncryptedValue({
      aad,
      authTag,
      ciphertext,
      iv,
      key: readBase64Aes256Key(
        environment,
        `AUDIT_ENCRYPTION_KEY_V${String(version)}`,
      ),
      validatePlaintext: (plaintext) => {
        const parsed: unknown = JSON.parse(plaintext);
        if (
          parsed === null ||
          typeof parsed !== 'object' ||
          Array.isArray(parsed)
        ) {
          throw new Error('Invalid audit values object');
        }
      },
    });
  }
};

/** Called only after the initial digest and signature have been verified. */
export const validateRestoreEncryption = async (
  source: BackupStreamSource,
  verifiedArtifact: BackupStreamDigest,
  environment: NodeJS.ProcessEnv = process.env,
  formatExpectation: BackupFormatExpectation = 'current-signed',
): Promise<void> => {
  validateRestoreEnvironment(verifiedArtifact.summary.manifest, environment);
  const checked = await readAndValidateBackupStreamWithDigest(
    source,
    (record) => validateEncryptedRecord(record, environment),
    formatExpectation,
  );
  if (
    checked.sha256 !== verifiedArtifact.sha256 ||
    checked.sizeBytes !== verifiedArtifact.sizeBytes
  ) {
    throw new Error(
      'Backup changed between signature and encryption validation',
    );
  }
};
