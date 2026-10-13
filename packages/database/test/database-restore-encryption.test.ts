import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createCipheriv, randomBytes } from 'node:crypto';
import { mkdtemp, open, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  DATABASE_BACKUP_TABLES,
  stringifyBackupRecord,
} from '../scripts/database-backup-format.ts';
import {
  readAndValidateBackupStreamWithDigest,
  validateRestoreEncryption,
} from '../scripts/database-restore-support.ts';

const key = Buffer.alloc(32, 37);
const otherKey = Buffer.alloc(32, 38);
const environment = {
  AUDIT_ENCRYPTION_CURRENT_VERSION: '1',
  AUDIT_ENCRYPTION_KEY_V1: key.toString('base64'),
  MFA_ENCRYPTION_KEY_V1: key.toString('base64'),
};

type Rows = Readonly<Record<string, readonly Record<string, unknown>[]>>;

const encrypt = (
  plaintext: string,
  aad: string,
): {
  authTag: Buffer;
  ciphertext: Buffer;
  iv: Buffer;
} => {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(aad));
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  return {
    authTag: cipher.getAuthTag(),
    ciphertext,
    iv,
  };
};

const totp = (userId = 'fixture-user'): Record<string, unknown> => {
  const encrypted = encrypt(
    'JBSWY3DPEHPK3PXP',
    `team-control:totp-secret:v1:${userId}`,
  );

  return {
    secretAuthTag: encrypted.authTag.toString('base64'),
    secretCiphertext: encrypted.ciphertext.toString('base64'),
    secretIv: encrypted.iv.toString('base64'),
    secretKeyVersion: 1,
    userId,
  };
};

const audit = (
  plaintext = '{"after":"fixture","before":null}',
): Record<string, unknown> => {
  // This is the canonical key order produced by person-audit.ts.
  const context = {
    auditLogId: 'fixture-audit',
    changeType: 'UPDATE',
    entityId: 'fixture-person',
    entityType: 'PERSON',
    fieldKey: 'value',
    recordId: 'fixture-email',
    sectionKey: 'emails',
  };
  const encrypted = encrypt(plaintext, JSON.stringify(context));

  return {
    ...context,
    valueKeyVersion: 1,
    valueMode: 'ENCRYPTED',
    valuesAuthTag: encrypted.authTag,
    valuesCiphertext: encrypted.ciphertext,
    valuesIv: encrypted.iv,
  };
};

const backup = (rows: Rows): string => {
  const lines = [
    stringifyBackupRecord({
      backupId: '123e4567-e89b-42d3-a456-426614174000',
      createdAt: '2026-10-13T01:00:00.000Z',
      formatVersion: 9,
      requiredAuditEncryptionKeyVersions: [1],
      tables: DATABASE_BACKUP_TABLES.map(({ property, tableName }) => ({
        property,
        tableName,
      })),
      type: 'manifest',
    }),
  ];
  const counts: Record<string, number> = {};
  for (const { property } of DATABASE_BACKUP_TABLES) {
    // Property names belong to the closed backup table catalogue.
    // eslint-disable-next-line security/detect-object-injection
    const values = rows[property] ?? [];
    // eslint-disable-next-line security/detect-object-injection
    counts[property] = values.length;
    lines.push(stringifyBackupRecord({ property, type: 'tableStart' }));
    for (const value of values)
      lines.push(stringifyBackupRecord({ property, type: 'row', value }));
    lines.push(
      stringifyBackupRecord({
        count: values.length,
        property,
        type: 'tableEnd',
      }),
    );
  }
  lines.push(stringifyBackupRecord({ counts, type: 'footer' }));

  return lines.join('\n');
};

const preflight = async (
  rows: Rows,
  keys: NodeJS.ProcessEnv = environment,
): Promise<void> => {
  const directory = await mkdtemp(
    join(tmpdir(), 'noctambule-restore-encryption-unit-'),
  );
  const path = join(directory, 'fixture.ndjson');
  try {
    // The path is a fixed filename inside this test's unique temporary directory.
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    await writeFile(path, backup(rows));
    const verified = await readAndValidateBackupStreamWithDigest(path);
    await validateRestoreEncryption(path, verified, keys);
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
};

test('accepts valid active and pending TOTP seeds and encrypted audit values', async () => {
  await preflight({
    auditFieldChanges: [audit()],
    totpCredentials: [totp()],
    totpEnrollments: [totp('pending-user')],
  });
});

test('does not require an MFA key when no seed is archived', async () => {
  await preflight({}, { ...environment, MFA_ENCRYPTION_KEY_V1: undefined });
});

test('rejects a missing MFA key for an active seed', async () => {
  await assert.rejects(
    preflight(
      { totpCredentials: [totp()] },
      { ...environment, MFA_ENCRYPTION_KEY_V1: undefined },
    ),
  );
});

test('rejects a wrong but well-formed MFA key for a pending seed', async () => {
  await assert.rejects(
    preflight(
      { totpEnrollments: [totp()] },
      { ...environment, MFA_ENCRYPTION_KEY_V1: otherKey.toString('base64') },
    ),
  );
});

test('authenticates every seed including a later row with changed owner', async () => {
  await assert.rejects(
    preflight({
      totpCredentials: [
        totp(),
        { ...totp('second-user'), userId: 'changed-user' },
      ],
    }),
  );
});

test('rejects a wrong but well-formed audit key', async () => {
  await assert.rejects(
    preflight(
      { auditFieldChanges: [audit()] },
      { ...environment, AUDIT_ENCRYPTION_KEY_V1: otherKey.toString('base64') },
    ),
  );
});

test('rejects encrypted audit values whose authenticated context changed', async () => {
  await assert.rejects(
    preflight({ auditFieldChanges: [{ ...audit(), recordId: 'other-email' }] }),
  );
});

test('rejects authenticated audit plaintext that the reader cannot parse', async () => {
  await assert.rejects(preflight({ auditFieldChanges: [audit('not-json')] }));
});

test('rejects unsupported MFA key versions', async () => {
  await assert.rejects(
    preflight({ totpCredentials: [{ ...totp(), secretKeyVersion: 2 }] }),
    /Unsupported TOTP encryption key version/u,
  );
});

test('rejects modified ciphertext and authentication tags without logging cleartext', async () => {
  const changedSeed = {
    ...totp(),
    secretAuthTag: Buffer.alloc(16).toString('base64'),
  };
  await assert.rejects(
    preflight({ totpCredentials: [changedSeed] }),
    /cannot be authenticated/u,
  );
  const changedAudit = { ...audit(), valuesCiphertext: Buffer.alloc(32) };
  await assert.rejects(
    preflight({ auditFieldChanges: [changedAudit] }),
    /cannot be authenticated/u,
  );
  await assert.rejects(
    preflight({ auditFieldChanges: [audit('private-fixture-value')] }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.equal(error.message.includes('private-fixture-value'), false);

      return true;
    },
  );
});

test('rejects malformed IVs, encoded envelopes and non-object audit payloads', async () => {
  await assert.rejects(
    preflight({
      totpCredentials: [
        { ...totp(), secretIv: Buffer.alloc(11).toString('base64') },
      ],
    }),
  );
  await assert.rejects(
    preflight({
      totpCredentials: [
        { ...totp(), secretCiphertext: 'not canonical base64' },
      ],
    }),
  );
  await assert.rejects(
    preflight({ auditFieldChanges: [{ ...audit(), valuesIv: '\\x0g' }] }),
  );
  await assert.rejects(preflight({ auditFieldChanges: [audit('null')] }));
});

test('uses the authenticated open file and rejects changes before the encryption pass', async () => {
  const directory = await mkdtemp(
    join(tmpdir(), 'noctambule-restore-encryption-unit-'),
  );
  const path = join(directory, 'fixture.ndjson');
  try {
    // This test owns the unique temporary directory and its fixed fixture name.
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    await writeFile(path, backup({ totpCredentials: [totp()] }));
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const file = await open(path, 'r');
    try {
      const verified = await readAndValidateBackupStreamWithDigest(file);
      await validateRestoreEncryption(file, verified, environment);
      // A still valid but different backup must not inherit the old signature.
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      await writeFile(
        path,
        backup({ totpCredentials: [totp('changed-owner')] }),
      );
      await assert.rejects(
        validateRestoreEncryption(file, verified, environment),
        /changed between signature and encryption/u,
      );
    } finally {
      await file.close();
    }
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});
