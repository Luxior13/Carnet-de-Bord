'use client';

import { AlertTriangle, Loader2 } from 'lucide-react';
import React from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '$ui/alert-dialog';
import { Input } from '$ui/input';
import { Label } from '$ui/label';

// ---------------------------------------------------------------------------
// UserLoginChangeDialog
// ---------------------------------------------------------------------------

type UserLoginChangeDialogProps = {
  loginName: string;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

export const UserLoginChangeDialog: React.FC<UserLoginChangeDialogProps> = ({
  loginName,
  onConfirm,
  onOpenChange,
  open,
}) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent className="overflow-y-auto p-0">
      <div className="p-6">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground flex items-center gap-2">
            <div className="bg-warning/10 flex h-8 w-8 items-center justify-center rounded-lg">
              <AlertTriangle size={16} className="text-warning" />
            </div>
            Modifier l&apos;identifiant de connexion ?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            Toutes les sessions de cet utilisateur seront fermées. Il devra
            ensuite utiliser le nouvel identifiant{' '}
            <strong>{loginName}</strong> pour se reconnecter.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel className="border-border">
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-warning text-warning-foreground hover:bg-warning/90"
            onClick={onConfirm}
          >
            Modifier et déconnecter
          </AlertDialogAction>
        </AlertDialogFooter>
      </div>
    </AlertDialogContent>
  </AlertDialog>
);

// ---------------------------------------------------------------------------
// UserPasswordResetDialog
// ---------------------------------------------------------------------------

type UserPasswordResetDialogProps = {
  isResetting: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

export const UserPasswordResetDialog: React.FC<
  UserPasswordResetDialogProps
> = ({ isResetting, onConfirm, onOpenChange, open }) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent className="overflow-y-auto p-0">
      <div className="p-6">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground flex items-center gap-2">
            <div className="bg-warning/10 flex h-8 w-8 items-center justify-center rounded-lg">
              <AlertTriangle size={16} className="text-warning" />
            </div>
            Réinitialiser le mot de passe ?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            Un nouveau mot de passe temporaire sera généré.
            L&apos;utilisateur devra le changer à sa prochaine connexion.
            Toutes ses sessions actives seront invalidées.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel className="border-border">
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isResetting}
            className="bg-warning text-warning-foreground hover:bg-warning/90"
          >
            {isResetting && (
              <Loader2 size={16} className="mr-2 animate-spin" />
            )}
            Réinitialiser
          </AlertDialogAction>
        </AlertDialogFooter>
      </div>
    </AlertDialogContent>
  </AlertDialog>
);

// ---------------------------------------------------------------------------
// UserRevokeSessionsDialog
// ---------------------------------------------------------------------------

type UserRevokeSessionsDialogProps = {
  isRevoking: boolean;
  onCloseAutoFocus: (event: Event) => void;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

export const UserRevokeSessionsDialog: React.FC<
  UserRevokeSessionsDialogProps
> = ({ isRevoking, onCloseAutoFocus, onConfirm, onOpenChange, open }) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent
      className="overflow-y-auto p-0"
      onCloseAutoFocus={onCloseAutoFocus}
    >
      <div className="p-6">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground flex items-center gap-2">
            <div className="bg-warning/10 flex h-8 w-8 items-center justify-center rounded-lg">
              <AlertTriangle size={16} className="text-warning" />
            </div>
            Révoquer les sessions ?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            Toutes les sessions actives de cet utilisateur seront
            déconnectées. Il devra se reconnecter.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel
            className="border-border"
            disabled={isRevoking}
          >
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
            disabled={isRevoking}
            className="bg-warning text-warning-foreground hover:bg-warning/90"
          >
            {isRevoking && (
              <Loader2 size={16} className="mr-2 animate-spin" />
            )}
            Révoquer
          </AlertDialogAction>
        </AlertDialogFooter>
      </div>
    </AlertDialogContent>
  </AlertDialog>
);

// ---------------------------------------------------------------------------
// UserDeleteDialog
// ---------------------------------------------------------------------------

type UserDeleteDialogProps = {
  confirmation: string;
  firstName: string;
  isDeleting: boolean;
  lastName: string;
  loginName: string;
  onConfirm: () => void;
  onConfirmationChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

export const UserDeleteDialog: React.FC<UserDeleteDialogProps> = ({
  confirmation,
  firstName,
  isDeleting,
  lastName,
  loginName,
  onConfirm,
  onConfirmationChange,
  onOpenChange,
  open,
}) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent className="overflow-y-auto p-0">
      <div className="p-6">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground flex items-center gap-2">
            <div className="bg-destructive/10 flex h-8 w-8 items-center justify-center rounded-lg">
              <AlertTriangle size={16} className="text-destructive" />
            </div>
            Supprimer définitivement cet utilisateur ?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            Le compte de{' '}
            <strong>
              {firstName} {lastName}
            </strong>{' '}
            sera supprimé de manière irréversible et ne pourra pas être
            restauré. Son profil sera anonymisé et ses secrets
            d&apos;authentification supprimés. Les traces indispensables au
            journal d&apos;audit et la réservation de son identifiant seront
            conservées.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="mt-4 space-y-2">
          <Label htmlFor="delete-user-confirmation">
            Pour confirmer, saisissez <strong>{loginName}</strong>
          </Label>
          <Input
            autoComplete="off"
            id="delete-user-confirmation"
            disabled={isDeleting}
            onChange={(event) => onConfirmationChange(event.target.value)}
            placeholder={loginName}
            value={confirmation}
          />
        </div>
        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel
            className="border-border"
            disabled={isDeleting}
          >
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
            disabled={isDeleting || confirmation.trim() !== loginName}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting && (
              <Loader2 size={16} className="mr-2 animate-spin" />
            )}
            Supprimer définitivement
          </AlertDialogAction>
        </AlertDialogFooter>
      </div>
    </AlertDialogContent>
  </AlertDialog>
);
