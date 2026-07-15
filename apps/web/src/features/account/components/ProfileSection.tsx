'use client';

import { Edit, Loader2, LockKeyhole, Mail, Save, User, X } from 'lucide-react';
import React, { type FC, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import { AccountPanel } from '$features/account/components/AccountPanel';
import { ContactEmailDialog } from '$features/account/components/ContactEmailDialog';
import type { UserType } from '$types/auth.types';
import { Button } from '$ui/button';
import { Input } from '$ui/input';
import { Label } from '$ui/label';
import { apiFetch } from '$utils/api.utils';

type ProfileSectionProps = {
  onDirtyChange: (isDirty: boolean) => void;
  onUpdate: (updatedUser?: UserType) => Promise<void>;
  userData: UserType;
};

const PROFILE_FIELD_MAX_LENGTH = 50;
const PROFILE_FORM_ID = 'account-profile-form';

export const ProfileSection: FC<ProfileSectionProps> = ({
  onDirtyChange,
  onUpdate,
  userData,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showContactEmailDialog, setShowContactEmailDialog] = useState(false);
  const onDirtyChangeRef = useRef(onDirtyChange);

  useEffect(() => {
    onDirtyChangeRef.current = onDirtyChange;
  }, [onDirtyChange]);

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
  const isProfileDirty = isEditing && hasProfileChanges;
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

  useEffect(() => {
    onDirtyChange(isProfileDirty);
  }, [isProfileDirty, onDirtyChange]);

  useEffect(
    (): (() => void) => () => {
      onDirtyChangeRef.current(false);
    },
    [],
  );

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
      description="Votre identité et votre adresse de contact"
      actions={
        !isEditing &&
        canEditProfile && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-border/70 bg-background/35 hover:bg-accent/20 rounded-lg"
            onClick={() => setIsEditing(true)}
          >
            <Edit className="size-4" />
            Modifier l&apos;identité
          </Button>
        )
      }
    >
      {!isEditing ? (
        <div className="space-y-4">
          <dl className="divide-border/45 divide-y">
            <div className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr]">
              <dt className="text-foreground text-sm font-bold tracking-normal">
                Prénom
              </dt>
              <dd className="text-foreground min-w-0 text-sm font-medium">
                {userData.firstName}
              </dd>
            </div>
            <div className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr]">
              <dt className="text-foreground text-sm font-bold tracking-normal">
                Nom
              </dt>
              <dd className="text-foreground min-w-0 text-sm font-medium">
                {userData.lastName}
              </dd>
            </div>
            <div className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr]">
              <dt className="text-foreground text-sm font-bold tracking-normal">
                Identifiant
              </dt>
              <dd className="min-w-0">
                <p className="text-foreground font-mono text-sm font-medium break-all">
                  {userData.loginName}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {userData.isProtected
                    ? 'Identifiant racine permanent, modifiable uniquement par une procédure de récupération hors ligne.'
                    : 'Distinct de votre adresse email. Seul un administrateur habilité peut le modifier.'}
                </p>
              </dd>
            </div>
            <div className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr]">
              <dt className="text-foreground text-sm font-bold tracking-normal">
                Email de contact
              </dt>
              <dd className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-foreground text-sm font-medium break-all">
                    {userData.contactEmail ?? 'Non renseigné'}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Facultatif, distinct de l&apos;identifiant et jamais utilisé
                    pour vous connecter.
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
                    {userData.contactEmail ? 'Gérer' : 'Ajouter'}
                  </Button>
                )}
              </dd>
            </div>
          </dl>
          {!canEditProfile && (
            <div className="text-muted-foreground border-warning/25 bg-warning/10 flex items-start gap-2 rounded-md border px-3 py-2 text-xs">
              <LockKeyhole className="text-warning mt-0.5 size-3.5 shrink-0" />
              La modification du prénom et du nom est verrouillée sur ce compte.
            </div>
          )}
        </div>
      ) : (
        <form
          autoComplete="on"
          id={PROFILE_FORM_ID}
          className="border-border/60 bg-background/45 rounded-lg border"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSaveProfile();
          }}
        >
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-firstName" required>
                Prénom
              </Label>
              <Input
                autoComplete="given-name"
                id="edit-firstName"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
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
                onChange={(event) => setLastName(event.target.value)}
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
          <div className="border-border/60 bg-surface-muted/70 flex flex-col gap-3 rounded-b-lg border-t p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground text-xs">
              {hasProfileChanges ? 'Modifications non enregistrées' : 'À jour'}
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
