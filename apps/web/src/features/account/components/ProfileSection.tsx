'use client';

import { LockKeyhole, Mail, User } from 'lucide-react';
import React, { type FC, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { SectionActionBar } from '$components/layout/SectionActionBar';
import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import { AccountPanel } from '$features/account/components/AccountPanel';
import { ContactEmailDialog } from '$features/account/components/ContactEmailDialog';
import type { UserType } from '$types/auth.types';
import { Button } from '$ui/button';
import { Input } from '$ui/input';
import { Label } from '$ui/label';
import { Separator } from '$ui/separator';
import { apiFetch } from '$utils/api.utils';

type ProfileSectionProps = {
  onDirtyChange: (isDirty: boolean) => void;
  onUpdate: (updatedUser?: UserType) => Promise<void>;
  userData: UserType;
};

const PROFILE_FIELD_MAX_LENGTH = 50;

export const ProfileSection: FC<ProfileSectionProps> = ({
  onDirtyChange,
  onUpdate,
  userData,
}) => {
  const [firstName, setFirstName] = useState(userData.firstName);
  const [lastName, setLastName] = useState(userData.lastName ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [showContactEmailDialog, setShowContactEmailDialog] = useState(false);
  const onDirtyChangeRef = useRef(onDirtyChange);

  useEffect(() => {
    onDirtyChangeRef.current = onDirtyChange;
  }, [onDirtyChange]);

  useEffect(() => {
    setFirstName(userData.firstName);
    setLastName(userData.lastName ?? '');
  }, [userData]);

  const trimmedFirstName = firstName.trim();
  const trimmedLastName = lastName.trim();
  const firstNameError = !trimmedFirstName
    ? 'Le prénom est requis'
    : trimmedFirstName.length > PROFILE_FIELD_MAX_LENGTH
      ? 'Prénom trop long'
      : null;
  const lastNameError =
    trimmedLastName.length > PROFILE_FIELD_MAX_LENGTH ? 'Nom trop long' : null;
  const hasProfileChanges =
    trimmedFirstName !== userData.firstName ||
    trimmedLastName !== (userData.lastName ?? '');
  const isProfileDirty = hasProfileChanges;
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
    setFirstName(userData.firstName);
    setLastName(userData.lastName ?? '');
  };

  return (
    <>
      <AccountPanel
        icon={<User className="size-4" />}
        title="Profil"
        description="Votre identité et votre adresse de contact"
      >
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void handleSaveProfile();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label
                htmlFor="edit-firstName"
                className="text-muted-foreground text-xs"
                required
              >
                Prénom
              </Label>
              <Input
                id="edit-firstName"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                disabled={!canEditProfile || isSaving}
                placeholder="Votre prénom"
                maxLength={PROFILE_FIELD_MAX_LENGTH}
                aria-invalid={!!firstNameError}
                aria-describedby={
                  firstNameError ? 'edit-firstName-error' : undefined
                }
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
            <div className="space-y-1.5">
              <Label
                htmlFor="edit-lastName"
                className="text-muted-foreground text-xs"
              >
                Nom <span className="font-normal">(facultatif)</span>
              </Label>
              <Input
                id="edit-lastName"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                disabled={!canEditProfile || isSaving}
                placeholder="Votre nom"
                maxLength={PROFILE_FIELD_MAX_LENGTH}
                aria-invalid={!!lastNameError}
                aria-describedby={
                  lastNameError ? 'edit-lastName-error' : undefined
                }
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

          {!canEditProfile && (
            <div className="text-muted-foreground border-warning/25 bg-warning/10 mt-3 flex items-start gap-2 rounded-md border px-3 py-2 text-xs">
              <LockKeyhole className="text-warning mt-0.5 size-3.5 shrink-0" />
              La modification du prénom et du nom est verrouillée sur ce compte.
            </div>
          )}

          <Separator className="my-4" />

          <div className="space-y-3">
            <div className="border-border/60 bg-surface-inset rounded-md border p-3">
              <p className="text-muted-foreground text-xs">Identifiant</p>
              <p className="text-foreground mt-1 font-mono text-sm break-all">
                {userData.loginName}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                {userData.isProtected
                  ? 'Identifiant racine permanent, modifiable uniquement par une procédure de récupération hors ligne.'
                  : 'Distinct de votre adresse email. Seul un administrateur habilité peut le modifier.'}
              </p>
            </div>
            <div className="border-border/60 bg-surface-inset rounded-md border p-3">
              <p className="text-muted-foreground text-xs">Email de contact</p>
              <p className="text-foreground mt-1 text-sm break-all">
                {userData.contactEmail ?? 'Non renseigné'}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Facultatif, distinct de l&apos;identifiant et jamais utilisé
                pour vous connecter.
              </p>
              {canEditContact && (
                <Button
                  className="mt-2"
                  onClick={() => setShowContactEmailDialog(true)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Mail className="size-4" />
                  {userData.contactEmail ? 'Gérer' : 'Ajouter'}
                </Button>
              )}
            </div>
          </div>
        </form>
      </AccountPanel>
      {isProfileDirty && (
        <SectionActionBar
          isSaving={isSaving}
          onCancel={handleCancel}
          onSave={() => void handleSaveProfile()}
        />
      )}
      <ContactEmailDialog
        contactEmail={userData.contactEmail}
        loginName={userData.loginName}
        onCancel={() => setShowContactEmailDialog(false)}
        onSuccess={onUpdate}
        open={showContactEmailDialog}
      />
    </>
  );
};
