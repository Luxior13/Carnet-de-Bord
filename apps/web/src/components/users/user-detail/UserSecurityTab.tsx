'use client';

import { Loader2, Power, RotateCcw, Save, ShieldCheck } from 'lucide-react';
import React, { type FC } from 'react';

import type { UserType } from '$types/auth.types';
import { Badge } from '$ui/badge';
import { Button } from '$ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '$ui/card';
import { Label } from '$ui/label';
import { Separator } from '$ui/separator';
import { Switch } from '$ui/switch';

type UserSecurityTabProps = {
  canDeleteUser: boolean;
  canEditStatus: boolean;
  canResetPassword: boolean;
  canSaveStatus: boolean;
  currentUserId: string | undefined;
  hasStatusChanges: boolean;
  isActive: boolean;
  isSaving: boolean;
  onCancelStatus: () => void;
  onDeleteUser: () => void;
  onResetPassword: () => void;
  onSaveStatus: () => void;
  setIsActive: (isActive: boolean) => void;
  tempPassword: string | null;
  user: UserType;
};

const formatDate = (date: Date | string | null): string => {
  if (!date) return 'Jamais';

  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

export const UserSecurityTab: FC<UserSecurityTabProps> = ({
  canDeleteUser,
  canEditStatus,
  canResetPassword,
  canSaveStatus,
  currentUserId,
  hasStatusChanges,
  isActive,
  isSaving,
  onCancelStatus,
  onDeleteUser,
  onResetPassword,
  onSaveStatus,
  setIsActive,
  tempPassword,
  user,
}) => {
  const isSelf = currentUserId === user.id;

  return (
    <div className="space-y-3">
      {tempPassword && (
        <Card className="overflow-hidden rounded-lg border-amber-500/25 bg-amber-500/10 py-0">
          <CardHeader className="border-b border-amber-500/20 p-3 sm:p-4">
            <CardTitle className="text-sm text-amber-400">
              Nouveau mot de passe temporaire
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-3 sm:p-4">
            <code className="text-foreground block rounded-md border bg-[#12171E] px-3 py-2 font-mono text-sm">
              {tempPassword}
            </code>
            <p className="text-muted-foreground text-xs">
              Communiquez ce mot de passe a l&apos;utilisateur.
            </p>
          </CardContent>
        </Card>
      )}
      <Card className="border-border/70 overflow-hidden rounded-lg bg-[#192132] py-0">
        <CardHeader className="border-border/60 border-b bg-[#212A3A] p-3 sm:p-4">
          <CardTitle className="text-foreground flex items-center gap-2 text-sm font-semibold">
            <span className="bg-primary/10 text-primary flex size-6 items-center justify-center rounded-md">
              <Power className="size-3.5" />
            </span>
            Etat du compte
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-foreground text-sm font-medium">
                Compte actif
              </Label>
              <p className="text-muted-foreground text-xs">
                Les comptes inactifs ne peuvent pas se connecter.
              </p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
              disabled={!canEditStatus || isSelf}
            />
          </div>
        </CardContent>
        <CardFooter className="border-border/60 justify-between gap-3 border-t bg-[#212A3A] p-3 sm:p-4">
          <p className="text-muted-foreground text-xs">
            {hasStatusChanges ? 'Modification non enregistree' : 'A jour'}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancelStatus}
              disabled={!hasStatusChanges || isSaving}
            >
              Annuler
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onSaveStatus}
              disabled={isSaving || !canSaveStatus}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSaving ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1.5 h-4 w-4" />
              )}
              Enregistrer
            </Button>
          </div>
        </CardFooter>
      </Card>
      <Card className="border-border/70 overflow-hidden rounded-lg bg-[#192132] py-0">
        <CardHeader className="border-border/60 border-b bg-[#212A3A] p-3 sm:p-4">
          <CardTitle className="text-foreground flex items-center gap-2 text-sm font-semibold">
            <span className="bg-primary/10 text-primary flex size-6 items-center justify-center rounded-md">
              <ShieldCheck className="size-3.5" />
            </span>
            Mot de passe
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-3 sm:p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground text-sm">Etat</span>
              {user.mustChangePassword ? (
                <Badge
                  variant="outline"
                  className="border-amber-500/40 text-amber-400"
                >
                  A changer
                </Badge>
              ) : (
                <Badge variant="secondary">A jour</Badge>
              )}
            </div>
            <Separator className="bg-border/60" />
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground text-sm">
                Dernier changement
              </span>
              <span className="text-sm">
                {formatDate(user.passwordChangedAt)}
              </span>
            </div>
          </div>
        </CardContent>
        {canResetPassword && (
          <CardFooter className="border-border/60 justify-end border-t bg-[#212A3A] p-3 sm:p-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onResetPassword}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reinitialiser le mot de passe
            </Button>
          </CardFooter>
        )}
      </Card>
      {canDeleteUser && (
        <Card className="border-destructive/30 bg-destructive/5 overflow-hidden rounded-lg py-0">
          <CardHeader className="border-destructive/20 border-b p-3 sm:p-4">
            <CardTitle className="text-destructive text-sm">
              Zone danger
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <div>
              <p className="text-sm font-medium">Supprimer cet utilisateur</p>
              <p className="text-muted-foreground text-xs">
                Cette action est definitive et invalide les sessions associees.
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              onClick={onDeleteUser}
              className="shrink-0"
            >
              Supprimer
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
