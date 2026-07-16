'use client';

import { UserRole } from '@repo/database';
import {
  ArrowLeft,
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
import React, { type FC, useState } from 'react';
import { toast } from 'sonner';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { AccessDeniedState } from '$components/layout/PageState';
import { SectionPanel } from '$components/layout/SectionPanel';
import { AdminStepUpDialog } from '$components/users/user-detail/AdminStepUpDialog';
import { UsersAdminHero } from '$components/users/UsersAdminHero';
import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import { useUser } from '$context/UserContext';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '$ui/select';
import { Separator } from '$ui/separator';
import { apiFetch } from '$utils/api.utils';

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

const inputClassName = 'border-border/80 bg-input';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/;
const LOGIN_NAME_PATTERN = /^[a-z0-9][a-z0-9._-]{1,30}[a-z0-9]$/;

const NewUserContent: FC = () => {
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
  const [showAdminCreationStepUp, setShowAdminCreationStepUp] = useState(false);
  const [errors, setErrors] = useState<NewUserFormErrors>({});
  const [createdUser, setCreatedUser] = useState<UserType | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(
    null,
  );

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
        toast.success('Utilisateur créé avec succès');
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
        actionHref="/administration/utilisateurs"
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
    : form.loginName.trim() || 'Compte en préparation';
  const headerRole = createdUser?.role ?? form.role;

  return (
    <PageShell className="py-0">
      <PageCanvas contentClassName="space-y-5">
        <div className="mx-auto w-full max-w-4xl space-y-5">
          <UsersAdminHero
            title={headerTitle}
            description={headerSubtitle}
            actions={
              <Button asChild variant="outline" size="sm">
                <Link href="/administration/utilisateurs">
                  <ArrowLeft className="size-4" />
                  Retour
                </Link>
              </Button>
            }
            icon={
              createdUser ? (
                <CheckCircle2 className="size-5" />
              ) : (
                <UserPlus className="size-5" />
              )
            }
            meta={
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
                {createdUser ? (
                  <Badge variant="secondary">Créé</Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-muted-foreground/35 bg-muted/30 text-muted-foreground"
                  >
                    Brouillon
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className="border-warning/40 text-warning"
                >
                  Mot de passe temporaire
                </Badge>
              </>
            }
          />
          {createdUser && temporaryPassword ? (
            <Card className="border-border/70 overflow-hidden rounded-lg py-0">
              <CardHeader className="border-border/65 bg-surface-muted border-b p-3 sm:p-4">
                <CardTitle aria-live="polite" className="text-sm" role="status">
                  Compte créé
                </CardTitle>
                <CardDescription>
                  Le compte est prêt. Transmettez son identifiant et le mot de
                  passe temporaire, puis complétez sa fiche si nécessaire.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 p-3 sm:p-4">
                <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
                  <SectionPanel
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
              <CardFooter className="border-border/65 bg-surface-muted flex flex-wrap gap-2 border-t p-4">
                <Button asChild>
                  <Link href={`/administration/utilisateurs/${createdUser.id}`}>
                    Ouvrir la fiche
                  </Link>
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Créer un autre
                </Button>
                <Button asChild variant="ghost">
                  <Link href="/administration/utilisateurs">Retour</Link>
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <form
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                void handleCreateUser();
              }}
            >
              <Card className="border-border/70 overflow-hidden rounded-lg py-0">
                <CardHeader className="border-border/65 bg-surface-muted border-b p-3 sm:p-4">
                  <CardTitle className="text-sm">Création du compte</CardTitle>
                  <CardDescription>
                    Renseignez l&apos;identité, la connexion et le contact, puis
                    choisissez le niveau d&apos;accès initial.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 p-3 sm:p-4">
                  <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
                    <SectionPanel
                      icon={<User className="size-3.5" />}
                      title="Identité"
                    >
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
                            autoComplete="given-name"
                            id="newFirstName"
                            maxLength={50}
                            name="firstName"
                            required
                            value={form.firstName}
                            placeholder="Jean"
                            onChange={(event) =>
                              updateField('firstName', event.target.value)
                            }
                            className={inputClassName}
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
                            autoComplete="family-name"
                            id="newLastName"
                            maxLength={50}
                            name="lastName"
                            required
                            value={form.lastName}
                            placeholder="Dupont"
                            onChange={(event) =>
                              updateField('lastName', event.target.value)
                            }
                            className={inputClassName}
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
                            autoComplete="username"
                            autoCorrect="off"
                            id="newLoginName"
                            maxLength={32}
                            name="loginName"
                            required
                            spellCheck={false}
                            type="text"
                            value={form.loginName}
                            placeholder="jean.dupont"
                            onChange={(event) =>
                              updateField(
                                'loginName',
                                event.target.value.toLowerCase(),
                              )
                            }
                            className={`${inputClassName} pl-9`}
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
                          htmlFor="newContactEmail"
                          className="text-muted-foreground text-xs"
                        >
                          Email de contact{' '}
                          <span className="font-normal">(facultatif)</span>
                        </Label>
                        <div className="relative">
                          <Mail className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
                          <Input
                            aria-describedby={
                              errors.contactEmail
                                ? 'newContactEmail-error'
                                : 'newContactEmail-hint'
                            }
                            aria-invalid={!!errors.contactEmail}
                            autoComplete="email"
                            id="newContactEmail"
                            maxLength={254}
                            name="contactEmail"
                            type="email"
                            value={form.contactEmail}
                            placeholder="jean.dupont@example.com"
                            onChange={(event) =>
                              updateField('contactEmail', event.target.value)
                            }
                            className={`${inputClassName} pl-9`}
                          />
                        </div>
                        {errors.contactEmail ? (
                          <p
                            className="text-destructive text-xs"
                            id="newContactEmail-error"
                            role="alert"
                          >
                            {errors.contactEmail}
                          </p>
                        ) : (
                          <p
                            className="text-muted-foreground text-xs"
                            id="newContactEmail-hint"
                          >
                            Distinct de l&apos;identifiant ; prévu pour les
                            futurs messages et la récupération du compte.
                          </p>
                        )}
                      </div>
                    </SectionPanel>
                    <SectionPanel
                      icon={<Shield className="size-3.5" />}
                      title="Accès initial"
                    >
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="newRole"
                          className="text-muted-foreground text-xs"
                          required
                        >
                          Rôle
                        </Label>
                        <Select
                          value={form.role}
                          onValueChange={(value) =>
                            updateField('role', value as UserRole)
                          }
                        >
                          <SelectTrigger
                            id="newRole"
                            className={inputClassName}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USER">Utilisateur</SelectItem>
                            {canCreateAdminUsers && (
                              <SelectItem value="ADMIN">
                                Administrateur
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="text-muted-foreground border-warning/25 bg-warning/10 rounded-md border px-2.5 py-2 text-xs">
                        Le compte sera créé avec un mot de passe temporaire à
                        changer à la première connexion.
                      </div>
                    </SectionPanel>
                  </div>
                </CardContent>
                <CardFooter className="border-border/65 bg-surface-muted flex justify-between gap-3 border-t p-4">
                  <p className="text-muted-foreground hidden text-xs sm:block">
                    Le profil pourra être complété après création.
                  </p>
                  <div className="ml-auto flex gap-2">
                    <Button asChild variant="outline">
                      <Link href="/administration/utilisateurs">Annuler</Link>
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
                          Créer
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

const NewUserPage: FC = () => (
  <AuthenticatedLayout
    breadcrumbs={[
      { label: 'Administration' },
      { href: '/administration/utilisateurs', label: 'Utilisateurs' },
      { href: '/administration/utilisateurs/nouveau', label: 'Nouveau' },
    ]}
  >
    <NewUserContent />
  </AuthenticatedLayout>
);

export default NewUserPage;
