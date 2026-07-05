import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';

const prisma = new PrismaClient();
const GENERATED_PASSWORD_CHARS =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';

function generateDevelopmentPassword(length = 18): string {
  const bytes = randomBytes(length);

  return Array.from(
    bytes,
    (byte) => GENERATED_PASSWORD_CHARS[byte % GENERATED_PASSWORD_CHARS.length],
  ).join('');
}

// ============================================
// SEED SUPERADMIN
// ============================================

async function seedSuperadmin() {
  const existing = await prisma.user.findFirst({
    where: { isProtected: true, role: UserRole.ADMIN },
  });

  if (existing) {
    console.log('Superadmin deja existant:', existing.email);
    return existing;
  }

  const adminEmail =
    process.env.SEED_SUPERADMIN_EMAIL ??
    process.env.SEED_ADMIN_EMAIL ??
    'superadmin@carnet.local';
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

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      firstName: 'Superadmin',
      lastName: 'System',
      isActive: true,
      isProtected: true,
      mustChangePassword: true,
      passwordHash,
      role: UserRole.ADMIN,
    },
  });

  console.log('Superadmin cree:', admin.email);
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
