import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import bcrypt from 'bcryptjs';
import { PrismaClient, UserRole } from '@prisma/client';

const TEST_DATABASE_MARKER = /(?:^|[_-])(?:e2e|test)(?:[_-]|$)/i;
const CONTACT_EMAIL_PATTERN = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/;
const LOGIN_NAME_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{1,30})[a-z0-9]$/;
const E2E_ROOT_USER_ID = 'e2e-only-superadmin';

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

async function ensureLoginNameReservation(transaction, loginName, userId) {
  const reservation = await transaction.loginNameReservation.findUnique({
    where: { loginName },
  });

  if (reservation && reservation.userId !== userId) {
    throw new Error(
      `E2E login name "${loginName}" is permanently reserved by another user.`,
    );
  }

  if (!reservation) {
    await transaction.loginNameReservation.create({
      data: { loginName, userId },
    });
  }
}

const databaseUrl = process.env.E2E_DATABASE_URL;
const adminLoginName =
  process.env.E2E_SUPERADMIN_LOGIN_NAME?.trim().toLowerCase();
const adminContactEmail =
  process.env.E2E_SUPERADMIN_CONTACT_EMAIL?.trim().toLowerCase() || null;
const adminPassword = process.env.E2E_SUPERADMIN_PASSWORD;

if (!databaseUrl) {
  throw new Error(
    'E2E_DATABASE_URL is required. DATABASE_URL is never used as an E2E fallback.',
  );
}

if (
  !adminLoginName ||
  !LOGIN_NAME_PATTERN.test(adminLoginName) ||
  !adminLoginName.startsWith('e2e-')
) {
  throw new Error(
    'E2E_SUPERADMIN_LOGIN_NAME must be a valid lowercase login name prefixed with "e2e-".',
  );
}

if (
  adminContactEmail &&
  (adminContactEmail.length > 254 ||
    !CONTACT_EMAIL_PATTERN.test(adminContactEmail))
) {
  throw new Error(
    'E2E_SUPERADMIN_CONTACT_EMAIL must be a valid email address when set.',
  );
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
  const protectedAccounts = await prisma.user.findMany({
    select: { id: true, loginName: true },
    where: { isProtected: true },
  });
  if (
    protectedAccounts.length > 1 ||
    protectedAccounts.some((account) => account.id !== E2E_ROOT_USER_ID)
  ) {
    throw new Error(
      'E2E database contains a protected identity not owned by this isolated test harness. Refusing to modify it.',
    );
  }

  const existingAdmin = await prisma.user.findUnique({
    where: { id: E2E_ROOT_USER_ID },
  });

  if (
    existingAdmin &&
    (!existingAdmin.isProtected ||
      existingAdmin.role !== UserRole.ADMIN ||
      !existingAdmin.isActive ||
      existingAdmin.deletedAt !== null)
  ) {
    throw new Error(
      'The E2E protected account must be active, undeleted and administrative.',
    );
  }

  if (existingAdmin && existingAdmin.loginName !== adminLoginName) {
    throw new Error(
      'E2E database already belongs to a different protected identity. Recreate the isolated test database.',
    );
  }
  const accountData = {
    contactEmail: adminContactEmail,
    contactEmailVerifiedAt: null,
    failedLoginAttempts: 0,
    isActive: true,
    isProtected: true,
    lockedUntil: null,
    loginName: adminLoginName,
    mustChangePassword: false,
    passwordChangedAt: null,
    passwordHash,
    role: UserRole.ADMIN,
  };

  const result = await prisma.$transaction(async (transaction) => {
    if (existingAdmin) {
      // Reserve the requested name before a possible rename. Returning to a
      // former name owned by this same identity remains valid.
      await ensureLoginNameReservation(
        transaction,
        adminLoginName,
        existingAdmin.id,
      );

      const updatedAdmin = await transaction.user.update({
        data: {
          ...accountData,
          securityVersion: { increment: 1 },
        },
        where: { id: existingAdmin.id },
      });

      // The setup resets credentials, so no session from an earlier E2E run
      // may survive even when the login name itself did not change.
      await transaction.session.deleteMany({
        where: { userId: existingAdmin.id },
      });

      return updatedAdmin;
    }

    const createdAdmin = await transaction.user.create({
      data: {
        ...accountData,
        firstName: 'E2E',
        id: E2E_ROOT_USER_ID,
        lastName: 'Admin',
      },
    });

    await ensureLoginNameReservation(
      transaction,
      adminLoginName,
      createdAdmin.id,
    );

    return createdAdmin;
  });

  console.log(`E2E setup: admin account ready (${result.loginName})`);
} finally {
  await prisma.$disconnect();
}
