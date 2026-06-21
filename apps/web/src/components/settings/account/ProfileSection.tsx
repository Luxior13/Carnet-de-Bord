'use client';

import { Calendar, Check, Clock, Edit, Loader2, Mail, X } from 'lucide-react';
import React, { type FC, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { getAccessLabel, getRoleColor } from '$constants/permissions.constants';
import type { UserType } from '$types/auth.types';
import { Badge } from '$ui/badge';
import { Button } from '$ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '$ui/card';
import { Input } from '$ui/input';
import { Label } from '$ui/label';
import { ServiceIcon } from '$ui/service-icon';
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

  const formatDate = (date: Date | string): string => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <Card className="bg-card">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="bg-primary text-primary-foreground flex size-16 shrink-0 items-center justify-center rounded-lg text-xl font-semibold shadow-sm">
            {userData.firstName.charAt(0)}
            {userData.lastName.charAt(0)}
          </div>
          <div className="min-w-0">
            <CardTitle className="truncate text-xl">
              {userData.firstName} {userData.lastName}
            </CardTitle>
            <CardDescription className="mt-1 flex items-center gap-2">
              <Mail className="size-4 shrink-0" />
              <span className="truncate">{userData.email}</span>
            </CardDescription>
            <Badge variant={getRoleColor(userData.role)} className="mt-3">
              {getAccessLabel(userData)}
            </Badge>
          </div>
        </div>
        {!isEditing && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="w-full sm:w-auto"
          >
            <Edit className="size-4" />
            Modifier
          </Button>
        )}
      </CardHeader>
      {!isEditing ? (
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="bg-popover flex items-center gap-3 rounded-lg border p-4">
            <ServiceIcon>
              <Calendar className="size-5" />
            </ServiceIcon>
            <div>
              <p className="text-muted-foreground text-xs">Compte depuis</p>
              <p className="font-medium">{formatDate(userData.createdAt)}</p>
            </div>
          </div>
          <div className="bg-popover flex items-center gap-3 rounded-lg border p-4">
            <ServiceIcon>
              <Clock className="size-5" />
            </ServiceIcon>
            <div>
              <p className="text-muted-foreground text-xs">
                Dernière connexion
              </p>
              <p className="font-medium">
                {userData.lastLoginAt
                  ? formatDate(userData.lastLoginAt)
                  : 'Jamais'}
              </p>
            </div>
          </div>
        </CardContent>
      ) : (
        <CardContent className="space-y-4">
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
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              value={userData.email}
              disabled
              className="bg-secondary/50"
            />
            <p className="text-muted-foreground text-xs">
              L&apos;adresse email ne peut pas être modifiée.
            </p>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={isSaving}
            >
              <X className="size-4" />
              Annuler
            </Button>
            <Button
              size="sm"
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
        </CardContent>
      )}
    </Card>
  );
};
