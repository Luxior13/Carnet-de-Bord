'use client';

import { Loader2, Power, RotateCcw, Save, ShieldCheck } from 'lucide-react';
import React, { type FC } from 'react';

import type { UserType } from '$types/auth.types';
import { Badge } from '$ui/badge';
import { Button } from '$ui/button';
import { Label } from '$ui/label';
import { Separator } from '$ui/separator';
import { Switch } from '$ui/switch';

type UserSecurityTabProps = {
  canEditStatus: boolean;
  canResetPassword: boolean;
  currentUserId: string | undefined;
  isActive: boolean;
  isSaving: boolean;
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
  canEditStatus,
  canResetPassword,
  currentUserId,
  isActive,
  isSaving,
  onResetPassword,
  onSaveStatus,
  setIsActive,
  tempPassword,
  user,
}) => {
  const isSelf = currentUserId === user.id;

  return (
    <div className="space-y-6">
      {tempPassword && (
        <section className="overflow-hidden rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 shadow-sm">
          <p className="mb-2 font-medium text-emerald-400">
            Nouveau mot de passe temporaire
          </p>
          <code className="bg-card text-foreground block rounded-md border px-3 py-2 font-mono text-sm">
            {tempPassword}
          </code>
          <p className="text-muted-foreground mt-2 text-xs">
            Communiquez ce mot de passe a l&apos;utilisateur.
          </p>
        </section>
      )}
      <section className="border-border bg-card/70 rounded-lg border p-4 shadow-sm">
        <div className="space-y-4">
          <h3 className="text-foreground flex items-center gap-2 text-sm font-medium">
            <span className="bg-primary/20 text-primary flex h-6 w-6 items-center justify-center rounded-md">
              <Power className="h-3.5 w-3.5" />
            </span>
            Etat du compte
          </h3>
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
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={onSaveStatus}
              disabled={isSaving || !canEditStatus || isSelf}
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
        </div>
      </section>
      <section className="border-border bg-card/70 rounded-lg border p-4 shadow-sm">
        <div className="space-y-4">
          <h3 className="text-foreground flex items-center gap-2 text-sm font-medium">
            <span className="bg-primary/20 text-primary flex h-6 w-6 items-center justify-center rounded-md">
              <ShieldCheck className="h-3.5 w-3.5" />
            </span>
            Mot de passe
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground text-sm">Etat</span>
              {user.mustChangePassword ? (
                <Badge
                  variant="outline"
                  className="border-amber-500 text-amber-500"
                >
                  A changer
                </Badge>
              ) : (
                <Badge variant="secondary">A jour</Badge>
              )}
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground text-sm">
                Dernier changement
              </span>
              <span className="text-sm">
                {formatDate(user.passwordChangedAt)}
              </span>
            </div>
            {canResetPassword && (
              <>
                <Separator />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onResetPassword}
                    className="gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset mot de passe
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
