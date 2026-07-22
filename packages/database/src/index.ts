import 'server-only';

// Export only what's needed to avoid Turbopack warnings with CommonJS modules
import { PrismaClient as PrismaClientBase } from '@prisma/client';

export { PrismaClient } from '@prisma/client';

// Singleton instance with proper typing
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientBase | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClientBase();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Export the type of the prisma client for use in other packages
export type PrismaClientType = typeof prisma;

// Types
export type {
  AuditEncryptionKeyVersion,
  AuditFieldChange,
  AuditLog,
  MfaLoginChallenge,
  MfaRecoveryCode,
  Notification,
  NotificationRecipient,
  Person,
  PersonDeletionTombstone,
  PersonEmail,
  PersonPhone,
  PersonSocialProfile,
  RateLimit,
  Session,
  SystemSetting,
  TotpCredential,
  TotpEnrollment,
  User,
} from '@prisma/client';

// Enums
export {
  AuditAction,
  AuditCategory,
  AuditEventKind,
  AuditFieldChangeType,
  AuditOutcome,
  AuditSeverity,
  AuditStream,
  AuditValueStorageMode,
  MfaAuthenticationMethod,
  MfaChallengePurpose,
  NotificationSeverity,
  PersonStructureStatus,
  UserRole,
} from '@prisma/client';
