import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const readSourceFile = (relativePath: string): string => {
  // Test-owned paths only; the helper never receives external input.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
};

const loginSource = readSourceFile('../app/login/page.tsx');
const userContextSource = readSourceFile('../shared/context/UserContext.tsx');
const passwordLoginContextSource = userContextSource.slice(
  userContextSource.indexOf('const login = useCallback'),
  userContextSource.indexOf('const verifyMfa = useCallback'),
);
const authTypesSource = readSourceFile('../shared/types/auth.types.ts');
const authenticatedLayoutSource = readSourceFile(
  '../components/AuthenticatedLayout.tsx',
);
const securitySource = readSourceFile(
  '../features/account/components/SecuritySection.tsx',
);
const mfaActionSource = readSourceFile(
  '../features/auth/components/MfaActionDialog.tsx',
);
const managedUserSecuritySource = readSourceFile(
  '../components/users/user-detail/UserSecurityTab.tsx',
);

describe('global MFA UX contracts', () => {
  it('makes the password endpoint contractually return an MFA challenge only', () => {
    expect(authTypesSource).toContain(
      'export type LoginResponseData = PendingMfaLoginData;',
    );
    expect(authTypesSource).toContain(
      'export type LoginResult = PendingMfaLoginData;',
    );
    expect(passwordLoginContextSource).not.toContain(
      "data.data.status === 'authenticated'",
    );
    expect(loginSource).not.toContain("result.status === 'authenticated'");
  });

  it('explains trusted-device limits and the protected superadmin exception', () => {
    expect(loginSource).toContain('Faire confiance à cet appareil');
    expect(loginSource).toContain('Session de 30 jours maximum');
    expect(loginSource).toContain('7 jours d’inactivité');
    expect(loginSource).toContain(
      'option est désactivée pour le compte superadmin',
    );
    expect(loginSource).toContain('gérée par le propriétaire superadmin');
  });

  it('forces enrollment for every account and exposes no disable action', () => {
    expect(authenticatedLayoutSource).toContain(
      'userData.mfaEnabledAt === null',
    );
    expect(securitySource).toContain(
      'Cette protection est obligatoire pour tous les comptes',
    );
    expect(mfaActionSource).not.toContain("'disable'");
    expect(mfaActionSource).not.toContain("method: 'DELETE'");
    expect(mfaActionSource).not.toContain('RoutesApi.mfa,');
  });

  it('identifies the only administrative recovery authority precisely', () => {
    expect(managedUserSecuritySource).toContain('Récupération superadmin');
    expect(managedUserSecuritySource).not.toContain(
      'Récupération administrateur',
    );
  });
});
