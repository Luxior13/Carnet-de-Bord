import { PrismaClient } from '@prisma/client';

import { createDatabaseBackup } from './database-backup';
import {
  decryptTotpSecret,
  encryptTotpSecret,
  readMfaKey,
} from './totp-secret-crypto';

const CONFIRMATION = 'REENCRYPT-MFA-SECRETS';
const TABLES = ['TotpCredential', 'TotpEnrollment'] as const;

type Table = (typeof TABLES)[number];
type SecretRow = {
  secretAuthTag: string;
  secretCiphertext: string;
  secretIv: string;
  secretKeyVersion: number;
  userId: string;
};

const parseArguments = (arguments_: string[]): { dryRun: boolean } => {
  const values = arguments_.filter((argument) => argument !== '--');
  const known = values.filter(
    (argument) => argument === '--dry-run' || argument.startsWith('--confirm='),
  );
  if (known.length !== values.length) {
    throw new Error(
      'Argument inconnu. Consultez docs/exploitation/operations.md.',
    );
  }
  const dryRun = values.includes('--dry-run');
  if (!dryRun && !values.includes(`--confirm=${CONFIRMATION}`)) {
    throw new Error(`--dry-run ou --confirm=${CONFIRMATION} est obligatoire.`);
  }

  return { dryRun };
};

const readTargetVersion = (): number => {
  const version = Number(process.env.MFA_ENCRYPTION_CURRENT_VERSION);
  if (!Number.isSafeInteger(version) || version < 1) {
    throw new Error(
      'MFA_ENCRYPTION_CURRENT_VERSION doit désigner explicitement la version cible.',
    );
  }

  return version;
};

const readRows = (
  prisma: PrismaClient,
  table: Table,
  target: number,
): Promise<SecretRow[]> =>
  table === 'TotpCredential'
    ? prisma.$queryRaw<SecretRow[]>`
        SELECT "userId", "secretCiphertext", "secretIv", "secretAuthTag", "secretKeyVersion"
        FROM "TotpCredential" WHERE "secretKeyVersion" <> ${target}`
    : prisma.$queryRaw<SecretRow[]>`
        SELECT "userId", "secretCiphertext", "secretIv", "secretAuthTag", "secretKeyVersion"
        FROM "TotpEnrollment" WHERE "secretKeyVersion" <> ${target}`;

// Only the ciphertext and its version change: `updatedAt` is the credential
// revision checked when a code is consumed, and the seed itself is unchanged.
const writeRow = (
  prisma: PrismaClient,
  table: Table,
  row: SecretRow,
  next: SecretRow,
): Promise<number> =>
  table === 'TotpCredential'
    ? prisma.$executeRaw`
        UPDATE "TotpCredential"
        SET "secretCiphertext" = ${next.secretCiphertext}, "secretIv" = ${next.secretIv},
            "secretAuthTag" = ${next.secretAuthTag}, "secretKeyVersion" = ${next.secretKeyVersion}
        WHERE "userId" = ${row.userId} AND "secretKeyVersion" = ${row.secretKeyVersion}
          AND "secretCiphertext" = ${row.secretCiphertext}`
    : prisma.$executeRaw`
        UPDATE "TotpEnrollment"
        SET "secretCiphertext" = ${next.secretCiphertext}, "secretIv" = ${next.secretIv},
            "secretAuthTag" = ${next.secretAuthTag}, "secretKeyVersion" = ${next.secretKeyVersion}
        WHERE "userId" = ${row.userId} AND "secretKeyVersion" = ${row.secretKeyVersion}
          AND "secretCiphertext" = ${row.secretCiphertext}`;

const prisma = new PrismaClient();

try {
  const { dryRun } = parseArguments(process.argv.slice(2));
  const target = readTargetVersion();
  const targetKey = readMfaKey(process.env, target);
  const pending = new Map<Table, SecretRow[]>();
  for (const table of TABLES)
    pending.set(table, await readRows(prisma, table, target));

  // Every source key must authenticate every row before anything is written.
  const sourceKeys = new Map<number, Buffer>();
  const prepared: Array<{ next: SecretRow; row: SecretRow; table: Table }> = [];
  for (const [table, rows] of pending) {
    for (const row of rows) {
      let sourceKey = sourceKeys.get(row.secretKeyVersion);
      if (!sourceKey) {
        sourceKey = readMfaKey(process.env, row.secretKeyVersion);
        sourceKeys.set(row.secretKeyVersion, sourceKey);
      }
      let secret: string;
      try {
        secret = decryptTotpSecret(row, row.userId, sourceKey);
      } catch {
        throw new Error(
          `Un secret de ${table} ne se déchiffre pas avec la clé V${row.secretKeyVersion}. Aucune modification effectuée.`,
        );
      }
      prepared.push({
        next: {
          ...encryptTotpSecret(secret, row.userId, targetKey),
          secretKeyVersion: target,
          userId: row.userId,
        },
        row,
        table,
      });
    }
  }

  const summary = TABLES.map(
    (table) => `${table} : ${pending.get(table)?.length ?? 0}`,
  ).join(', ');
  if (dryRun) {
    process.stdout.write(
      `Vérification à blanc réussie vers V${target} (${summary}). Aucune sauvegarde ni écriture.\n`,
    );
  } else if (prepared.length === 0) {
    process.stdout.write(`Tous les secrets utilisent déjà V${target}.\n`);
  } else {
    const backup = await createDatabaseBackup(prisma);
    process.stdout.write(`Sauvegarde de sécurité créée : ${backup.filePath}\n`);
    let updated = 0;
    let skipped = 0;
    for (const { next, row, table } of prepared) {
      // A row changed meanwhile (new setup, reset) is left to a new run.
      if ((await writeRow(prisma, table, row, next)) === 1) updated += 1;
      else skipped += 1;
    }
    process.stdout.write(
      `Rechiffrement vers V${target} terminé : ${updated} secret(s) mis à jour, ${skipped} modifié(s) entre-temps (relancer la commande).\n`,
    );
  }
  for (const key of [targetKey, ...sourceKeys.values()]) key.fill(0);
} catch (error) {
  const message = error instanceof Error ? error.message : 'Erreur inconnue';
  process.stderr.write(`Échec du rechiffrement MFA : ${message}\n`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
