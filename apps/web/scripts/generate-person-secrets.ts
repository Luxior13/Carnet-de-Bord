import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { appendFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const auditEncryptionKey = randomBytes(32).toString('base64');
const initializeLocalEnvironment = process.argv.includes('--write-local-env');

if (initializeLocalEnvironment) {
  const environmentPath = fileURLToPath(new URL('../.env', import.meta.url));
  // The path is fixed relative to this repository-owned script.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const currentEnvironment = readFileSync(environmentPath, 'utf8');
  const managedNames = [
    'AUDIT_ENCRYPTION_CURRENT_VERSION',
    'AUDIT_ENCRYPTION_KEY_V1',
  ] as const;
  const environmentLines = currentEnvironment.split(/\r?\n/u);
  const existingNames = managedNames.filter((name) =>
    environmentLines.some((line) => line.startsWith(`${name}=`)),
  );

  if (existingNames.length > 0) {
    throw new Error(
      `Initialisation refusée : ${existingNames.join(', ')} existe déjà dans apps/web/.env.`,
    );
  }

  const separator = currentEnvironment.endsWith('\n') ? '\n' : '\n\n';
  // The path is fixed relative to this repository-owned script.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  appendFileSync(
    environmentPath,
    [
      separator,
      '# Historique chiffré des fiches du répertoire (secret local hors Git).',
      'AUDIT_ENCRYPTION_CURRENT_VERSION=1',
      `AUDIT_ENCRYPTION_KEY_V1=${auditEncryptionKey}`,
      '',
    ].join('\n'),
    { encoding: 'utf8' },
  );
  process.stdout.write(
    'Secrets du répertoire initialisés dans apps/web/.env sans être affichés.\n',
  );
  process.exit(0);
}

const backupSigningKeys = generateKeyPairSync('ed25519', {
  privateKeyEncoding: { format: 'pem', type: 'pkcs8' },
  publicKeyEncoding: { format: 'pem', type: 'spki' },
});

const encodePemForEnvironment = (value: string): string =>
  value.trimEnd().replaceAll('\n', '\\n');

const lines = [
  '# À copier directement dans le gestionnaire de secrets, jamais dans Git.',
  'AUDIT_ENCRYPTION_CURRENT_VERSION=1',
  `AUDIT_ENCRYPTION_KEY_V1=${auditEncryptionKey}`,
  '# Paire distincte : privée au backup ; publique au backup et au restore.',
  'DATABASE_BACKUP_SIGNING_CURRENT_VERSION=1',
  `DATABASE_BACKUP_SIGNING_PRIVATE_KEY_V1=${encodePemForEnvironment(backupSigningKeys.privateKey)}`,
  `DATABASE_BACKUP_SIGNING_PUBLIC_KEY_V1=${encodePemForEnvironment(backupSigningKeys.publicKey)}`,
];

process.stdout.write(`${lines.join('\n')}\n`);
