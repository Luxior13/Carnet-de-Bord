'use client';

import { UserRole } from '@repo/shared';
import {
  AtSign,
  CheckCircle2,
  Copy,
  KeyRound,
  Loader2,
  Mail,
  Plus,
  Shield,
  User,
  UserPlus,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import React, { type FC, Suspense, useState } from 'react';
import { toast } from 'sonner';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { PageDetailSkeleton } from '$components/layout/PageDetailSkeleton';
import { AccessDeniedState } from '$components/layout/PageState';
import { SectionPanel } from '$components/layout/SectionPanel';
import { UnsavedNavigationDialog } from '$components/layout/UnsavedNavigationDialog';
import { AdminStepUpDialog } from '$components/users/user-detail/AdminStepUpDialog';
import { UsersAdminHero } from '$components/users/UsersAdminHero';
import { FEATURES } from '$constants/feature-registry.constants';
import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import { PAGE_PATHS, userDetailPath } from '$constants/routes.constants';
import { useUser } from '$context/UserContext';
import { useUnsavedNavigationGuard } from '$hooks/useUnsavedNavigationGuard';
import { ErrorCode } from '$types/api.types';
import type { UserType } from '$types/auth.types';
import { Badge } from '$ui/badge';
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
import { apiFetch } from '$utils/api.utils';
import { cn } from '$utils/css.utils';
import { getSafeCollectionReturnHref } from '$utils/navigation.utils';

type NewUserForm = {
  contactEmail: string;
  firstName: string;
  lastName: string;
  loginName: string;
  role: UserRole;
};

type NewUserFormErrors = Partial<
  Record<'contactEmail' | 'firstName' | 'lastName' | 'loginName', string>
>;

const EMPTY_USER_FORM: NewUserForm = {
  contactEmail: '',
  firstName: '',
  lastName: '',
  loginName: '',
  role: UserRole.USER,
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/;
const LOGIN_NAME_PATTERN = /^[a-z0-9][a-z0-9._-]{1,30}[a-z0-9]$/;

const focusFirstError = (): void => {
  requestAnimationFrame(() => {
    document
      .querySelector<HTMLElement>('[aria-invalid="true"]')
      ?.focus({ preventScroll: false });
  });
};

type RoleOptionProps = {
  checked: boolean;
  description: string;
  label: string;
  onSelect: (value: UserRole) => void;
  value: UserRole;
};

const RoleOption: FC<RoleOptionProps> = ({
  checked,
  description,
  label,
  onSelect,
  value,
}) => (
  <label
    className={cn(
      'cursor-pointer rounded-lg border p-3 transition-colors',
      checked
        ? 'border-primary bg-primary/10'
        : 'border-border-control bg-input hover:bg-surface-control-hover',
    )}
  >
    <input
      checked={checked}
      className="sr-only"
      name="newRole"
      onChange={() => onSelect(value)}
      type="radio"
      value={value}
    />
    <span className="text-foreground block text-sm font-medium">{label}</span>
    <span className="text-muted-foreground mt-0.5 block text-xs leading-5">
      {description}
    </span>
  </label>
);

const NewUserContent: FC<{ returnHref: string }> = ({ returnHref }) => {
  const { userData } = useUser();
  const canCreateUsers = userData
    ? userData.isProtected ||
      hasPermission(
        userData.role,
        PERMISSIONS.USERS.CREATE,
        userData.permissions,
      )
    : false;
  const canCreateAdminUsers = userData?.isProtected ?? false;

  const [form, setForm] = useState(EMPTY_USER_FORM);
  const [isCreating, setIsCreating] = useState(false);
  const [isContactEmailEditable, setIsContactEmailEditable] = useState(false);
  const [showAdminCreationStepUp, setShowAdminCreationStepUp] = useState(false);
  const [errors, setErrors] = useState<NewUserFormErrors>({});
  const [createdUser, setCreatedUser] = useState<UserType | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(
    null,
  );
  const hasUnsavedChanges =
    !createdUser &&
    (form.contactEmail !== '' ||
      form.firstName !== '' ||
      form.lastName !== '' ||
      form.loginName !== '' ||
      form.role !== EMPTY_USER_FORM.role);
  const {
    cancelPendingNavigation,
    confirmPendingNavigation,
    pendingNavigationHref,
  } = useUnsavedNavigationGuard(hasUnsavedChanges);

  const resetForm = (): void => {
    setForm(EMPTY_USER_FORM);
    setCreatedUser(null);
    setTemporaryPassword(null);
    setErrors({});
  };

  const updateField = <Field extends keyof NewUserForm>(
    field: Field,
    value: NewUserForm[Field],
  ): void => {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
    if (field !== 'role') {
      setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const nextErrors: NewUserFormErrors = {};
    const normalizedContactEmail = form.contactEmail.trim();
    const normalizedLoginName = form.loginName.trim().toLowerCase();

    if (!form.firstName.trim()) {
      nextErrors.firstName = 'Prénom obligatoire';
    } else if (form.firstName.trim().length > 50) {
      nextErrors.firstName = 'Prénom trop long';
    }
    if (!form.lastName.trim()) {
      nextErrors.lastName = 'Nom obligatoire';
    } else if (form.lastName.trim().length > 50) {
      nextErrors.lastName = 'Nom trop long';
    }
    if (!normalizedLoginName) {
      nextErrors.loginName = 'Identifiant obligatoire';
    } else if (
      normalizedLoginName.length < 3 ||
      normalizedLoginName.length > 32
    ) {
      nextErrors.loginName = "L'identifiant doit contenir 3 à 32 caractères";
    } else if (!LOGIN_NAME_PATTERN.test(normalizedLoginName)) {
      nextErrors.loginName =
        'Utilisez uniquement des lettres, chiffres, points, tirets ou underscores, avec une lettre ou un chiffre au début et à la fin';
    }
    if (normalizedContactEmail && !EMAIL_PATTERN.test(normalizedContactEmail)) {
      nextErrors.contactEmail = 'Adresse email invalide';
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const copyTemporaryPassword = async (): Promise<void> => {
    if (!temporaryPassword) return;

    try {
      await navigator.clipboard.writeText(temporaryPassword);
      toast.success('Mot de passe temporaire copié');
    } catch {
      toast.error('Impossible de copier le mot de passe');
    }
  };

  const handleCreateUser = async (): Promise<void> => {
    if (!canCreateUsers) {
      toast.error('Permission insuffisante pour créer un utilisateur');

      return;
    }

    if (!validateForm()) {
      toast.error('Corrigez les champs signalés');
      focusFirstError();

      return;
    }

    setIsCreating(true);
    try {
      const normalizedContactEmail = form.contactEmail.trim().toLowerCase();
      const response = await apiFetch('/api/users', {
        body: JSON.stringify({
          ...(normalizedContactEmail
            ? { contactEmail: normalizedContactEmail }
            : {}),
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          loginName: form.loginName.trim().toLowerCase(),
          role: form.role,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        setCreatedUser(data.data.user);
        setTemporaryPassword(data.data.temporaryPassword);
        toast.success('Compte créé avec succès');
      } else {
        if (
          form.role === UserRole.ADMIN &&
          data.error?.code === ErrorCode.REAUTHENTICATION_REQUIRED
        ) {
          setShowAdminCreationStepUp(true);

          return;
        }

        toast.error(data.error?.message || 'Erreur lors de la création');
      }
    } catch {
      toast.error('Erreur lors de la création');
    } finally {
      setIsCreating(false);
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
    ? `${createdUser.firstName} ${createdUser.lastName}`
    : 'Nouvel utilisateur';
  const headerSubtitle = createdUser
    ? createdUser.loginName
    : 'Créez un accès, puis transmettez les identifiants de connexion.';
  const headerRole = createdUser?.role ?? form.role;

  return (
    <PageShell className="py-0" width="form">
      <PageCanvas contentClassName="space-y-5">
        <div className="relative w-full space-y-5">
          <UsersAdminHero
            title={headerTitle}
            description={headerSubtitle}
            icon={
              createdUser ? (
                <CheckCircle2 className="size-5" />
              ) : (
                <UserPlus className="size-5" />
              )
            }
            meta={
              createdUser ? (
                <>
                  <Badge
                    variant={
                      headerRole === UserRole.ADMIN ? 'default' : 'secondary'
                    }
                  >
                    {headerRole === UserRole.ADMIN
                      ? 'Administrateur'
                      : 'Utilisateur'}
                  </Badge>
                  <Badge variant="secondary">Créé</Badge>
                </>
              ) : undefined
            }
          />

          {createdUser && temporaryPassword ? (
            <Card className="border-border-content overflow-hidden rounded-lg py-0">
              <CardHeader className="bg-surface-muted border-border-divider border-b p-3 sm:p-4">
                <CardTitle aria-live="polite" className="text-sm" role="status">
                  Compte créé
                </CardTitle>
                <CardDescription>
                  Transmettez l&apos;identifiant et le mot de passe temporaire,
                  puis complétez la fiche si nécessaire.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 p-3 sm:p-4">
                <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
                  <SectionPanel
                    titleAs="h3"
                    icon={<KeyRound className="size-3.5" />}
                    title="Mot de passe temporaire"
                  >
                    <div className="border-warning/25 bg-warning/10 rounded-md border p-3">
                      <p className="text-muted-foreground mb-3 text-xs">
                        À communiquer une seule fois. L&apos;utilisateur devra
                        le changer à sa première connexion.
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="border-border bg-surface-inset text-foreground min-w-0 flex-1 overflow-x-auto rounded-md border px-3 py-2 font-mono text-sm">
                          {temporaryPassword}
                        </code>
                        <Button
                          aria-label="Copier le mot de passe temporaire"
                          onClick={() => void copyTemporaryPassword()}
                          size="icon"
                          type="button"
                          variant="outline"
                        >
                          <Copy className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </SectionPanel>
                  <SectionPanel
                    titleAs="h3"
                    icon={<Shield className="size-3.5" />}
                    title="Accès"
                  >
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-muted-foreground">
                          Identifiant
                        </span>
                        <code className="text-foreground min-w-0 text-right text-xs break-all">
                          {createdUser.loginName}
                        </code>
                      </div>
                      {createdUser.contactEmail && (
                        <>
                          <Separator className="bg-border/60" />
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-muted-foreground">
                              Contact
                            </span>
                            <span className="text-foreground min-w-0 text-right text-xs break-all">
                              {createdUser.contactEmail}
                            </span>
                          </div>
                        </>
                      )}
                      <Separator className="bg-border/60" />
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Rôle</span>
                        <Badge
                          variant={
                            createdUser.role === UserRole.ADMIN
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {createdUser.role === UserRole.ADMIN
                            ? 'Administrateur'
                            : 'Utilisateur'}
                        </Badge>
                      </div>
                      <Separator className="bg-border/60" />
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">
                          Mot de passe
                        </span>
                        <Badge
                          variant="outline"
                          className="border-warning/40 text-warning"
                        >
                          À changer
                        </Badge>
                      </div>
                    </div>
                  </SectionPanel>
                </div>
              </CardContent>
              <CardFooter className="bg-surface-muted border-border-divider flex flex-wrap gap-2 border-t p-4">
                <Button asChild>
                  <Link
                    href={`${userDetailPath(createdUser.id)}?${new URLSearchParams({ returnTo: returnHref })}`}
                  >
                    Ouvrir la fiche
                  </Link>
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Créer un autre
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <form
              autoComplete="off"
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                void handleCreateUser();
              }}
            >
              <Card className="border-border-content overflow-hidden rounded-lg py-0">
                <CardHeader className="bg-surface-muted border-border-divider border-b p-3 sm:p-4">
                  <CardTitle className="text-sm">Création du compte</CardTitle>
                  <CardDescription>
                    Renseignez l&apos;identité, la connexion et le niveau
                    d&apos;accès, puis transmettez les identifiants générés.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5 p-3 sm:p-4">
                  <section
                    aria-labelledby="new-identity-title"
                    className="space-y-3"
                  >
                    <h3
                      id="new-identity-title"
                      className="text-foreground flex items-center gap-2 text-sm font-semibold"
                    >
                      <User className="text-muted-foreground size-4" />
                      Identité
                    </h3>
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
                            errors.firstName ? 'newFirstName-error' : undefined
                          }
                          aria-invalid={!!errors.firstName}
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
                          required
                        >
                          Nom
                        </Label>
                        <Input
                          aria-describedby={
                            errors.lastName ? 'newLastName-error' : undefined
                          }
                          aria-invalid={!!errors.lastName}
                          id="newLastName"
                          maxLength={50}
                          placeholder="Dupont"
                          required
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
                    <h3
                      id="new-connection-title"
                      className="text-foreground flex items-center gap-2 text-sm font-semibold"
                    >
                      <AtSign className="text-muted-foreground size-4" />
                      Connexion
                    </h3>
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
                          3 à 32 caractères : lettres, chiffres, point, tiret ou
                          underscore.
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
                    <h3
                      id="new-access-title"
                      className="text-foreground flex items-center gap-2 text-sm font-semibold"
                    >
                      <Shield className="text-muted-foreground size-4" />
                      Accès
                    </h3>
                    <div
                      aria-labelledby="new-access-title"
                      className="grid gap-2 sm:grid-cols-2"
                      role="radiogroup"
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
                    <div className="border-warning/25 bg-warning/10 text-muted-foreground rounded-md border px-2.5 py-2 text-xs">
                      Le mot de passe temporaire sera généré à la création et à
                      changer à la première connexion.
                    </div>
                  </section>
                </CardContent>
                <CardFooter className="bg-surface-muted border-border-divider flex flex-wrap items-center justify-between gap-3 border-t p-4">
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
                        isCreating ||
                        !form.firstName ||
                        !form.lastName ||
                        !form.loginName
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
            </form>
          )}
        </div>
      </PageCanvas>
      <UnsavedNavigationDialog
        description="Les informations saisies pour ce nouveau compte seront perdues."
        onCancel={cancelPendingNavigation}
        onConfirm={confirmPendingNavigation}
        open={pendingNavigationHref !== null}
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
      <NewUserContent returnHref={returnHref} />
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
