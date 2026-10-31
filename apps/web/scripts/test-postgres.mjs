// Runs every `*-postgres.test.ts` suite against disposable local databases.
//
// POSTGRES_TEST_ADMIN_URL names a local role allowed to create databases, for
// example postgresql://postgres:…@127.0.0.1:5432/postgres. Each run drops and
// recreates the fixed `*_test` databases below, applies the migrations to the
// suites that need them, then runs the suites one file at a time. The
// application DATABASE_URL is never used: children receive an explicit one.
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PrismaClient } from '@prisma/client';

const LOCAL_HOSTS = new Set(['127.0.0.1', '::1', '[::1]', 'localhost']);

// Each suite refuses any other host or database name. `migrate: false` suites
// create and drop their own schema inside the database.
const SUITE_DATABASES = [
  { database: 'account_service_test', variable: 'ACCOUNT_TEST_DATABASE_URL' },
  {
    database: 'audit_journal_service_test',
    variable: 'AUDIT_JOURNAL_TEST_DATABASE_URL',
  },
  { database: 'creation_service_test', variable: 'USER_CREATION_TEST_DATABASE_URL' },
  { database: 'login_service_test', variable: 'LOGIN_TEST_DATABASE_URL' },
  {
    database: 'person_creation_service_test',
    variable: 'PERSON_CREATION_TEST_DATABASE_URL',
  },
  {
    database: 'person_detail_service_test',
    variable: 'PERSON_DETAIL_TEST_DATABASE_URL',
  },
  {
    database: 'repertoire_pagination_test',
    migrate: false,
    variable: 'PERSONS_LIST_TEST_DATABASE_URL',
  },
  { database: 'settings_service_test', variable: 'SETTINGS_TEST_DATABASE_URL' },
  { database: 'user_detail_service_test', variable: 'USER_DETAIL_TEST_DATABASE_URL' },
  { database: 'users_list_test', migrate: false, variable: 'USERS_LIST_TEST_DATABASE_URL' },
];
// Any accidental use of the default client fails here instead of reaching a
// real database.
const UNUSED_DATABASE = 'unused_by_postgres_suites_test';

const fail = (message) => {
  process.stderr.write(`test:postgres — ${message}\n`);
  process.exit(1);
};

const adminValue = process.env.POSTGRES_TEST_ADMIN_URL;
if (!adminValue) {
  fail(
    'POSTGRES_TEST_ADMIN_URL est requis (rôle local autorisé à créer des bases).',
  );
}
let adminUrl;
try {
  adminUrl = new URL(adminValue);
} catch {
  fail('POSTGRES_TEST_ADMIN_URL n’est pas une URL PostgreSQL valide.');
}
if (!['postgres:', 'postgresql:'].includes(adminUrl.protocol)) {
  fail('POSTGRES_TEST_ADMIN_URL doit utiliser le protocole postgres.');
}
if (!LOCAL_HOSTS.has(adminUrl.hostname)) {
  fail('refus : seul un PostgreSQL local (127.0.0.1, localhost) est accepté.');
}
const expectedHost = `${adminUrl.hostname}:${adminUrl.port || '5432'}`;

const urlFor = (database) => {
  const url = new URL(adminUrl);
  url.pathname = `/${database}`;
  url.search = '';

  return url.toString();
};

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const webDirectory = resolve(scriptDirectory, '..');
const schemaPath = resolve(
  webDirectory,
  '../../packages/database/prisma/schema.prisma',
);

const runPrisma = (args, databaseUrl) =>
  spawnSync(process.execPath, ['x', 'prisma', ...args, '--schema', schemaPath], {
    encoding: 'utf8',
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });

const admin = new PrismaClient({ datasourceUrl: adminUrl.toString() });
try {
  for (const { database } of SUITE_DATABASES) {
    if (!/^[a-z_]+_test$/.test(database)) fail(`nom de base refusé : ${database}`);
    // Identifiers come from the fixed list above, never from input.
    await admin.$executeRawUnsafe(
      `DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`,
    );
    await admin.$executeRawUnsafe(`CREATE DATABASE "${database}"`);
  }
} finally {
  await admin.$disconnect();
}

for (const { database, migrate = true } of SUITE_DATABASES) {
  if (!migrate) continue;
  const databaseUrl = urlFor(database);
  // Read-only check first: Prisma must report this exact local database
  // before anything is written. A fresh database reports pending migrations,
  // so the exit status of `status` is not meaningful here.
  const status = runPrisma(['migrate', 'status'], databaseUrl);
  const target = `${status.stdout}${status.stderr}`.match(
    /PostgreSQL database "([^"]+)", schema "[^"]+" at "([^"]+)"/,
  );
  if (!target || target[1] !== database || target[2] !== expectedHost) {
    fail(
      `refus : Prisma ne vise pas ${database} sur ${expectedHost} (${target?.[1] ?? 'inconnu'} sur ${target?.[2] ?? 'inconnu'}).`,
    );
  }
  const deploy = runPrisma(['migrate', 'deploy'], databaseUrl);
  if (deploy.status !== 0) {
    process.stderr.write(`${deploy.stdout}${deploy.stderr}`);
    fail(`échec des migrations sur ${database}.`);
  }
  process.stdout.write(`Migrations appliquées : ${database}\n`);
}

const suiteEnvironment = Object.fromEntries(
  SUITE_DATABASES.map(({ database, variable }) => [variable, urlFor(database)]),
);
const run = spawnSync(
  process.execPath,
  ['x', 'vitest', 'run', 'postgres.test.ts', '--no-file-parallelism'],
  {
    cwd: webDirectory,
    env: {
      ...process.env,
      ...suiteEnvironment,
      DATABASE_URL: urlFor(UNUSED_DATABASE),
    },
    stdio: 'inherit',
  },
);
process.exit(run.status ?? 1);
