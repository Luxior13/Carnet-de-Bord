import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import bcrypt from 'bcryptjs';
import { PrismaClient, UserRole } from '@prisma/client';

const TEST_DATABASE_MARKER = /(?:^|[_-])(?:e2e|test)(?:[_-]|$)/i;

function parseDatabaseTarget(rawValue, variableName) {
  let url;

  try {
    url = new URL(rawValue);
  } catch {
    throw new Error(`${variableName} must be a valid PostgreSQL URL.`);
  }

  if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
    throw new Error(`${variableName} must use the postgres protocol.`);
  }

  let databaseName;

  try {
    databaseName = decodeURIComponent(url.pathname.replace(/^\//, ''));
  } catch {
    throw new Error(`${variableName} contains an invalid database name.`);
  }

  if (!databaseName) {
    throw new Error(`${variableName} must include a database name.`);
  }

  const schema = url.searchParams.get('schema') ?? 'public';
  const hostname = ['127.0.0.1', '::1', 'localhost'].includes(url.hostname)
    ? 'localhost'
    : url.hostname.toLowerCase();
  const port = url.port || '5432';

  return {
    databaseName,
    identity: `${hostname}:${port}/${databaseName}?schema=${schema}`,
    schema,
  };
}

const databaseUrl = process.env.E2E_DATABASE_URL;
const adminEmail = process.env.E2E_SUPERADMIN_EMAIL?.trim().toLowerCase();
const adminPassword = process.env.E2E_SUPERADMIN_PASSWORD;

if (!databaseUrl) {
  throw new Error(
    'E2E_DATABASE_URL is required. DATABASE_URL is never used as an E2E fallback.',
  );
}

if (!adminEmail || !adminEmail.includes('@')) {
  throw new Error('E2E_SUPERADMIN_EMAIL must be a valid test account email.');
}

if (!adminPassword || adminPassword.length < 12) {
  throw new Error(
    'E2E_SUPERADMIN_PASSWORD must contain at least 12 characters.',
  );
}

const e2eTarget = parseDatabaseTarget(databaseUrl, 'E2E_DATABASE_URL');

if (
  !TEST_DATABASE_MARKER.test(e2eTarget.databaseName) &&
  !TEST_DATABASE_MARKER.test(e2eTarget.schema)
) {
  throw new Error(
    'Refusing E2E setup: the database or schema name must contain an isolated "e2e" or "test" marker.',
  );
}

if (process.env.DATABASE_URL) {
  const applicationTarget = parseDatabaseTarget(
    process.env.DATABASE_URL,
    'DATABASE_URL',
  );

  if (applicationTarget.identity === e2eTarget.identity) {
    throw new Error(
      'Refusing E2E setup: E2E_DATABASE_URL targets the application database.',
    );
  }
}

process.env.DATABASE_URL = databaseUrl;

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const schemaPath = resolve(
  scriptDirectory,
  '../../../packages/database/prisma/schema.prisma',
);
const migration = spawnSync(
  process.execPath,
  ['x', 'prisma', 'migrate', 'deploy', '--schema', schemaPath],
  {
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
    stdio: 'inherit',
  },
);

if (migration.error) {
  throw migration.error;
}

if (migration.status !== 0) {
  throw new Error(
    `E2E database migration failed with exit code ${migration.status ?? 'unknown'}.`,
  );
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
});

try {
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const result = await prisma.user.upsert({
    create: {
      email: adminEmail,
      firstName: 'E2E',
      failedLoginAttempts: 0,
      isActive: true,
      isProtected: true,
      lastName: 'Admin',
      lockedUntil: null,
      mustChangePassword: false,
      passwordHash,
      role: UserRole.ADMIN,
      passwordChangedAt: null,
    },
    update: {
      failedLoginAttempts: 0,
      isActive: true,
      isProtected: true,
      lockedUntil: null,
      mustChangePassword: false,
      passwordHash,
      passwordChangedAt: null,
      role: UserRole.ADMIN,
    },
    where: {
      email: adminEmail,
    },
  });

  console.log(`E2E setup: admin account ready (${result.email})`);
} finally {
  await prisma.$disconnect();
}
