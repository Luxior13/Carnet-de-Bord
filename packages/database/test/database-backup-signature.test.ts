import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { mkdir, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

import type { PrismaClient } from '@prisma/client';

import { createDatabaseBackup } from '../scripts/database-backup.ts';
import {
  type BackupManifest,
  DATABASE_BACKUP_FORMAT_VERSION,
  DATABASE_BACKUP_TABLES,
} from '../scripts/database-backup-format.ts';
import {
  canonicalDatabaseBackupSignatureJson,
  createDatabaseBackupSignature,
  DATABASE_BACKUP_SIGNATURE_ALGORITHM,
  DATABASE_BACKUP_SIGNATURE_DOMAIN,
  type DatabaseBackupSignatureMaterial,
  verifyDatabaseBackupSignature,
} from '../scripts/database-backup-signature.ts';

type SignatureFixture = {
  material: DatabaseBackupSignatureMaterial;
  otherPublicKey: string;
  privateKey: string;
  publicKey: string;
};

const createFixture = (): SignatureFixture => {
  const signingKeys = generateKeyPairSync('ed25519');
  const otherKeys = generateKeyPairSync('ed25519');
  const privateKey = signingKeys.privateKey
    .export({ format: 'pem', type: 'pkcs8' })
    .toString();
  const publicKey = signingKeys.publicKey
    .export({ format: 'pem', type: 'spki' })
    .toString();
  const otherPublicKey = otherKeys.publicKey
    .export({ format: 'pem', type: 'spki' })
    .toString();
  const manifest: BackupManifest = {
    backupId: '123e4567-e89b-42d3-a456-426614174000',
    createdAt: '2026-07-22T12:00:00.000Z',
    formatVersion: DATABASE_BACKUP_FORMAT_VERSION,
    requiredAuditEncryptionKeyVersions: [1, 2],
    tables: DATABASE_BACKUP_TABLES.map(({ property, tableName }) => ({
      property,
      tableName,
    })),
    type: 'manifest',
  };
  const counts = Object.fromEntries(
    DATABASE_BACKUP_TABLES.map(({ property }, index) => [property, index]),
  ) as Record<(typeof DATABASE_BACKUP_TABLES)[number]['property'], number>;
  const material = {
    backupSizeBytes: 42_000,
    counts,
    manifest,
    sha256: 'b'.repeat(64),
  };

  return { material, otherPublicKey, privateKey, publicKey };
};

test('self-verifies in backup and verifies again with restore-only public material', () => {
  const fixture = createFixture();
  const envelope = createDatabaseBackupSignature(fixture.material, {
    DATABASE_BACKUP_SIGNING_CURRENT_VERSION: '3',
    DATABASE_BACKUP_SIGNING_PRIVATE_KEY_V3: fixture.privateKey,
    DATABASE_BACKUP_SIGNING_PUBLIC_KEY_V3: fixture.publicKey,
  });

  assert.equal(envelope.algorithm, DATABASE_BACKUP_SIGNATURE_ALGORITHM);
  assert.equal(envelope.domain, DATABASE_BACKUP_SIGNATURE_DOMAIN);
  assert.equal(envelope.signingKeyVersion, 3);
  assert.equal(
    verifyDatabaseBackupSignature(envelope, fixture.material, {
      DATABASE_BACKUP_SIGNING_PUBLIC_KEY_V3: fixture.publicKey,
    }).backupId,
    fixture.material.manifest.backupId,
  );
});

test('uses locale-independent canonical key ordering', () => {
  /* eslint-disable sort-keys-custom-order/object-keys -- Intentionally unsorted input proves canonicalization. */
  assert.equal(
    canonicalDatabaseBackupSignatureJson({
      z: 1,
      a: 2,
      nested: { y: 3, b: 4 },
    }),
    '{"a":2,"nested":{"b":4,"y":3},"z":1}',
  );
  /* eslint-enable sort-keys-custom-order/object-keys */
});

test('rejects altered digest, counters, identity, domain, algorithm and shape', () => {
  const fixture = createFixture();
  const envelope = createDatabaseBackupSignature(fixture.material, {
    DATABASE_BACKUP_SIGNING_CURRENT_VERSION: '1',
    DATABASE_BACKUP_SIGNING_PRIVATE_KEY_V1: fixture.privateKey,
    DATABASE_BACKUP_SIGNING_PUBLIC_KEY_V1: fixture.publicKey,
  });
  const restoreEnvironment = {
    DATABASE_BACKUP_SIGNING_PUBLIC_KEY_V1: fixture.publicKey,
  };
  const firstProperty = DATABASE_BACKUP_TABLES[0]?.property;
  assert.ok(firstProperty);

  assert.throws(
    () =>
      verifyDatabaseBackupSignature(
        { ...envelope, backupSha256: 'c'.repeat(64) },
        fixture.material,
        restoreEnvironment,
      ),
    /does not match/u,
  );
  assert.throws(
    () =>
      verifyDatabaseBackupSignature(
        {
          ...envelope,
          counts: {
            ...envelope.counts,
            // The property comes from the closed static backup contract.
            // eslint-disable-next-line security/detect-object-injection
            [firstProperty]: envelope.counts[firstProperty] + 1,
          },
        },
        fixture.material,
        restoreEnvironment,
      ),
    /does not match/u,
  );
  assert.throws(
    () =>
      verifyDatabaseBackupSignature(
        {
          ...envelope,
          backupId: '223e4567-e89b-42d3-a456-426614174000',
        },
        fixture.material,
        restoreEnvironment,
      ),
    /does not match/u,
  );
  assert.throws(
    () =>
      verifyDatabaseBackupSignature(
        { ...envelope, domain: 'another-domain' },
        fixture.material,
        restoreEnvironment,
      ),
    /envelope is invalid/u,
  );
  assert.throws(
    () =>
      verifyDatabaseBackupSignature(
        { ...envelope, algorithm: 'RSA' },
        fixture.material,
        restoreEnvironment,
      ),
    /envelope is invalid/u,
  );
  assert.throws(
    () =>
      verifyDatabaseBackupSignature(
        { ...envelope, unexpected: true },
        fixture.material,
        restoreEnvironment,
      ),
    /unknown or missing/u,
  );
});

test('rejects replay against another backup manifest and counter set', () => {
  const fixture = createFixture();
  const envelope = createDatabaseBackupSignature(fixture.material, {
    DATABASE_BACKUP_SIGNING_CURRENT_VERSION: '2',
    DATABASE_BACKUP_SIGNING_PRIVATE_KEY_V2: fixture.privateKey,
    DATABASE_BACKUP_SIGNING_PUBLIC_KEY_V2: fixture.publicKey,
  });
  const differentMaterial = {
    ...fixture.material,
    manifest: {
      ...fixture.material.manifest,
      backupId: '323e4567-e89b-42d3-a456-426614174000',
      createdAt: '2026-07-22T12:01:00.000Z',
    },
  };

  assert.throws(
    () =>
      verifyDatabaseBackupSignature(envelope, differentMaterial, {
        DATABASE_BACKUP_SIGNING_PUBLIC_KEY_V2: fixture.publicKey,
      }),
    /does not match/u,
  );
});

test('fails closed on a missing, wrong, non-Ed25519 or invalid key version', () => {
  const fixture = createFixture();
  const envelope = createDatabaseBackupSignature(fixture.material, {
    DATABASE_BACKUP_SIGNING_CURRENT_VERSION: '1',
    DATABASE_BACKUP_SIGNING_PRIVATE_KEY_V1: fixture.privateKey,
    DATABASE_BACKUP_SIGNING_PUBLIC_KEY_V1: fixture.publicKey,
  });

  assert.throws(
    () => verifyDatabaseBackupSignature(envelope, fixture.material, {}),
    /DATABASE_BACKUP_SIGNING_PUBLIC_KEY_V1/u,
  );
  assert.throws(
    () =>
      verifyDatabaseBackupSignature(envelope, fixture.material, {
        DATABASE_BACKUP_SIGNING_PUBLIC_KEY_V1: fixture.otherPublicKey,
      }),
    /verification failed/u,
  );
  assert.throws(
    () =>
      verifyDatabaseBackupSignature(envelope, fixture.material, {
        DATABASE_BACKUP_SIGNING_PUBLIC_KEY_V1: fixture.privateKey,
      }),
    /valid Ed25519 public key/u,
  );
  assert.throws(
    () =>
      createDatabaseBackupSignature(fixture.material, {
        DATABASE_BACKUP_SIGNING_CURRENT_VERSION: '0',
        DATABASE_BACKUP_SIGNING_PRIVATE_KEY_V0: fixture.privateKey,
        DATABASE_BACKUP_SIGNING_PUBLIC_KEY_V0: fixture.publicKey,
      }),
    /positive integer/u,
  );
  assert.throws(
    () =>
      createDatabaseBackupSignature(fixture.material, {
        DATABASE_BACKUP_SIGNING_CURRENT_VERSION: '1',
        DATABASE_BACKUP_SIGNING_PRIVATE_KEY_V1: fixture.publicKey,
        DATABASE_BACKUP_SIGNING_PUBLIC_KEY_V1: fixture.publicKey,
      }),
    /valid Ed25519 private key/u,
  );
  assert.throws(
    () =>
      createDatabaseBackupSignature(fixture.material, {
        DATABASE_BACKUP_SIGNING_CURRENT_VERSION: '1',
        DATABASE_BACKUP_SIGNING_PRIVATE_KEY_V1: fixture.privateKey,
        DATABASE_BACKUP_SIGNING_PUBLIC_KEY_V1: fixture.otherPublicKey,
      }),
    /verification failed/u,
  );
});

test('publishes no JSONL or sidecar when the backup key pair is mismatched', async () => {
  const fixture = createFixture();
  const backupDirectory = resolve(
    import.meta.dirname,
    '..',
    '..',
    '..',
    '.codex-tmp',
    'database-backups',
  );
  // This is the same internal repository path used by createDatabaseBackup.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  await mkdir(backupDirectory, { recursive: true });
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const before = (await readdir(backupDirectory)).sort();
  const environment: NodeJS.ProcessEnv = {
    DATABASE_BACKUP_SIGNING_CURRENT_VERSION: '1',
    DATABASE_BACKUP_SIGNING_PRIVATE_KEY_V1: fixture.privateKey,
    DATABASE_BACKUP_SIGNING_PUBLIC_KEY_V1: fixture.otherPublicKey,
  };
  const queryClient = {
    $queryRaw: async (): Promise<never[]> => [],
    $queryRawUnsafe: async (): Promise<never[]> => [],
  };
  const prisma = {
    $transaction: async (
      callback: (transaction: typeof queryClient) => Promise<unknown>,
    ): Promise<unknown> => callback(queryClient),
  } as unknown as PrismaClient;

  await assert.rejects(
    createDatabaseBackup(prisma, environment),
    /signature verification failed/u,
  );
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  assert.deepEqual((await readdir(backupDirectory)).sort(), before);
});
