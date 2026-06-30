'use client';

import { Check, Edit, Loader2, Mail, User, X } from 'lucide-react';
import React, { type FC, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { UserAvatar } from '$components/users/UserAvatar';
import { getAccessLabel, getRoleColor } from '$constants/permissions.constants';
import { formatAccountDate } from '$features/account/account.utils';
import { AccountPanel } from '$features/account/components/AccountPanel';
import type { UserType } from '$types/auth.types';
import { Badge } from '$ui/badge';
import { Button } from '$ui/button';
import { Input } from '$ui/input';
import { Label } from '$ui/label';
import { apiFetch } from '$utils/api.utils';

type ProfileSectionProps = {
  onUpdate: () => Promise<void>;
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
  const canSaveProfile =
    !isSaving && hasProfileChanges && !firstNameError && !lastNameError;

  const handleSaveProfile = async (): Promise<void> => {
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
        await onUpdate();
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
      description="Identité et adresse de connexion"
      actions={
        !isEditing ? (
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
        ) : (
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
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
              form={PROFILE_FORM_ID}
              size="sm"
              className="rounded-lg"
              disabled={!canSaveProfile}
            >
              {isSaving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              Enregistrer
            </Button>
          </div>
        )
      }
    >
      <div className="space-y-5">
        <div className="border-sidebar-border/60 flex flex-col gap-4 rounded-lg border bg-[rgba(31,41,59,0.34)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <UserAvatar user={userData} className="size-16 rounded-lg" />
            <div className="min-w-0">
              <p className="text-sidebar-foreground truncate text-xl font-semibold tracking-tight">
                {userData.firstName} {userData.lastName}
              </p>
              <p className="text-sidebar-foreground/65 mt-1 flex items-center gap-2 text-sm">
                <Mail className="size-4 shrink-0" />
                <span className="truncate">{userData.email}</span>
              </p>
              <Badge
                variant={getRoleColor(userData.role)}
                className="mt-3 rounded-full"
              >
                {getAccessLabel(userData)}
              </Badge>
            </div>
          </div>
          <div className="border-sidebar-border/60 bg-background/45 rounded-lg border px-3 py-2 sm:text-right">
            <p className="text-sidebar-foreground text-xs font-bold tracking-tight">
              Compte créé
            </p>
            <p className="text-sidebar-foreground/58 text-xs">
              {formatAccountDate(userData.createdAt)}
            </p>
          </div>
        </div>
        {!isEditing ? (
          <dl className="border-sidebar-border/60 bg-background/45 overflow-hidden rounded-lg border">
            <div className="border-sidebar-border/45 hover:bg-sidebar-accent/[0.06] grid gap-1 border-b px-4 py-3 transition-colors sm:grid-cols-[10rem_1fr]">
              <dt className="text-sidebar-foreground text-sm font-bold tracking-tight">
                Prénom
              </dt>
              <dd className="text-sidebar-foreground min-w-0 text-sm font-medium">
                {userData.firstName}
              </dd>
            </div>
            <div className="border-sidebar-border/45 hover:bg-sidebar-accent/[0.06] grid gap-1 border-b px-4 py-3 transition-colors sm:grid-cols-[10rem_1fr]">
              <dt className="text-sidebar-foreground text-sm font-bold tracking-tight">
                Nom
              </dt>
              <dd className="text-sidebar-foreground min-w-0 text-sm font-medium">
                {userData.lastName}
              </dd>
            </div>
            <div className="hover:bg-sidebar-accent/[0.06] grid gap-1 px-4 py-3 transition-colors sm:grid-cols-[10rem_1fr]">
              <dt className="text-sidebar-foreground text-sm font-bold tracking-tight">
                Email
              </dt>
              <dd className="min-w-0">
                <p className="text-sidebar-foreground truncate text-sm font-medium">
                  {userData.email}
                </p>
                <p className="text-sidebar-foreground/50 mt-1 text-xs">
                  L&apos;adresse email ne peut pas être modifiée.
                </p>
              </dd>
            </div>
          </dl>
        ) : (
          <form
            id={PROFILE_FORM_ID}
            className="border-sidebar-border/60 bg-background/45 rounded-lg border p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSaveProfile();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-firstName" required>
                  Prénom
                </Label>
                <Input
                  id="edit-firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={isSaving}
                  placeholder="Votre prénom"
                  name="firstName"
                  autoComplete="given-name"
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
                  id="edit-lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={isSaving}
                  placeholder="Votre nom"
                  name="lastName"
                  autoComplete="family-name"
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
                  >
                    {lastNameError}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Label htmlFor="profile-email-readonly">Email</Label>
              <Input
                id="profile-email-readonly"
                value={userData.email}
                disabled
                className="bg-secondary/50 rounded-lg"
              />
              <p className="text-sidebar-foreground/50 text-xs">
                L&apos;adresse email ne peut pas être modifiée.
              </p>
            </div>
          </form>
        )}
      </div>
    </AccountPanel>
  );
};
