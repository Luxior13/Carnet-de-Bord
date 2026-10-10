'use client';

import { UserRole } from '@repo/shared';
import { AtSign, Loader2, Mail, Plus, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import React, { type FC, Suspense, useState } from 'react';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { PageDetailSkeleton } from '$components/layout/PageDetailSkeleton';
import { PageIdentityHero } from '$components/layout/PageIdentityHero';
import { AccessDeniedState } from '$components/layout/PageState';
import { UnsavedNavigationDialog } from '$components/layout/UnsavedNavigationDialog';
import { AdminStepUpDialog } from '$components/users/user-detail/AdminStepUpDialog';
import { UserAvatar } from '$components/users/UserAvatar';
import { FEATURES } from '$constants/feature-registry.constants';
import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import { PAGE_PATHS } from '$constants/routes.constants';
import { useUser } from '$context/UserContext';
import { FormSectionTitle, RoleOption } from '$features/users/CreateUserParts';
import { CreationFeedback } from '$features/users/CreationFeedback';
import { NewUserSuccess } from '$features/users/NewUserSuccess';
import { useCreateUser } from '$features/users/useCreateUser';
import { UserAccessBadge } from '$features/users/user-badges';
import { useUnsavedNavigationGuard } from '$hooks/useUnsavedNavigationGuard';
import type { UserType } from '$types/auth.types';
import { Button } from '$ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '$ui/card';
import { Input } from '$ui/input';
import { Label } from '$ui/label';
import { PageCanvas, PageShell } from '$ui/page-shell';
import { Separator } from '$ui/separator';
import { ServiceIcon } from '$ui/service-icon';
import { getSafeCollectionReturnHref } from '$utils/navigation.utils';

const NewUserContent: FC<{ returnHref: string; userData: UserType | null }> = ({
  returnHref,
  userData,
}) => {
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
                  <span className="border-success/40 bg-success/15 text-success inline-flex w-fit items-center gap-1.5 rounded-[5px] border px-2 py-0.5 text-xs leading-5 font-medium whitespace-nowrap">
                    <span
                      aria-hidden="true"
                      className="size-1.5 shrink-0 rounded-full bg-current"
                    />
                    Créé
                  </span>
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
                <Card>
                  <CardHeader className="p-3.5 sm:p-4">
                    <div className="flex items-start gap-3">
                      <ServiceIcon className="border-primary/30 bg-primary/10 text-primary-emphasis size-8">
                        <UserPlus className="size-4" />
                      </ServiceIcon>
                      <div className="min-w-0">
                        <CardTitle>Création du compte</CardTitle>
                        <CardDescription className="mt-1 text-xs leading-5">
                          Renseignez l&apos;identité, la connexion et le niveau
                          d&apos;accès, puis transmettez les identifiants
                          générés.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
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
                          <Label
                            htmlFor="newFirstName"
                            className="text-muted-foreground text-xs"
                            required
                          >
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
                          <Label
                            htmlFor="newLastName"
                            className="text-muted-foreground text-xs"
                          >
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
                        <Label
                          htmlFor="newLoginName"
                          className="text-muted-foreground text-xs"
                          required
                        >
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
                        <Label
                          htmlFor="newContactAddress"
                          className="text-muted-foreground text-xs"
                        >
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
                            Distinct de l&apos;identifiant ; prévu pour la
                            récupération du compte et les futurs messages.
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
                      <div className="border-warning/25 bg-warning/10 text-muted-foreground rounded-md border px-2.5 py-2 text-xs">
                        Le mot de passe temporaire sera généré à la création et
                        à changer à la première connexion.
                      </div>
                    </section>
                  </CardContent>
                  <CardFooter className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-muted-foreground text-xs">
                      Le compte pourra être complété après création.
                    </p>
                    <div className="ml-auto flex gap-2">
                      <Button asChild variant="outline">
                        <Link href={returnHref}>Annuler</Link>
                      </Button>
                      <Button
                        type="submit"
                        disabled={
                          isCreating || !form.firstName || !form.loginName
                        }
                      >
                        {isCreating ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            Création...
                          </>
                        ) : (
                          <>
                            <Plus className="size-4" />
                            Créer le compte
                          </>
                        )}
                      </Button>
                    </div>
                  </CardFooter>
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

const NewUserPageContent: FC = () => {
  const searchParams = useSearchParams();
  const { userData } = useUser();
  const creationScope = `${userData?.id}:${userData?.isProtected}:${userData?.role}:${userData ? hasPermission(userData.role, PERMISSIONS.USERS.CREATE, userData.permissions) : false}`;
  const returnHref = getSafeCollectionReturnHref(
    searchParams.get('returnTo'),
    PAGE_PATHS.users,
  );

  return (
    <AuthenticatedLayout
      breadcrumbs={[
        { label: FEATURES.users.audit.poleLabel },
        { href: returnHref, label: FEATURES.users.label },
        { label: 'Nouvel utilisateur' },
      ]}
    >
      <NewUserContent
        key={creationScope}
        userData={userData}
        returnHref={returnHref}
      />
    </AuthenticatedLayout>
  );
};

const NewUserPage: FC = () => (
  <Suspense
    fallback={
      <PageShell className="py-0" width="form">
        <PageCanvas>
          <PageDetailSkeleton />
        </PageCanvas>
      </PageShell>
    }
  >
    <NewUserPageContent />
  </Suspense>
);

export default NewUserPage;
