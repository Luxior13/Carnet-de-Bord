import {
  AuditAction as PrismaAuditAction,
  AuditCategory as PrismaAuditCategory,
  BackgroundJobStatus as PrismaBackgroundJobStatus,
  NotificationSeverity as PrismaNotificationSeverity,
  UserRole as PrismaUserRole,
} from '@prisma/client';
import {
  AuditAction,
  AuditCategory,
  BackgroundJobStatus,
  NotificationSeverity,
  UserRole,
} from '@repo/shared';
import { describe, expect, it } from 'vitest';

describe('browser-safe platform contracts', () => {
  it('stays synchronized with the generated Prisma enums', () => {
    expect(AuditAction).toEqual(PrismaAuditAction);
    expect(AuditCategory).toEqual(PrismaAuditCategory);
    expect(BackgroundJobStatus).toEqual(PrismaBackgroundJobStatus);
    expect(NotificationSeverity).toEqual(PrismaNotificationSeverity);
    expect(UserRole).toEqual(PrismaUserRole);
  });
});
