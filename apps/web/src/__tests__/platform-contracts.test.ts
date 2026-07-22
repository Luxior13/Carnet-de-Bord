import {
  AuditAction as PrismaAuditAction,
  AuditCategory as PrismaAuditCategory,
  AuditEventKind as PrismaAuditEventKind,
  AuditOutcome as PrismaAuditOutcome,
  AuditSeverity as PrismaAuditSeverity,
  AuditStream as PrismaAuditStream,
  NotificationSeverity as PrismaNotificationSeverity,
  UserRole as PrismaUserRole,
} from '@prisma/client';
import {
  AuditAction,
  AuditCategory,
  AuditEventKind,
  AuditOutcome,
  AuditSeverity,
  AuditStream,
  NotificationSeverity,
  UserRole,
} from '@repo/shared';
import { describe, expect, it } from 'vitest';

describe('browser-safe platform contracts', () => {
  it('stays synchronized with the generated Prisma enums', () => {
    expect(AuditAction).toEqual(PrismaAuditAction);
    expect(AuditCategory).toEqual(PrismaAuditCategory);
    expect(AuditEventKind).toEqual(PrismaAuditEventKind);
    expect(AuditOutcome).toEqual(PrismaAuditOutcome);
    expect(AuditSeverity).toEqual(PrismaAuditSeverity);
    expect(AuditStream).toEqual(PrismaAuditStream);
    expect(NotificationSeverity).toEqual(PrismaNotificationSeverity);
    expect(UserRole).toEqual(PrismaUserRole);
  });
});
