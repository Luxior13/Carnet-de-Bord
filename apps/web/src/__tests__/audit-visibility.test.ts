import { beforeAll, describe, expect, it, vi } from 'vitest';

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
            permissions: { 'system:audit': true },
            role: 'ADMIN',
          },
          before: {
            contactEmail: 'old-private@example.com',
            firstName: 'Avant',
            isActive: false,
            lastName: 'Ancien',
            loginName: 'old.private.login',
            passwordHash: 'old-never-visible',
            permissions: { 'system:audit': false },
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

  it('keeps allowlisted security flags without leaking nested secrets', () => {
    expect(
      auditVisibility.sanitizeAuditMetadata(
        {
          after: {
            apiKey: 'secret-api-key',
            firstName: 'Jeanne',
            passwordHash: 'secret-hash',
            permissions: {
              'system:audit': true,
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
        permissions: { 'system:audit': true },
      },
      before: { firstName: 'Jean' },
      passwordChange: true,
      passwordReset: true,
      recoveryCodesGenerated: 8,
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
});
