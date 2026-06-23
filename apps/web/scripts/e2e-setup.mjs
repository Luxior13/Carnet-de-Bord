import { readFileSync } from 'fs';
import { resolve } from 'path';

import bcrypt from 'bcryptjs';
import { PrismaClient, UserRole } from '@prisma/client';

function loadEnvValue(filePath, key) {
  const content = readFileSync(filePath, 'utf8');
  const line = content
    .split(/\r?\n/)
    .find((entry) => entry.startsWith(`${key}=`));

  if (!line) return null;

  const [, rawValue = ''] = line.split('=', 2);
  const value = rawValue.trim();

  return value.startsWith('"') && value.endsWith('"')
    ? value.slice(1, -1)
    : value;
}

const envPath = resolve(process.cwd(), '.env');
const databaseUrl =
  process.env.DATABASE_URL ?? loadEnvValue(envPath, 'DATABASE_URL');
const adminEmail =
  process.env.E2E_SUPERADMIN_EMAIL ??
  loadEnvValue(envPath, 'SEED_SUPERADMIN_EMAIL') ??
  'superadmin@carnet.local';
const adminPassword =
  process.env.E2E_SUPERADMIN_PASSWORD ??
  loadEnvValue(envPath, 'SEED_SUPERADMIN_PASSWORD') ??
  'Playwright123!';

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required for e2e setup');
}

process.env.DATABASE_URL = databaseUrl;

const prisma = new PrismaClient();

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
