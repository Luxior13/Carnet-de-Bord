import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

type AuditVisibilityModule = typeof import('../shared/server/audit-visibility');

let auditVisibility: AuditVisibilityModule;

beforeAll(async () => {
  auditVisibility = await import('../shared/server/audit-visibility');
});

describe('audit visibility', () => {
  it('keeps only public location labels for a regular audit viewer', () => {
    expect(
      auditVisibility.sanitizeAuditMetadata(
        {
          after: { firstName: 'Après' },
          pageKey: 'users',
          pageLabel: 'Utilisateurs',
          poleKey: { nested: 'invalid' },
          requestId: 'private-request',
          targetName: 'Private target',
        },
        false,
      ),
    ).toEqual({
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
