'use client';

import { Loader2, ShieldAlert } from 'lucide-react';
import React, { type FC, useEffect, useRef, useState } from 'react';

import { MfaCodeInput } from '$features/auth/components/MfaCodeInput';
import { type ApiResponse } from '$types/api.types';
import type { UserType } from '$types/auth.types';
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

type AdminMfaResetDialogProps = {
  actorLoginName: string;
  onCancel: () => void;
  onComplete: (user: UserType) => Promise<void> | void;
  open: boolean;
  targetLabel: string;
  targetUserId: string;
};

type AdminMfaResetResponse = {
  user: UserType;
};

export const AdminMfaResetDialog: FC<AdminMfaResetDialogProps> = ({
  actorLoginName,
  onCancel,
  onComplete,
  open,
  targetLabel,
  targetUserId,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [currentTotpCode, setCurrentTotpCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const totpInputRef = useRef<HTMLInputElement>(null);
  const canSubmit =
    currentPassword.length > 0 && /^\d{6}$/.test(currentTotpCode);

  useEffect(() => {
    if (!open) return;

    setCurrentPassword('');
    setCurrentTotpCode('');
    setError(null);
    setIsSubmitting(false);
  }, [open, targetUserId]);

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    if (!canSubmit) return;

    try {
      setIsSubmitting(true);
      setError(null);
      const response = await apiFetch(
        `/api/users/${encodeURIComponent(targetUserId)}/reset-mfa`,
        {
          body: JSON.stringify({ currentPassword, currentTotpCode }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        },
      );
      const data =
        (await response.json()) as ApiResponse<AdminMfaResetResponse>;

      if (!response.ok || !data.success) {
        setError(
          data.success
            ? 'Impossible de réinitialiser la double authentification'
            : data.error.message ||
                'Impossible de réinitialiser la double authentification',
        );
        setCurrentTotpCode('');
        totpInputRef.current?.focus();

        return;
      }

      await onComplete(data.data.user);
    } catch {
      setError('Impossible de réinitialiser la double authentification');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && !isSubmitting) onCancel();
      }}
    >
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto p-0 sm:max-w-lg">
        <div className="h-1 bg-amber-500" />
        <div className="p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ServiceIcon className="bg-amber-500/10 text-amber-400">
                <ShieldAlert className="size-4" />
              </ServiceIcon>
              Réinitialiser la double authentification
            </DialogTitle>
            <DialogDescription>
              L&apos;ancien authentificateur et les codes de secours de{' '}
              <strong>{targetLabel}</strong> seront supprimés. Toutes ses
              sessions seront déconnectées.
            </DialogDescription>
          </DialogHeader>

          <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div
                aria-live="assertive"
                className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border p-3 text-sm"
                role="alert"
              >
                {error}
              </div>
            )}

            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm leading-6 text-amber-100">
              Utilisez cette récupération uniquement si le membre a perdu son
              téléphone et tous ses codes de secours. Il pourra se reconnecter
              avec son mot de passe, puis réactiver cette protection depuis Mon
              compte.
            </div>

            <input
              aria-hidden="true"
              autoComplete="username"
              className="sr-only"
              name="username"
              readOnly
              tabIndex={-1}
              value={actorLoginName}
            />

            <div className="space-y-2">
              <Label htmlFor="admin-mfa-reset-password" required>
                Ton mot de passe superadmin
              </Label>
              <Input
                autoComplete="current-password"
                autoFocus
                disabled={isSubmitting}
                id="admin-mfa-reset-password"
                name="current-password"
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="Confirme ton identité"
                required
                type="password"
                value={currentPassword}
              />
            </div>

            <MfaCodeInput
              disabled={isSubmitting}
              id="admin-mfa-reset-code"
              inputRef={totpInputRef}
              kind="totp"
              onChange={setCurrentTotpCode}
              value={currentTotpCode}
            />

            <div className="flex gap-2">
              <Button
                className="flex-1"
                disabled={isSubmitting}
                onClick={onCancel}
                type="button"
                variant="outline"
              >
                Annuler
              </Button>
              <Button
                className="flex-1 bg-amber-500 text-white hover:bg-amber-500/90"
                disabled={isSubmitting || !canSubmit}
                type="submit"
              >
                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                Réinitialiser
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
