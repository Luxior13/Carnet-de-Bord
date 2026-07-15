'use client';

import {
  AtSign,
  Edit,
  Loader2,
  LockKeyhole,
  Mail,
  Save,
  User,
  X,
} from 'lucide-react';
import React, { type FC, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { UserAvatar } from '$components/users/UserAvatar';
import {
  getAccessLabel,
  getRoleColor,
  hasPermission,
  PERMISSIONS,
} from '$constants/permissions.constants';
import { formatAccountDate } from '$features/account/account.utils';
import { AccountPanel } from '$features/account/components/AccountPanel';
import { ContactEmailDialog } from '$features/account/components/ContactEmailDialog';
import type { UserType } from '$types/auth.types';
import { Badge } from '$ui/badge';
import { Button } from '$ui/button';
import { Input } from '$ui/input';
import { Label } from '$ui/label';
import { apiFetch } from '$utils/api.utils';

type ProfileSectionProps = {
  onUpdate: (updatedUser?: UserType) => Promise<void>;
  userData: UserType;
};

const PROFILE_FIELD_MAX_LENGTH = 50;
const PROFILE_FORM_ID = 'account-profile-form';

export const ProfileSection: FC<ProfileSectionProps> = ({
  onUpdate,
  userData,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showContactEmailDialog, setShowContactEmailDialog] = useState(false);

  useEffect(() => {
    setFirstName(userData.firstName);
    setLastName(userData.lastName);
  }, [userData]);

  const trimmedFirstName = firstName.trim();
  const trimmedLastName = lastName.trim();
  const firstNameError = !trimmedFirstName
    ? 'Le prénom est requis'
    : trimmedFirstName.length > PROFILE_FIELD_MAX_LENGTH
      ? 'Prénom trop long'
      : null;
  const lastNameError = !trimmedLastName
    ? 'Le nom est requis'
    : trimmedLastName.length > PROFILE_FIELD_MAX_LENGTH
      ? 'Nom trop long'
      : null;
  const hasProfileChanges =
    trimmedFirstName !== userData.firstName ||
    trimmedLastName !== userData.lastName;
  const canEditProfile =
    userData.isProtected ||
    hasPermission(
      userData.role,
      PERMISSIONS.ACCOUNT.UPDATE_PROFILE,
      userData.permissions,
    );
  const canEditContact =
    userData.isProtected ||
    hasPermission(
      userData.role,
      PERMISSIONS.ACCOUNT.UPDATE_CONTACT,
      userData.permissions,
    );
  const canSaveProfile =
    canEditProfile &&
    !isSaving &&
    hasProfileChanges &&
    !firstNameError &&
    !lastNameError;

  const handleSaveProfile = async (): Promise<void> => {
    if (!canEditProfile) {
      toast.error('Modification du profil non autorisée');

      return;
    }

    if (firstNameError || lastNameError) {
      toast.error('Corrigez les champs du profil avant de sauvegarder');

      return;
    }

    if (!hasProfileChanges) {
      setIsEditing(false);

      return;
    }

    try {
      setIsSaving(true);
      const response = await apiFetch('/api/auth/me', {
        body: JSON.stringify({
          firstName: trimmedFirstName,
          lastName: trimmedLastName,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      });
      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Profil mis à jour avec succès');
        await onUpdate(data.data.user as UserType);
        setIsEditing(false);
      } else {
        toast.error(data.error?.message || 'Erreur lors de la mise à jour');
      }
    } catch {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = (): void => {
    setIsEditing(false);
    setFirstName(userData.firstName);
    setLastName(userData.lastName);
  };

  return (
    <AccountPanel
      icon={<User className="size-4" />}
      title="Profil"
      description="Identité, connexion et contact"
      actions={
        !isEditing &&
        canEditProfile && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-sidebar-border/70 bg-background/35 hover:bg-sidebar-accent/20 rounded-lg"
            onClick={() => setIsEditing(true)}
          >
            <Edit className="size-4" />
            Modifier
          </Button>
        )
      }
    >
      <div className="space-y-5">
        <div className="border-sidebar-border/55 flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <UserAvatar user={userData} className="size-16 rounded-lg" />
            <div className="min-w-0">
              <p className="text-sidebar-foreground truncate text-xl font-semibold tracking-normal">
                {userData.firstName} {userData.lastName}
              </p>
              <p className="text-sidebar-foreground/65 mt-1 flex items-center gap-2 text-sm">
                <AtSign className="size-4 shrink-0" />
                <span className="truncate">{userData.loginName}</span>
              </p>
              <p className="text-sidebar-foreground/65 mt-1 flex items-center gap-2 text-sm">
                <Mail className="size-4 shrink-0" />
                <span className="truncate">
                  {userData.contactEmail ?? 'Aucun email de contact'}
                </span>
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge
                  variant={getRoleColor(userData.role)}
                  className="rounded-full"
                >
                  {getAccessLabel(userData)}
                </Badge>
                {userData.contactEmail && (
                  <Badge
                    variant={
                      userData.contactEmailVerifiedAt ? 'secondary' : 'outline'
                    }
                    className="rounded-full"
                  >
                    {userData.contactEmailVerifiedAt
                      ? 'Email vérifié'
                      : 'Email non vérifié'}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="sm:text-right">
            <p className="text-sidebar-foreground text-xs font-bold tracking-normal">
              Compte créé
            </p>
            <p className="text-sidebar-foreground/58 text-xs">
              {formatAccountDate(userData.createdAt)}
            </p>
          </div>
        </div>
        {!isEditing ? (
          <>
            <dl className="divide-sidebar-border/45 divide-y">
              <div className="hover:bg-sidebar-accent/[0.06] grid gap-1 py-3 transition-colors sm:grid-cols-[10rem_1fr]">
                <dt className="text-sidebar-foreground text-sm font-bold tracking-normal">
                  Prénom
                </dt>
                <dd className="text-sidebar-foreground min-w-0 text-sm font-medium">
                  {userData.firstName}
                </dd>
              </div>
              <div className="hover:bg-sidebar-accent/[0.06] grid gap-1 py-3 transition-colors sm:grid-cols-[10rem_1fr]">
                <dt className="text-sidebar-foreground text-sm font-bold tracking-normal">
                  Nom
                </dt>
                <dd className="text-sidebar-foreground min-w-0 text-sm font-medium">
                  {userData.lastName}
                </dd>
              </div>
              <div className="hover:bg-sidebar-accent/[0.06] grid gap-1 py-3 transition-colors sm:grid-cols-[10rem_1fr]">
                <dt className="text-sidebar-foreground text-sm font-bold tracking-normal">
                  Identifiant de connexion
                </dt>
                <dd className="min-w-0">
                  <p className="text-sidebar-foreground truncate font-mono text-sm font-medium">
                    {userData.loginName}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {userData.isProtected
                      ? 'Identifiant racine permanent, modifiable uniquement par une procédure de récupération hors ligne.'
                      : 'Distinct de votre adresse email. Seul un administrateur habilité peut le modifier.'}
                  </p>
                </dd>
              </div>
              <div className="hover:bg-sidebar-accent/[0.06] grid gap-1 py-3 transition-colors sm:grid-cols-[10rem_1fr]">
                <dt className="text-sidebar-foreground text-sm font-bold tracking-normal">
                  Email de contact
                </dt>
                <dd className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <p className="text-sidebar-foreground min-w-0 truncate text-sm font-medium">
                        {userData.contactEmail ?? 'Non renseigné'}
                      </p>
                      {userData.contactEmail && (
                        <Badge
                          variant={
                            userData.contactEmailVerifiedAt
                              ? 'secondary'
                              : 'outline'
                          }
                          className="rounded-full text-[0.65rem]"
                        >
                          {userData.contactEmailVerifiedAt
                            ? 'Vérifié'
                            : 'Non vérifié'}
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Facultatif, distinct de l&apos;identifiant et jamais
                      utilisé pour vous connecter.
                    </p>
                  </div>
                  {canEditContact && (
                    <Button
                      className="w-fit shrink-0 rounded-lg"
                      onClick={() => setShowContactEmailDialog(true)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <Mail className="size-4" />
                      {userData.contactEmail ? 'Modifier' : 'Ajouter'}
                    </Button>
                  )}
                </dd>
              </div>
            </dl>
            {!canEditProfile && (
              <div className="text-muted-foreground border-warning/25 bg-warning/10 flex items-start gap-2 rounded-md border px-3 py-2 text-xs">
                <LockKeyhole className="text-warning mt-0.5 size-3.5 shrink-0" />
                La modification du prénom et du nom est verrouillée sur ce
                compte.
              </div>
            )}
          </>
        ) : (
          <form
            autoComplete="on"
            id={PROFILE_FORM_ID}
            className="border-sidebar-border/60 bg-background/45 rounded-lg border"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSaveProfile();
            }}
          >
            <div className="space-y-4 p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-firstName" required>
                    Prénom
                  </Label>
                  <Input
                    autoComplete="given-name"
                    id="edit-firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={isSaving}
                    placeholder="Votre prénom"
                    name="firstName"
                    required
                    maxLength={PROFILE_FIELD_MAX_LENGTH}
                    aria-invalid={!!firstNameError}
                    aria-describedby={
                      firstNameError ? 'edit-firstName-error' : undefined
                    }
                    autoFocus
                    className="rounded-lg"
                  />
                  {firstNameError && (
                    <p
                      id="edit-firstName-error"
                      className="text-destructive text-xs"
                      role="alert"
                    >
                      {firstNameError}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-lastName" required>
                    Nom
                  </Label>
                  <Input
                    autoComplete="family-name"
                    id="edit-lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={isSaving}
                    placeholder="Votre nom"
                    name="lastName"
                    required
                    maxLength={PROFILE_FIELD_MAX_LENGTH}
                    aria-invalid={!!lastNameError}
                    aria-describedby={
                      lastNameError ? 'edit-lastName-error' : undefined
                    }
                    className="rounded-lg"
                  />
                  {lastNameError && (
                    <p
                      id="edit-lastName-error"
                      className="text-destructive text-xs"
                      role="alert"
                    >
                      {lastNameError}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="profile-login-name-readonly">
                    Identifiant de connexion
                  </Label>
                  <Input
                    autoCapitalize="none"
                    autoComplete="username"
                    id="profile-login-name-readonly"
                    name="username"
                    type="text"
                    value={userData.loginName}
                    disabled
                    className="bg-secondary/50 rounded-lg font-mono"
                  />
                  <p className="text-muted-foreground text-xs">
                    {userData.isProtected
                      ? "L'identifiant racine ne peut pas être modifié depuis l'application."
                      : 'Seul un administrateur habilité peut modifier cet identifiant.'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-contact-email-readonly">
                    Email de contact
                  </Label>
                  <Input
                    autoComplete="email"
                    id="profile-contact-email-readonly"
                    name="email"
                    placeholder="Non renseigné"
                    type="email"
                    value={userData.contactEmail ?? ''}
                    disabled
                    className="bg-secondary/50 rounded-lg"
                  />
                  <p className="text-muted-foreground text-xs">
                    Utilisez l&apos;action dédiée après avoir enregistré le nom
                    et le prénom.
                  </p>
                </div>
              </div>
            </div>
            <div className="border-sidebar-border/60 bg-surface-muted/95 sticky bottom-3 z-20 flex flex-col gap-3 rounded-b-lg border-t p-3 shadow-[var(--shadow-panel)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
              <p className="text-muted-foreground text-xs">
                {hasProfileChanges
                  ? 'Modifications non enregistrées'
                  : 'À jour'}
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  <X className="size-4" />
                  Annuler
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="rounded-lg"
                  disabled={!canSaveProfile}
                >
                  {isSaving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  Enregistrer
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
      <ContactEmailDialog
        contactEmail={userData.contactEmail}
        loginName={userData.loginName}
        onCancel={() => setShowContactEmailDialog(false)}
        onSuccess={onUpdate}
        open={showContactEmailDialog}
      />
    </AccountPanel>
  );
};
