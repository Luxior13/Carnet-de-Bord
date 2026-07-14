import { PrismaClient, UserRole, type Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';

const prisma = new PrismaClient();
const GENERATED_PASSWORD_CHARS =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
const CONTACT_EMAIL_PATTERN = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/;
const LOGIN_NAME_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{1,30})[a-z0-9]$/;

function normalizeLoginName(value: string): string {
  const loginName = value.trim().toLowerCase();

  if (!LOGIN_NAME_PATTERN.test(loginName)) {
    throw new Error(
      'SEED_SUPERADMIN_LOGIN_NAME must contain 3 to 32 lowercase ASCII characters, start and end with a letter or digit, and only use letters, digits, dots, underscores or hyphens.',
    );
  }

  return loginName;
}

function normalizeOptionalContactEmail(
  value: string | undefined,
): string | null {
  const contactEmail = value?.trim().toLowerCase();

  if (
    contactEmail &&
    (contactEmail.length > 254 || !CONTACT_EMAIL_PATTERN.test(contactEmail))
  ) {
    throw new Error(
      'SEED_SUPERADMIN_CONTACT_EMAIL must be a valid email address.',
    );
  }

  return contactEmail || null;
}

function generateDevelopmentPassword(length = 18): string {
  const requiredCharacters = 'Aa1!';
  const randomLength = Math.max(length - requiredCharacters.length, 4);
  const bytes = randomBytes(randomLength);

  return requiredCharacters.concat(
    Array.from(
      bytes,
      (byte) =>
        GENERATED_PASSWORD_CHARS[byte % GENERATED_PASSWORD_CHARS.length],
    ).join(''),
  );
}

function validateSeedPassword(password: string): void {
  if (
    password.length < 8 ||
    Buffer.byteLength(password, 'utf8') > 72 ||
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/\d/.test(password)
  ) {
    throw new Error(
      'SEED_SUPERADMIN_PASSWORD must contain 8 or more characters, including uppercase, lowercase and a digit, and must not exceed 72 UTF-8 bytes.',
    );
  }
}

async function ensureLoginNameReservation(
  transaction: Prisma.TransactionClient,
  loginName: string,
  userId: string,
): Promise<void> {
  const reservation = await transaction.loginNameReservation.findUnique({
    where: { loginName },
  });

  if (reservation && reservation.userId !== userId) {
    throw new Error(
      `Login name "${loginName}" is permanently reserved by another user.`,
    );
  }

  if (!reservation) {
    await transaction.loginNameReservation.create({
      data: { loginName, userId },
    });
  }
}

// ============================================
// SEED SUPERADMIN
// ============================================

async function seedSuperadmin() {
  const configuredUserId = process.env.SEED_SUPERADMIN_USER_ID?.trim() || null;
  const configuredLoginName = process.env.SEED_SUPERADMIN_LOGIN_NAME?.trim();

  if (
    (!configuredLoginName || !configuredUserId) &&
    process.env.NODE_ENV === 'production'
  ) {
    throw new Error(
      'SEED_SUPERADMIN_USER_ID and SEED_SUPERADMIN_LOGIN_NAME are required in production environments.',
    );
  }

  const adminLoginName = normalizeLoginName(
    configuredLoginName ?? 'superadmin',
  );
  const configuredContactEmail =
    process.env.SEED_SUPERADMIN_CONTACT_EMAIL ??
    process.env.SEED_SUPERADMIN_EMAIL ??
    process.env.SEED_ADMIN_EMAIL;
  const adminContactEmail = normalizeOptionalContactEmail(
    configuredContactEmail,
  );
  const protectedAccounts = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    take: 2,
    where: { isProtected: true },
  });
  if (protectedAccounts.length > 1) {
    throw new Error(
      'Multiple protected accounts exist. Resolve root ownership before running the seed.',
    );
  }

  const existing = protectedAccounts[0];

  if (existing && configuredUserId && existing.id !== configuredUserId) {
    throw new Error(
      'The protected root account does not match SEED_SUPERADMIN_USER_ID. Refusing to adopt another identity.',
    );
  }

  if (
    existing &&
    (existing.role !== UserRole.ADMIN ||
      !existing.isActive ||
      existing.deletedAt !== null)
  ) {
    throw new Error(
      'The protected root account must be active, undeleted and administrative.',
    );
  }

  if (existing) {
    if (existing.loginName !== adminLoginName) {
      throw new Error(
        'The protected root login name does not match SEED_SUPERADMIN_LOGIN_NAME. The seed never renames an existing root account.',
      );
    }

    const reservation = await prisma.loginNameReservation.findUnique({
      where: { loginName: existing.loginName },
    });

    if (!reservation || reservation.userId !== existing.id) {
      throw new Error(
        'The protected root login name reservation is missing or belongs to another user. Refusing to repair identity data from the seed.',
      );
    }

    console.log('Superadmin deja existant:', existing.loginName);
    return existing;
  }
  const configuredPassword =
    process.env.SEED_SUPERADMIN_PASSWORD ?? process.env.SEED_ADMIN_PASSWORD;
  const generatedPassword = configuredPassword
    ? null
    : generateDevelopmentPassword();
  const adminPassword = configuredPassword ?? generatedPassword;

  if (!configuredPassword) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'SEED_SUPERADMIN_PASSWORD is required in production environments.',
      );
    }

    console.warn(
      'SEED_SUPERADMIN_PASSWORD is not set. Generated a one-time development password.',
    );
  }

  if (!adminPassword) {
    throw new Error('Unable to resolve a superadmin password.');
  }

  validateSeedPassword(adminPassword);

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.$transaction(async (transaction) => {
    const createdAdmin = await transaction.user.create({
      data: {
        contactEmail: adminContactEmail,
        firstName: 'Superadmin',
        ...(configuredUserId ? { id: configuredUserId } : {}),
        lastName: 'System',
        isActive: true,
        isProtected: true,
        loginName: adminLoginName,
        mustChangePassword: true,
        passwordHash,
        role: UserRole.ADMIN,
      },
    });

    await ensureLoginNameReservation(
      transaction,
      adminLoginName,
      createdAdmin.id,
    );

    return createdAdmin;
  });

  console.log('Superadmin cree:', admin.loginName);
  console.log(
    `Mot de passe superadmin: ${configuredPassword ? 'valeur fournie via variable env' : generatedPassword}`,
  );
  return admin;
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('=== Seed database ===\n');

  await seedSuperadmin();

  console.log('\n=== Seed termine ! ===');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
