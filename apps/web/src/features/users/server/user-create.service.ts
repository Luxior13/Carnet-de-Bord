import 'server-only';

import type { User, UserRole } from '@repo/database';

import {
  type AuditLogInput,
  createAuditLog,
  getAuditRequestContext,
  hashPassword,
} from '$server/auth';
import { prisma } from '$server/prisma';

/** Creates an account, its permanent login reservation and required audit atomically. */
export const createUser = async (
  data: {
    contactEmail?: string | null;
    firstName: string;
    lastName: string;
    loginName: string;
    password: string;
    role: UserRole;
  },
  auditFactory: (user: User) => Omit<AuditLogInput, 'ipAddress' | 'userAgent'>,
): Promise<User> => {
  const passwordHash = await hashPassword(data.password);
  const requestContext = await getAuditRequestContext();
  const normalizedLoginName = data.loginName.toLowerCase().trim();

  return prisma.$transaction(async (transaction) => {
    const user = await transaction.user.create({
      data: {
        contactEmail: data.contactEmail?.toLowerCase().trim() || null,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        loginName: normalizedLoginName,
        mustChangePassword: true,
        passwordHash,
        role: data.role,
      },
    });

    // A reservation owned by an older identity aborts this entire transaction.
    await transaction.loginNameReservation.create({
      data: { loginName: normalizedLoginName, userId: user.id },
    });
    await createAuditLog(
      { ...auditFactory(user), ...requestContext },
      transaction,
    );

    return user;
  });
};
