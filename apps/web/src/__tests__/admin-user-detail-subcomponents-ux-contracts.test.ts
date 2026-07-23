import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const readSourceFile = (relativePath: string): string => {
  // Test-owned paths only; the helper never receives external input.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
};

const profileSource = readSourceFile(
  '../components/users/user-detail/UserProfileTab.tsx',
);
const accountSource = readSourceFile(
  '../components/users/user-detail/UserAccountTab.tsx',
);
const adminStepUpSource = readSourceFile(
  '../components/users/user-detail/AdminStepUpDialog.tsx',
);
const adminStepUpControllerSource = readSourceFile(
  '../components/users/user-detail/useAdminStepUpController.ts',
);
const securitySource = readSourceFile(
  '../components/users/user-detail/UserSecurityTab.tsx',
);
const deletionCardSource = readSourceFile(
  '../components/users/user-detail/UserDeletionCard.tsx',
);
const permissionsSource = readSourceFile(
  '../components/users/PermissionsEditor.tsx',
);
const roleBoundPermissionStatusSource = readSourceFile(
  '../components/users/RoleBoundPermissionStatus.tsx',
);
const permissionDecisionButtonSource = readSourceFile(
  '../components/users/PermissionDecisionButton.tsx',
);
const permissionStatePickerSource = readSourceFile(
  '../components/users/PermissionStatePicker.tsx',
);
const userAccessSource = readSourceFile(
  '../components/users/user-detail/UserAccessTab.tsx',
);
const userDetailSource = readSourceFile(
  '../components/users/UserDetailPage.tsx',
);

describe('administrative user detail subcomponent UX contracts', () => {
  it('shares the compact fiche scaffold used by the internal directory', () => {
    expect(userDetailSource).toContain(
      '<PageCanvas contentClassName="relative space-y-3">',
    );
    expect(userDetailSource).toMatch(/<UsersAdminHero\s+compact/);
    expect(userDetailSource).toContain(
      'iconClassName="overflow-hidden rounded-full p-0"',
    );
    expect(userDetailSource).toContain('showSpaceBadge={false}');
    expect(profileSource).toContain(
      '<CardHeader className="flex-row items-center justify-between gap-3 p-3.5 sm:p-4">',
    );
  });

  it('opens directly on Profile without keeping a duplicate summary tab', () => {
    expect(userDetailSource).not.toContain('UserResumeTab');
    expect(userDetailSource).not.toContain("case 'resume'");
    expect(userDetailSource).toContain("if (sectionId === 'profile')");
  });

  it('makes contact removal explicit and keeps the self profile compact', () => {
    expect(profileSource).toContain("'save' | 'stage' | null");
    expect(profileSource).toContain('Supprimer l&apos;adresse de contact');
    expect(profileSource).toContain('isSelf = false');
    expect(profileSource).toContain('Profil administratif');
    expect(profileSource).toContain('sm:flex-row sm:items-center');
  });

  it('keeps account autonomy compact, direct and progressively disclosed', () => {
    expect(accountSource).toContain('<details');
    expect(accountSource).toContain('Autonomie du compte');
    expect(accountSource).toContain('Voir les droits essentiels');
    expect(accountSource).toContain('aria-label="Options configurables"');
    expect(accountSource).not.toContain('account-autonomy-options-title');
    expect(accountSource).toContain('Valeur héritée du rôle');
    expect(accountSource).toContain('Exception personnalisée');
    expect(accountSource).toContain('bg-surface-control/60');
    expect(accountSource).not.toContain('configurablePermissionCount');
    expect(accountSource).not.toContain(
      'CONFIGURABLE_ACCOUNT_PERMISSION_CATEGORIES',
    );
    expect(accountSource).toContain(
      'CONFIGURABLE_ACCOUNT_PERMISSION_ITEMS.map',
    );
    expect(accountSource).toContain('<h3 className=');
    expect(accountSource).not.toContain('<h4');
    expect(accountSource).not.toContain('<h5');
    expect(accountSource).toContain('role="region"');
    expect(accountSource).toContain('aria-labelledby="account-autonomy-title"');
    expect(accountSource).not.toContain(
      'aria-label="Autonomie du compte en lecture seule"',
    );
    expect(accountSource).toContain(
      'disabled={!canManagePermissions || isSaving}',
    );
    expect(accountSource).toContain(
      'canManagePermissions && (hasChanges || hasConfigurableOverrides)',
    );
    expect(accountSource).not.toContain('sticky bottom-3');
    expect(
      accountSource.indexOf('CONFIGURABLE_ACCOUNT_PERMISSION_ITEMS.map'),
    ).toBeLessThan(accountSource.indexOf('<details'));
  });

  it('focuses security on modules and confirms individual session revocation', () => {
    expect(securitySource).not.toMatch(/\bSecurityMetric\b/);
    expect(securitySource).toContain('user-security-status-heading');
    expect(securitySource).toContain('user-security-password-heading');
    expect(securitySource).toContain('user-security-mfa-heading');
    expect(securitySource).toContain('user-security-sessions-heading');
    expect(securitySource).toContain('user.failedLoginAttempts > 0 &&');
    expect(securitySource).toContain('Révoquer cette session ?');
    expect(securitySource).toContain('Révoquer la session');
  });

  it('requires a persisted inactive account before exposing definitive deletion', () => {
    expect(securitySource).toContain('canRequestDeleteUser');
    expect(securitySource).toContain('<UserDeletionCard');
    expect(securitySource).toContain("? 'Réactiver le compte'");
    expect(securitySource).toContain(": 'Désactiver le compte'");
    expect(securitySource).toContain(
      'Le membre ne pourra plus se connecter et toutes ses sessions seront fermées.',
    );
    expect(securitySource).toContain(
      'Le membre pourra de nouveau se connecter. Les anciennes sessions resteront fermées.',
    );
    expect(deletionCardSource).toContain(
      'Désactivez d’abord ce compte et enregistrez ce changement. La suppression sera ensuite disponible.',
    );
    expect(deletionCardSource).toContain(
      'Ce compte doit d’abord être désactivé par une personne autorisée. La suppression sera ensuite disponible.',
    );
    expect(deletionCardSource).toContain(
      'Enregistrez ou annulez le changement d’état en cours avant de supprimer ce compte.',
    );
    expect(deletionCardSource).toContain(
      'disabled={userIsActive || hasStatusChanges || isSaving}',
    );
    expect(deletionCardSource).toContain('Supprimer définitivement');
  });

  it('confirms irreversible deletion by login and recent password only', () => {
    const deletionHandler = userDetailSource.slice(
      userDetailSource.indexOf('const handleDelete = async'),
      userDetailSource.indexOf('const renderAuthorizationContent'),
    );

    expect(deletionHandler).toContain('if (user?.isActive !== false)');
    expect(deletionHandler).toContain(
      'Désactivez d’abord ce compte avant de le supprimer',
    );
    expect(deletionHandler).toContain(
      'requestPasswordReauthenticationForResponse(data',
    );
    expect(deletionHandler).not.toContain('requestStepUpForResponse');
    expect(deletionHandler).toContain('Compte supprimé définitivement');
    expect(deletionHandler).toContain(
      'Le compte sera supprimé irréversiblement et son identité sera anonymisée.',
    );
    expect(deletionHandler).toContain('Confirmer la suppression définitive');
    expect(userDetailSource).toContain(
      'deleteConfirmation.trim() !== user.loginName',
    );
    expect(userDetailSource).toContain(
      'Supprimer définitivement cet utilisateur ?',
    );
    expect(
      `${securitySource}\n${deletionCardSource}\n${userDetailSource}`,
    ).not.toMatch(/archiv/iu);
  });

  it('uses progressive disclosure for permission details without hiding dependencies', () => {
    expect(permissionsSource).toContain('Autorisations administratives');
    expect(permissionsSource).toContain('Détails et héritage');
    expect(permissionsSource).toContain('view.missingDependencyLabels');
    expect(permissionsSource).toContain('view.dependencyLabels');
    expect(permissionsSource).toContain('Exception personnalisée');
    expect(permissionsSource).toContain(
      "selectedCategory.assignment === 'role-bound'",
    );
    expect(permissionsSource).toContain(
      'selectedCategoryAccessPermission.grantable',
    );
    expect(roleBoundPermissionStatusSource).toContain(
      'Fourni par le rôle Administrateur',
    );
    expect(roleBoundPermissionStatusSource).toContain(
      'Réservé aux administrateurs',
    );
    expect(userAccessSource).toContain('{PERMISSION_CATEGORIES.length}');
  });

  it('keeps denied permission controls keyboard-explainable', () => {
    expect(permissionStatePickerSource).toContain('aria-describedby');
    expect(permissionStatePickerSource).toContain(
      'tabIndex={decision.allowed ? undefined : 0}',
    );
    expect(permissionDecisionButtonSource).toContain(
      'tabIndex={exposeDisabledReason ? 0 : undefined}',
    );
    expect(permissionDecisionButtonSource).toContain('className="sr-only"');
  });

  it('uses the final atomic decision, fail-closed MFA readiness and an explicit change summary', () => {
    expect(userDetailSource).toContain(
      'accessMutationAnalysis?.decision.allowed === true',
    );
    expect(userDetailSource).toContain(
      'if (!accessMutationAnalysis?.decision.allowed)',
    );
    expect(userAccessSource).toContain('user.criticalAccessReady !== true');
    expect(userAccessSource).not.toContain('user.mfaEnabledAt === null');
    expect(userAccessSource).toContain('Déléguer attribution/retrait');
    expect(userAccessSource).toContain('mutationSummaryLabel');
  });

  it('keeps permission controls editable and defers proof requests to the server response', () => {
    expect(userAccessSource).not.toContain('Mode administration actif');
    expect(userAccessSource).not.toContain('Modifications verrouillées');
    expect(userAccessSource).not.toContain('adminModeRemainingLabel');
    expect(userAccessSource).toContain('disabled={!canManagePermissions}');
    expect(userAccessSource).toContain('disabled={isSaving || !canSave}');
    expect(userAccessSource).not.toContain(
      'un code MFA sera demandé une seule fois',
    );
    expect(adminStepUpControllerSource).toContain(
      'ErrorCode.PASSWORD_REAUTHENTICATION_REQUIRED',
    );
    expect(adminStepUpControllerSource).toContain(
      'ErrorCode.CRITICAL_REAUTHENTICATION_REQUIRED',
    );
    expect(adminStepUpControllerSource).toContain("? 'password'");
    expect(userDetailSource).toContain(
      'onProofKindRequired={adminStepUp.setPendingStepUpProofKind}',
    );
    expect(userDetailSource).toContain(
      'requestPasswordReauthenticationForResponse(data',
    );
    expect(adminStepUpControllerSource).toContain(
      "setPendingStepUpAction({ ...action, proofKind: 'password' })",
    );
    expect(adminStepUpSource).toContain("proofKind === 'password'");
    expect(adminStepUpSource).toContain("proofKind === 'critical-mfa'");
    expect(adminStepUpSource).toContain('trente minutes');
    expect(adminStepUpSource).toContain('quinze minutes');
    expect(adminStepUpSource).toContain('submissionInFlightRef.current');
    expect(adminStepUpSource).toContain(
      'ErrorCode.PASSWORD_REAUTHENTICATION_REQUIRED',
    );
    expect(adminStepUpSource).toContain("onProofKindRequired?.('full')");
    expect(adminStepUpSource).toContain('passwordFailed');
  });
});
