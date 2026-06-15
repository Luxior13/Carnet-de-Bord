import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

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
  const fallbackPassword = 'CarnetPro123!';
  const configuredPassword =
    process.env.SEED_SUPERADMIN_PASSWORD ?? process.env.SEED_ADMIN_PASSWORD;
  const adminPassword = configuredPassword ?? fallbackPassword;

  if (!configuredPassword) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'SEED_SUPERADMIN_PASSWORD is required in production environments.',
      );
    }

    console.warn(
      'SEED_SUPERADMIN_PASSWORD is not set. Using development fallback password.',
    );
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
    `Mot de passe superadmin: ${configuredPassword ? 'valeur fournie via variable env' : fallbackPassword}`,
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
