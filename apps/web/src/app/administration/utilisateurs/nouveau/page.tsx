'use client';

import { UserRole } from '@repo/database';
import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  Plus,
  Shield,
  ShieldAlert,
  User,
  UserPlus,
} from 'lucide-react';
import Link from 'next/link';
import React, { type FC, useState } from 'react';
import { toast } from 'sonner';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import { useUser } from '$context/UserContext';
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
import { ServiceIcon } from '$ui/service-icon';
import { apiFetch } from '$utils/api.utils';

type NewUserForm = {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
};

const EMPTY_USER_FORM: NewUserForm = {
  email: '',
  firstName: '',
  lastName: '',
  role: UserRole.USER,
};

const inputClassName = 'border-border/80 bg-input';

const SectionTitle: FC<{
  children: React.ReactNode;
  icon: React.ReactNode;
}> = ({ children, icon }) => (
  <h3 className="text-foreground flex items-center gap-2 text-sm font-semibold">
    <span className="bg-primary/10 text-primary flex size-6 items-center justify-center rounded-md">
      {icon}
    </span>
    {children}
  </h3>
);

const CreationPanel: FC<{
  children: React.ReactNode;
  icon: React.ReactNode;
  title: string;
}> = ({ children, icon, title }) => (
  <section className="border-border/60 bg-popover space-y-3 rounded-md border p-3">
    <SectionTitle icon={icon}>{title}</SectionTitle>
    {children}
  </section>
);

const AccessDenied: FC = () => (
  <PageShell className="py-0">
    <PageCanvas>
      <Card className="max-w-3xl py-0">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <ServiceIcon className="bg-destructive/10 text-destructive">
              <ShieldAlert className="size-5" />
            </ServiceIcon>
            <div className="space-y-3">
              <div>
                <h1 className="text-xl font-semibold">Accès refusé</h1>
                <p className="text-muted-foreground mt-1 text-sm">
                  Vous n&apos;avez pas la permission de créer des utilisateurs.
                </p>
              </div>
              <Button asChild variant="outline">
                <Link href="/administration/utilisateurs">
                  Retour aux utilisateurs
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </PageCanvas>
  </PageShell>
);

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
  const [createdUser, setCreatedUser] = useState<UserType | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(
    null,
  );

  const resetForm = (): void => {
    setForm(EMPTY_USER_FORM);
    setCreatedUser(null);
    setTemporaryPassword(null);
  };

  const handleCreateUser = async (): Promise<void> => {
    if (!canCreateUsers) {
      toast.error('Permission insuffisante pour créer un utilisateur');

      return;
    }

    if (!form.email || !form.firstName || !form.lastName) {
      toast.error('Veuillez remplir tous les champs');

      return;
    }

    setIsCreating(true);
    try {
      const response = await apiFetch('/api/users', {
        body: JSON.stringify(form),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        setCreatedUser(data.data.user);
        setTemporaryPassword(data.data.temporaryPassword);
        toast.success('Utilisateur créé avec succès');
      } else {
        toast.error(data.error?.message || 'Erreur lors de la création');
      }
    } catch {
      toast.error('Erreur lors de la création');
    } finally {
      setIsCreating(false);
    }
  };

  if (!canCreateUsers) {
    return <AccessDenied />;
  }

  const headerTitle = createdUser
    ? `${createdUser.firstName} ${createdUser.lastName}`
    : 'Nouvel utilisateur';
  const headerSubtitle = createdUser
    ? createdUser.email
    : form.email.trim() || 'Compte en préparation';
  const headerRole = createdUser?.role ?? form.role;

  return (
    <PageShell className="py-0">
      <PageCanvas contentClassName="space-y-3">
        <div className="mx-auto w-full max-w-4xl space-y-3">
          <Card className="shrink-0 overflow-hidden py-0">
            <div className="bg-primary h-1 w-full" />
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <Button
                    asChild
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                  >
                    <Link
                      href="/administration/utilisateurs"
                      aria-label="Retour aux utilisateurs"
                    >
                      <ArrowLeft className="size-4" />
                    </Link>
                  </Button>
                  <ServiceIcon
                    className={
                      createdUser
                        ? 'bg-primary/10 text-primary'
                        : 'bg-secondary text-secondary-foreground'
                    }
                  >
                    {createdUser ? (
                      <CheckCircle2 className="size-5" />
                    ) : (
                      <UserPlus className="size-5" />
                    )}
                  </ServiceIcon>
                  <div className="min-w-0">
                    <h1 className="truncate text-lg font-semibold tracking-tight">
                      {headerTitle}
                    </h1>
                    <p className="text-muted-foreground truncate text-sm">
                      {headerSubtitle}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <Badge
                        variant={
                          headerRole === UserRole.ADMIN
                            ? 'default'
                            : 'secondary'
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
                        className="border-amber-500/40 text-amber-400"
                      >
                        Mot de passe temporaire
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="text-muted-foreground flex flex-wrap gap-2 text-xs">
                  <span className="border-border/60 bg-popover inline-flex h-7 items-center gap-1.5 rounded-md border px-2">
                    <KeyRound className="size-3.5" />
                    Première connexion
                    <span className="text-foreground font-medium">
                      Mot de passe à changer
                    </span>
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          {createdUser && temporaryPassword ? (
            <Card className="border-border/70 bg-card overflow-hidden rounded-lg py-0">
              <CardHeader className="border-border/60 bg-accent border-b p-3 sm:p-4">
                <CardTitle className="text-sm">Compte créé</CardTitle>
                <CardDescription>
                  Le compte est prêt. Transmettez le mot de passe temporaire,
                  puis ouvrez la fiche si vous devez compléter son profil.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 p-3 sm:p-4">
                <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
                  <CreationPanel
                    icon={<KeyRound className="size-3.5" />}
                    title="Mot de passe temporaire"
                  >
                    <div className="rounded-md border border-amber-500/25 bg-amber-500/10 p-3">
                      <p className="text-muted-foreground mb-3 text-xs">
                        À communiquer une seule fois. L&apos;utilisateur devra
                        le changer à sa première connexion.
                      </p>
                      <code className="border-border bg-popover text-foreground block rounded-md border px-3 py-2 font-mono text-sm">
                        {temporaryPassword}
                      </code>
                    </div>
                  </CreationPanel>
                  <CreationPanel
                    icon={<Shield className="size-3.5" />}
                    title="Accès"
                  >
                    <div className="space-y-2 text-sm">
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
                          className="border-amber-500/40 text-amber-400"
                        >
                          À changer
                        </Badge>
                      </div>
                    </div>
                  </CreationPanel>
                </div>
              </CardContent>
              <CardFooter className="border-border/60 bg-accent flex flex-wrap gap-2 border-t p-4">
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
              onSubmit={(event) => {
                event.preventDefault();
                void handleCreateUser();
              }}
            >
              <Card className="border-border/70 bg-card overflow-hidden rounded-lg py-0">
                <CardHeader className="border-border/60 bg-accent border-b p-3 sm:p-4">
                  <CardTitle className="text-sm">Création du compte</CardTitle>
                  <CardDescription>
                    Renseignez l&apos;identité, puis choisissez le niveau
                    d&apos;accès initial.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 p-3 sm:p-4">
                  <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
                    <CreationPanel
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
                            id="newFirstName"
                            value={form.firstName}
                            autoComplete="given-name"
                            placeholder="Jean"
                            onChange={(event) =>
                              setForm({
                                ...form,
                                firstName: event.target.value,
                              })
                            }
                            className={inputClassName}
                          />
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
                            id="newLastName"
                            value={form.lastName}
                            autoComplete="family-name"
                            placeholder="Dupont"
                            onChange={(event) =>
                              setForm({
                                ...form,
                                lastName: event.target.value,
                              })
                            }
                            className={inputClassName}
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="newEmail"
                          className="text-muted-foreground text-xs"
                          required
                        >
                          Email de connexion
                        </Label>
                        <div className="relative">
                          <Mail className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
                          <Input
                            id="newEmail"
                            type="email"
                            value={form.email}
                            autoComplete="email"
                            placeholder="jean.dupont@example.com"
                            onChange={(event) =>
                              setForm({ ...form, email: event.target.value })
                            }
                            className={`${inputClassName} pl-9`}
                          />
                        </div>
                      </div>
                    </CreationPanel>
                    <CreationPanel
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
                            setForm({ ...form, role: value as UserRole })
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
                      <div className="text-muted-foreground rounded-md border border-amber-500/25 bg-amber-500/10 px-2.5 py-2 text-xs">
                        Le compte sera créé avec un mot de passe temporaire à
                        changer à la première connexion.
                      </div>
                    </CreationPanel>
                  </div>
                </CardContent>
                <CardFooter className="border-border/60 bg-accent flex justify-between gap-3 border-t p-4">
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
                        !form.email ||
                        !form.firstName ||
                        !form.lastName
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
