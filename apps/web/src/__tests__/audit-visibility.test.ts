import { beforeAll, describe, expect, it, vi } from 'vitest';

import {
  PERMISSIONS,
  ROADMAP_PERMISSIONS,
} from '$constants/permissions.constants';

vi.mock('server-only', () => ({}));

type AuditVisibilityModule = typeof import('../shared/server/audit-visibility');

let auditVisibility: AuditVisibilityModule;

beforeAll(async () => {
  auditVisibility = await import('../shared/server/audit-visibility');
});

describe('audit visibility', () => {
  it('keeps safe profile diffs and location labels for a regular viewer', () => {
    expect(
      auditVisibility.sanitizeAuditMetadata(
        {
          after: {
            contactEmail: 'private@example.com',
            firstName: 'Après',
            isActive: true,
            lastName: 'Public',
            loginName: 'private.login',
            passwordHash: 'never-visible',
            permissions: { [PERMISSIONS.AUDIT.VIEW]: true },
            role: 'ADMIN',
          },
          before: {
            contactEmail: 'old-private@example.com',
            firstName: 'Avant',
            isActive: false,
            lastName: 'Ancien',
            loginName: 'old.private.login',
            passwordHash: 'old-never-visible',
            permissions: { [PERMISSIONS.AUDIT.VIEW]: false },
            role: 'USER',
          },
          changes: [
            'contactEmail',
            'firstName',
            'isActive',
            'lastName',
            'loginName',
            'permissions',
            'role',
          ],
          effectivelyGrantedPermissionKeys: [PERMISSIONS.USERS.VIEW],
          effectivelyRevokedPermissionKeys: [PERMISSIONS.USERS.GRANT_ACCESS],
          pageKey: 'users',
          pageLabel: 'Utilisateurs',
          poleKey: { nested: 'invalid' },
          requestId: 'private-request',
          targetName: 'Private target',
        },
        false,
      ),
    ).toEqual({
      after: { firstName: 'Après', isActive: true, lastName: 'Public' },
      before: { firstName: 'Avant', isActive: false, lastName: 'Ancien' },
      changes: ['firstName', 'isActive', 'lastName'],
      pageKey: 'users',
      pageLabel: 'Utilisateurs',
    });
  });

  it('keeps strictly sanitized effective permission deltas for sensitive viewers only', () => {
    const metadata = {
      effectivelyGrantedPermissionKeys: [
        PERMISSIONS.USERS.VIEW,
        ROADMAP_PERMISSIONS.TASKS.VIEW,
        'unknown:permission',
        PERMISSIONS.USERS.VIEW,
        42,
      ],
      effectivelyRevokedPermissionKeys: [
        'system:audit',
        'users:manage_roles',
        'unknown:permission',
        null,
      ],
    };

    expect(auditVisibility.sanitizeAuditMetadata(metadata, false)).toBeNull();
    expect(auditVisibility.sanitizeAuditMetadata(metadata, true)).toEqual({
      effectivelyGrantedPermissionKeys: [
        PERMISSIONS.USERS.VIEW,
        ROADMAP_PERMISSIONS.TASKS.VIEW,
      ],
      effectivelyRevokedPermissionKeys: ['system:audit', 'users:manage_roles'],
    });
  });

  it('keeps allowlisted security flags without leaking nested secrets', () => {
    expect(
      auditVisibility.sanitizeAuditMetadata(
        {
          after: {
            apiKey: 'secret-api-key',
            firstName: 'Jeanne',
            passwordHash: 'secret-hash',
            permissions: {
              [PERMISSIONS.AUDIT.VIEW]: true,
              'unknown:permission': true,
            },
            privateKey: 'secret-private-key',
          },
          before: {
            accessToken: 'secret-token',
            firstName: 'Jean',
            seed: 'secret-seed',
          },
          passwordChange: true,
          passwordReset: true,
          recoveryCodesGenerated: 8,
        },
        true,
      ),
    ).toEqual({
      after: {
        firstName: 'Jeanne',
        permissions: { [PERMISSIONS.AUDIT.VIEW]: true },
      },
      before: { firstName: 'Jean' },
      passwordChange: true,
      passwordReset: true,
      recoveryCodesGenerated: 8,
    });
  });

  it('preserves safe historical permission keys without exposing unknown keys', () => {
    expect(
      auditVisibility.sanitizeAuditMetadata(
        {
          after: {
            permissions: {
              [ROADMAP_PERMISSIONS.TASKS.VIEW]: false,
              'system:audit': true,
              'unknown:permission': true,
              'users:archive': true,
              'users:delete': false,
              'users:manage_roles': false,
            },
          },
        },
        true,
      ),
    ).toEqual({
      after: {
        permissions: {
          [ROADMAP_PERMISSIONS.TASKS.VIEW]: false,
          'system:audit': true,
          'users:archive': true,
          'users:delete': false,
          'users:manage_roles': false,
        },
      },
    });
  });

  it('keeps reviewed platform metadata only for sensitive audit readers', () => {
    const metadata = {
      after: { value: { apiKey: 'never-visible', mode: 'strict' }, version: 3 },
      attempts: 5,
      before: { value: { mode: 'balanced' }, version: 2 },
      changes: ['value', 'version'],
      jobId: 'job-1',
      maxAttempts: 5,
      notificationId: 'notification-1',
      phase: 'terminal_failure',
      reason: 'lease_expired',
      recipientCount: 12,
      settingKey: 'notifications.retentionDays',
      status: 'FAILED',
      type: 'platform.cleanup',
    };

    expect(auditVisibility.sanitizeAuditMetadata(metadata, false)).toBeNull();
    expect(auditVisibility.sanitizeAuditMetadata(metadata, true)).toEqual({
      after: { value: { mode: 'strict' }, version: 3 },
      attempts: 5,
      before: { value: { mode: 'balanced' }, version: 2 },
      changes: ['value', 'version'],
      jobId: 'job-1',
      maxAttempts: 5,
      notificationId: 'notification-1',
      phase: 'terminal_failure',
      reason: 'lease_expired',
      recipientCount: 12,
      settingKey: 'notifications.retentionDays',
      status: 'FAILED',
      type: 'platform.cleanup',
    });
  });

  it('redacts descriptions unless sensitive audit access is effective', () => {
    expect(
      auditVisibility.getVisibleAuditDescription({
        action: 'USER_UPDATE',
        canViewSensitiveDetails: false,
        category: 'USER',
        description: 'Adresse privée modifiée pour personne@example.com',
      }),
    ).toBe('Compte utilisateur modifié');
    expect(
      auditVisibility.getVisibleAuditDescription({
        action: 'USER_UPDATE',
        canViewSensitiveDetails: true,
        category: 'USER',
        description: 'Adresse privée modifiée pour personne@example.com',
      }),
    ).toBe('Adresse privée modifiée pour personne@example.com');
  });

  it('distinguishes historical archives from irreversible deletions', () => {
    expect(
      auditVisibility.getVisibleAuditDescription({
        action: 'USER_DELETE',
        canViewSensitiveDetails: false,
        category: 'USER',
        description: 'Ancien événement ambigu',
      }),
    ).toBe('Compte utilisateur archivé (historique)');
    expect(
      auditVisibility.getVisibleAuditDescription({
        action: 'USER_DELETE',
        canViewSensitiveDetails: false,
        category: 'USER',
        description: 'Utilisateur supprimé définitivement',
        metadata: { deletionVersion: 1, irreversible: true },
      }),
    ).toBe('Compte utilisateur supprimé');
    expect(
      auditVisibility.sanitizeAuditMetadata(
        { deletionVersion: 1, irreversible: true },
        false,
      ),
    ).toEqual({ deletionVersion: 1, irreversible: true });
  });
});
