'use client';

import { UserRole } from '@repo/shared';
import { AtSign, Mail, UserPlus } from 'lucide-react';
import React, { type FC, useState } from 'react';

import { PageIdentityHero } from '$components/layout/PageIdentityHero';
import { AccessDeniedState } from '$components/layout/PageState';
import { SectionActionBar } from '$components/layout/SectionActionBar';
import { UnsavedNavigationDialog } from '$components/layout/UnsavedNavigationDialog';
import { AdminStepUpDialog } from '$components/users/user-detail/AdminStepUpDialog';
import { UserAvatar } from '$components/users/UserAvatar';
import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import { FormSectionTitle, RoleOption } from '$features/users/CreateUserParts';
import { CreationFeedback } from '$features/users/CreationFeedback';
import { NewUserSuccess } from '$features/users/NewUserSuccess';
import { useCreateUser } from '$features/users/useCreateUser';
import { UserAccessBadge } from '$features/users/user-badges';
import { useUnsavedNavigationGuard } from '$hooks/useUnsavedNavigationGuard';
import type { UserType } from '$types/auth.types';
import { Card, CardContent } from '$ui/card';
import { Input } from '$ui/input';
import { Label } from '$ui/label';
import { PageCanvas, PageShell } from '$ui/page-shell';
import { Separator } from '$ui/separator';
import { StatusBadge } from '$ui/status-badge';

export const NewUserForm: FC<{
  returnHref: string;
  userData: UserType | null;
}> = ({ returnHref, userData }) => {
  const canCreateUsers = userData
    ? userData.isProtected ||
      hasPermission(
        userData.role,
        PERMISSIONS.USERS.CREATE,
        userData.permissions,
      )
    : false;
  const canCreateAdminUsers = userData?.isProtected ?? false;

  const controller = useCreateUser(canCreateUsers);
  const {
    createdUser,
    errors,
    firstNameRef,
    form,
    formRef,
    handleCreateUser,
    hasUnacknowledgedPassword,
    hasUnsavedChanges,
    isChecking,
    isCreating,
    recovery,
    resetForm,
    setShowAdminCreationStepUp,
    showAdminCreationStepUp,
    temporaryPassword,
    updateField,
  } = controller;
  const [isContactEmailEditable, setIsContactEmailEditable] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const {
    cancelPendingNavigation,
    confirmPendingNavigation,
    pendingNavigationHref,
    restoreFocus,
  } = useUnsavedNavigationGuard(
    hasUnsavedChanges || isCreating || hasUnacknowledgedPassword,
  );
  const requestReset = (): void => {
    if (hasUnacknowledgedPassword) setConfirmReset(true);
    else {
      resetForm();
      setIsContactEmailEditable(false);
    }
  };

  if (!canCreateUsers) {
    return (
      <AccessDeniedState
        actionHref={returnHref}
        actionLabel="Retour aux utilisateurs"
        description="Vous n'avez pas la permission de créer des utilisateurs."
      />
    );
  }

  const headerTitle = createdUser
    ? [createdUser.firstName, createdUser.lastName].filter(Boolean).join(' ') ||
      createdUser.loginName
    : 'Nouvel utilisateur';
  const headerSubtitle = createdUser
    ? createdUser.loginName
    : 'Créez un accès, puis transmettez les identifiants de connexion.';

  return (
    <PageShell className="py-0" width="form">
      <PageCanvas contentClassName="space-y-5">
        <div className="relative w-full space-y-5">
          <PageIdentityHero
            compact
            title={headerTitle}
            description={headerSubtitle}
            icon={
              createdUser ? (
                <UserAvatar
                  user={createdUser}
                  className="size-full rounded-[7px]"
                />
              ) : (
                <UserPlus />
              )
            }
            meta={
              createdUser ? (
                <>
                  <UserAccessBadge user={createdUser} />
                  <StatusBadge tone="success">Créé</StatusBadge>
                </>
              ) : undefined
            }
          />

          <CreationFeedback controller={controller} returnHref={returnHref} />
          {createdUser && temporaryPassword ? (
            <NewUserSuccess
              controller={controller}
              returnHref={returnHref}
              onCreateAnother={requestReset}
            />
          ) : (
            <form
              ref={formRef}
              aria-busy={isCreating}
              autoComplete="off"
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                void handleCreateUser();
              }}
            >
              <fieldset
                disabled={isCreating || isChecking || !!recovery}
                className="min-w-0"
              >
                {/* The hero explains the flow: the card starts with its fields. */}
                <Card>
                  <CardContent className="space-y-5 p-4 sm:p-5">
                    <section
                      aria-labelledby="new-identity-title"
                      className="space-y-3"
                    >
                      <FormSectionTitle id="new-identity-title">
                        Identité
                      </FormSectionTitle>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="newFirstName" required>
                            Prénom
                          </Label>
                          <Input
                            aria-describedby={
                              errors.firstName
                                ? 'newFirstName-error'
                                : undefined
                            }
                            aria-invalid={!!errors.firstName}
                            ref={firstNameRef}
                            id="newFirstName"
                            maxLength={50}
                            placeholder="Jean"
                            required
                            value={form.firstName}
                            onChange={(event) =>
                              updateField('firstName', event.target.value)
                            }
                          />
                          {errors.firstName && (
                            <p
                              className="text-destructive text-xs"
                              id="newFirstName-error"
                              role="alert"
                            >
                              {errors.firstName}
                            </p>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="newLastName">
                            Nom{' '}
                            <span className="font-normal">(facultatif)</span>
                          </Label>
                          <Input
                            aria-describedby={
                              errors.lastName ? 'newLastName-error' : undefined
                            }
                            aria-invalid={!!errors.lastName}
                            id="newLastName"
                            maxLength={50}
                            placeholder="Dupont"
                            value={form.lastName}
                            onChange={(event) =>
                              updateField('lastName', event.target.value)
                            }
                          />
                          {errors.lastName && (
                            <p
                              className="text-destructive text-xs"
                              id="newLastName-error"
                              role="alert"
                            >
                              {errors.lastName}
                            </p>
                          )}
                        </div>
                      </div>
                    </section>

                    <Separator />

                    <section
                      aria-labelledby="new-connection-title"
                      className="space-y-3"
                    >
                      <FormSectionTitle id="new-connection-title">
                        Connexion
                      </FormSectionTitle>
                      <div className="space-y-1.5">
                        <Label htmlFor="newLoginName" required>
                          Identifiant de connexion
                        </Label>
                        <div className="relative">
                          <AtSign className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
                          <Input
                            aria-describedby={
                              errors.loginName
                                ? 'newLoginName-error'
                                : 'newLoginName-hint'
                            }
                            aria-invalid={!!errors.loginName}
                            autoCapitalize="none"
                            autoCorrect="off"
                            className="pl-9"
                            id="newLoginName"
                            maxLength={32}
                            placeholder="jean.dupont"
                            required
                            spellCheck={false}
                            type="text"
                            value={form.loginName}
                            onChange={(event) =>
                              updateField(
                                'loginName',
                                event.target.value.toLowerCase(),
                              )
                            }
                          />
                        </div>
                        {errors.loginName ? (
                          <p
                            className="text-destructive text-xs"
                            id="newLoginName-error"
                            role="alert"
                          >
                            {errors.loginName}
                          </p>
                        ) : (
                          <p
                            className="text-muted-foreground text-xs"
                            id="newLoginName-hint"
                          >
                            3 à 32 caractères : lettres, chiffres, point, tiret
                            ou underscore.
                          </p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="newContactAddress">
                          Adresse de contact{' '}
                          <span className="font-normal">(facultatif)</span>
                        </Label>
                        <div className="relative">
                          <Mail className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
                          <Input
                            aria-describedby={
                              errors.contactEmail
                                ? 'newContactAddress-error'
                                : 'newContactAddress-hint'
                            }
                            aria-invalid={!!errors.contactEmail}
                            autoComplete="off"
                            className="pl-9"
                            data-bwignore="true"
                            data-lpignore="true"
                            id="newContactAddress"
                            inputMode="email"
                            maxLength={254}
                            placeholder="Contact"
                            readOnly={!isContactEmailEditable}
                            type="text"
                            value={form.contactEmail}
                            onChange={(event) =>
                              updateField('contactEmail', event.target.value)
                            }
                            onFocus={() => setIsContactEmailEditable(true)}
                          />
                        </div>
                        {errors.contactEmail ? (
                          <p
                            className="text-destructive text-xs"
                            id="newContactAddress-error"
                            role="alert"
                          >
                            {errors.contactEmail}
                          </p>
                        ) : (
                          <p
                            className="text-muted-foreground text-xs"
                            id="newContactAddress-hint"
                          >
                            Adresse de contact facultative, distincte de
                            l&apos;identifiant et jamais utilisée pour se
                            connecter.
                          </p>
                        )}
                      </div>
                    </section>

                    <Separator />

                    <section
                      aria-labelledby="new-access-title"
                      className="space-y-3"
                    >
                      <FormSectionTitle id="new-access-title">
                        Accès
                      </FormSectionTitle>
                      <div
                        aria-labelledby="new-access-title"
                        className="grid gap-2 sm:grid-cols-2"
                        role="radiogroup"
                        aria-invalid={!!errors.role}
                        aria-describedby={
                          errors.role ? 'newRole-error' : undefined
                        }
                        tabIndex={errors.role ? -1 : undefined}
                      >
                        <RoleOption
                          checked={form.role === UserRole.USER}
                          description="Accès standard, sans droits d'administration."
                          label="Utilisateur"
                          onSelect={() => updateField('role', UserRole.USER)}
                          value={UserRole.USER}
                        />
                        {canCreateAdminUsers && (
                          <RoleOption
                            checked={form.role === UserRole.ADMIN}
                            description="Peut gérer les comptes et la configuration."
                            label="Administrateur"
                            onSelect={() => updateField('role', UserRole.ADMIN)}
                            value={UserRole.ADMIN}
                          />
                        )}
                      </div>
                      {errors.role && (
                        <p
                          id="newRole-error"
                          className="text-destructive text-xs"
                          role="alert"
                        >
                          {errors.role}
                        </p>
                      )}
                      <p className="text-muted-foreground text-xs">
                        Un mot de passe temporaire est généré à la création ; il
                        devra être changé à la première connexion.
                      </p>
                    </section>
                  </CardContent>
                  <SectionActionBar
                    cancelHref={returnHref}
                    isSaving={isCreating}
                    label="Création du compte"
                    saveDisabled={!form.firstName || !form.loginName}
                    saveLabel="Créer le compte"
                    saveType="submit"
                    savingLabel="Création…"
                    status={null}
                  />
                </Card>
              </fieldset>
            </form>
          )}
        </div>
      </PageCanvas>
      <UnsavedNavigationDialog
        title={
          isCreating
            ? 'Création en cours'
            : hasUnacknowledgedPassword
              ? 'Avez-vous conservé le mot de passe ?'
              : recovery
                ? 'Création à vérifier'
                : undefined
        }
        confirmLabel={
          isCreating
            ? 'Quitter quand même'
            : hasUnacknowledgedPassword
              ? 'Quitter cette page'
              : recovery
                ? 'Quitter la vérification'
                : undefined
        }
        description={
          isCreating
            ? 'La demande a déjà été envoyée. Quitter cette page n’annule pas la création et peut empêcher la récupération du mot de passe temporaire.'
            : hasUnacknowledgedPassword
              ? 'Le compte est créé. Le mot de passe affiché ne pourra plus être relu après votre départ. Conservez-le pour le transmettre.'
              : recovery
                ? 'Le résultat de la création reste à vérifier. Recherchez ce même identifiant avant de créer à nouveau le compte.'
                : 'Les informations saisies pour ce nouveau compte seront perdues.'
        }
        onCancel={cancelPendingNavigation}
        onCloseAutoFocus={restoreFocus}
        onConfirm={confirmPendingNavigation}
        open={pendingNavigationHref !== null}
      />
      <UnsavedNavigationDialog
        title="Effacer le mot de passe affiché ?"
        confirmLabel="Créer un autre compte"
        description="Le compte est déjà créé. Conservez son mot de passe avant de l’effacer : il ne pourra plus être relu."
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          setConfirmReset(false);
          resetForm();
          setIsContactEmailEditable(false);
        }}
        open={confirmReset}
      />
      {userData && (
        <AdminStepUpDialog
          actorLoginName={userData.loginName}
          description="Confirmez votre identité avant de créer un compte administrateur."
          onCancel={() => setShowAdminCreationStepUp(false)}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            const submit = formRef.current?.querySelector<HTMLButtonElement>(
              'button[type="submit"]',
            );
            if (submit && !submit.disabled) submit.focus();
          }}
          onComplete={async () => {
            setShowAdminCreationStepUp(false);
            await handleCreateUser();
          }}
          open={showAdminCreationStepUp}
          title="Confirmer la création administrateur"
        />
      )}
    </PageShell>
  );
};
