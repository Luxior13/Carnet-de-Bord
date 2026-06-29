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

  const handleSaveProfile = async (): Promise<void> => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('Le prénom et le nom sont requis');

      return;
    }

    try {
      setIsSaving(true);
      const response = await apiFetch('/api/auth/me', {
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      });
      const data = await response.json();

      if (data.success) {
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
            className="border-sidebar-ring/30 bg-sidebar-accent/20 hover:bg-sidebar-accent/32 rounded-lg"
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
              type="button"
              size="sm"
              className="rounded-lg"
              onClick={handleSaveProfile}
              disabled={isSaving || !firstName.trim() || !lastName.trim()}
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
        <div className="border-sidebar-ring/20 flex flex-col gap-4 rounded-lg border bg-[linear-gradient(180deg,rgba(95,132,200,0.16),rgba(34,49,74,0.24))] p-4 sm:flex-row sm:items-center sm:justify-between">
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
          <div className="border-sidebar-border/55 bg-background/35 rounded-lg border px-3 py-2 sm:text-right">
            <p className="text-sidebar-ring/85 text-[11px] font-semibold tracking-[0.12em] uppercase">
              Compte créé
            </p>
            <p className="text-sidebar-foreground text-sm font-medium">
              {formatAccountDate(userData.createdAt)}
            </p>
          </div>
        </div>
        {!isEditing ? (
          <dl className="border-sidebar-border/55 bg-background/28 overflow-hidden rounded-lg border">
            <div className="border-sidebar-border/45 hover:bg-sidebar-accent/[0.06] grid gap-1 border-b px-4 py-3 transition-colors sm:grid-cols-[10rem_1fr]">
              <dt className="text-sidebar-ring/80 text-xs font-semibold tracking-[0.1em] uppercase">
                Prénom
              </dt>
              <dd className="text-sidebar-foreground min-w-0 text-sm font-medium">
                {userData.firstName}
              </dd>
            </div>
            <div className="border-sidebar-border/45 hover:bg-sidebar-accent/[0.06] grid gap-1 border-b px-4 py-3 transition-colors sm:grid-cols-[10rem_1fr]">
              <dt className="text-sidebar-ring/80 text-xs font-semibold tracking-[0.1em] uppercase">
                Nom
              </dt>
              <dd className="text-sidebar-foreground min-w-0 text-sm font-medium">
                {userData.lastName}
              </dd>
            </div>
            <div className="hover:bg-sidebar-accent/[0.06] grid gap-1 px-4 py-3 transition-colors sm:grid-cols-[10rem_1fr]">
              <dt className="text-sidebar-ring/80 text-xs font-semibold tracking-[0.1em] uppercase">
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
          <div className="border-sidebar-ring/20 rounded-lg border bg-[linear-gradient(180deg,rgba(95,132,200,0.1),rgba(13,18,27,0.34))] p-4">
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
                  className="rounded-lg"
                />
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
                  className="rounded-lg"
                />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Label>Email</Label>
              <Input
                value={userData.email}
                disabled
                className="bg-secondary/50 rounded-lg"
              />
              <p className="text-sidebar-foreground/50 text-xs">
                L&apos;adresse email ne peut pas être modifiée.
              </p>
            </div>
          </div>
        )}
      </div>
    </AccountPanel>
  );
};
