import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
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

const validateBase64Aes256Key = (
  environment: NodeJS.ProcessEnv,
  version: number,
): void => {
  const name = `AUDIT_ENCRYPTION_KEY_V${String(version)}`;
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
    throw new Error(
      `${name} must contain exactly 32 bytes encoded as canonical Base64`,
    );
  }
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
    validateBase64Aes256Key(environment, version);
  }
};
