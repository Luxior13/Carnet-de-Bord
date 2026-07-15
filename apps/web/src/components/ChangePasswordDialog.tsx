'use client';

import { KeyRound, Loader2 } from 'lucide-react';
import React, { type FC, useEffect, useMemo, useState } from 'react';

import { Button } from '$ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '$ui/dialog';
import { Input } from '$ui/input';
import { Label } from '$ui/label';
import { ServiceIcon } from '$ui/service-icon';
import { apiFetch } from '$utils/api.utils';
import { cn } from '$utils/css.utils';
import {
  getPasswordStrengthColor,
  getPasswordStrengthLabel,
  validatePassword,
} from '$utils/password.utils';

type ChangePasswordDialogProps = {
  onCancel?: () => void;
  onSuccess: () => void;
  open: boolean;
};

export const ChangePasswordDialog: FC<ChangePasswordDialogProps> = ({
  onCancel,
  onSuccess,
  open,
}) => {
  const canCancel = !!onCancel;
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const passwordValidation = useMemo(
    () => validatePassword(newPassword),
    [newPassword],
  );
  const isConfirmMismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;
  const canSubmit =
    (!canCancel || currentPassword.length > 0) &&
    passwordValidation.isValid &&
    confirmPassword.length > 0 &&
    !isConfirmMismatch;

  const strengthLabel = getPasswordStrengthLabel(passwordValidation.score);
  const strengthColor = getPasswordStrengthColor(passwordValidation.score);

  useEffect(() => {
    if (!open) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError(null);
      setIsLoading(false);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);

    if (canCancel && !currentPassword) {
      setError('Le mot de passe actuel est requis');

      return;
    }

    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors[0] ?? 'Mot de passe invalide');

      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');

      return;
    }

    setIsLoading(true);

    try {
      const response = await apiFetch('/api/auth/change-password', {
        body: JSON.stringify({
          confirmPassword,
          currentPassword: canCancel ? currentPassword : undefined,
          newPassword,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error?.message || 'Une erreur est survenue');

        return;
      }

      onSuccess();
    } catch {
      setError('Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => !isOpen && canCancel && onCancel()}
    >
      <DialogContent
        className="overflow-hidden p-0 sm:max-w-md"
        hideCloseButton={!canCancel}
      >
        <div className="p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ServiceIcon className="bg-warning/10 text-warning">
                <KeyRound className="size-4" />
              </ServiceIcon>
              {canCancel
                ? 'Changer le mot de passe'
                : 'Changement de mot de passe requis'}
            </DialogTitle>
            <DialogDescription>
              {canCancel
                ? 'Entrez votre mot de passe actuel puis choisissez un nouveau mot de passe.'
                : 'Pour des raisons de sécurité, vous devez changer votre mot de passe temporaire avant de continuer.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {error && (
              <div
                className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border p-3 text-sm"
                role="alert"
              >
                {error}
              </div>
            )}
            {canCancel && (
              <div className="space-y-2">
                <Label htmlFor="currentPassword" required>
                  Mot de passe actuel
                </Label>
                <Input
                  autoComplete="current-password"
                  id="currentPassword"
                  name="current-password"
                  required
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Votre mot de passe actuel"
                  disabled={isLoading}
                  autoFocus
                  aria-invalid={canCancel && !currentPassword && !!error}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="newPassword" required>
                Nouveau mot de passe
              </Label>
              <Input
                autoComplete="new-password"
                id="newPassword"
                name="new-password"
                required
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 caractères"
                disabled={isLoading}
                autoFocus={!canCancel}
                aria-describedby={
                  newPassword.length > 0 ? 'password-strength' : undefined
                }
                aria-invalid={
                  newPassword.length > 0 && !passwordValidation.isValid
                }
              />
              {newPassword.length > 0 && (
                <div
                  className="space-y-1.5"
                  id="password-strength"
                  role="status"
                  aria-live="polite"
                >
                  <div
                    className="flex gap-1"
                    role="progressbar"
                    aria-valuenow={passwordValidation.score}
                    aria-valuemin={0}
                    aria-valuemax={4}
                    aria-label={`Force du mot de passe: ${strengthLabel}`}
                  >
                    {[1, 2, 3, 4].map((bar) => (
                      <div
                        key={bar}
                        className={cn(
                          'h-1.5 flex-1 rounded-full transition-all duration-300',
                          bar <= passwordValidation.score
                            ? strengthColor
                            : 'bg-secondary',
                        )}
                      />
                    ))}
                  </div>
                  <p
                    className={cn(
                      'text-xs font-medium',
                      passwordValidation.score <= 1 && 'text-destructive',
                      passwordValidation.score === 2 && 'text-warning',
                      passwordValidation.score === 3 && 'text-warning',
                      passwordValidation.score === 4 && 'text-success',
                    )}
                  >
                    Force du mot de passe : {strengthLabel}
                  </p>
                  {passwordValidation.errors.length > 0 && (
                    <ul className="text-destructive list-inside list-disc space-y-0.5 text-xs">
                      {passwordValidation.errors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  )}
                  <p className="text-muted-foreground text-xs">
                    Utilisez au moins 8 caractères avec majuscules, minuscules,
                    chiffres. Les caractères spéciaux améliorent la sécurité.
                  </p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" required>
                Confirmer le mot de passe
              </Label>
              <Input
                autoComplete="new-password"
                id="confirmPassword"
                name="confirm-password"
                required
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirmez votre mot de passe"
                disabled={isLoading}
                aria-invalid={isConfirmMismatch}
                aria-describedby={
                  isConfirmMismatch ? 'confirmPassword-error' : undefined
                }
              />
              {isConfirmMismatch && (
                <p
                  id="confirmPassword-error"
                  className="text-destructive text-xs"
                  role="alert"
                >
                  Les mots de passe ne correspondent pas
                </p>
              )}
            </div>
            <div className={canCancel ? 'flex gap-2' : ''}>
              {canCancel && (
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={onCancel}
                  disabled={isLoading}
                >
                  Annuler
                </Button>
              )}
              <Button
                type="submit"
                className={cn(canCancel ? 'flex-1' : 'w-full')}
                disabled={isLoading || !canSubmit}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Changement en cours...
                  </>
                ) : (
                  'Changer le mot de passe'
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
