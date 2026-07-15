'use client';

import { Loader2, ShieldCheck } from 'lucide-react';
import React, { type FC, useEffect, useRef, useState } from 'react';

import { MfaCodeInput } from '$features/auth/components/MfaCodeInput';
import { type ApiResponse } from '$types/api.types';
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

type AdminStepUpDialogProps = {
  actorLoginName: string;
  description: string;
  onCancel: () => void;
  onComplete: () => Promise<void> | void;
  open: boolean;
  title: string;
};

type StepUpResponse = {
  expiresAt: string;
};

export const AdminStepUpDialog: FC<AdminStepUpDialogProps> = ({
  actorLoginName,
  description,
  onCancel,
  onComplete,
  open,
  title,
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
  }, [open, title]);

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    if (!canSubmit) return;

    try {
      setIsSubmitting(true);
      setError(null);
      const response = await apiFetch('/api/auth/step-up', {
        body: JSON.stringify({ currentPassword, currentTotpCode }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const data = (await response.json()) as ApiResponse<StepUpResponse>;

      if (!response.ok || !data.success) {
        setError(
          data.success
            ? 'Impossible de confirmer votre identité'
            : data.error.message || 'Impossible de confirmer votre identité',
        );
        setCurrentTotpCode('');
        totpInputRef.current?.focus();

        return;
      }

      await onComplete();
    } catch {
      setError('Impossible de confirmer votre identité');
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
        <div className="bg-primary h-1" />
        <div className="p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ServiceIcon className="bg-primary/10 text-primary-emphasis">
                <ShieldCheck className="size-4" />
              </ServiceIcon>
              {title}
            </DialogTitle>
            <DialogDescription>{description}</DialogDescription>
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

            <p className="border-primary/25 bg-primary/[0.08] text-muted-foreground rounded-md border p-3 text-sm leading-6">
              Cette preuve reste valable cinq minutes pour les autres actions
              administratives sensibles de cette session.
            </p>

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
              <Label htmlFor="admin-step-up-password" required>
                Votre mot de passe
              </Label>
              <Input
                autoComplete="current-password"
                autoFocus
                disabled={isSubmitting}
                id="admin-step-up-password"
                name="current-password"
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
                type="password"
                value={currentPassword}
              />
            </div>

            <MfaCodeInput
              disabled={isSubmitting}
              id="admin-step-up-code"
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
                className="flex-1"
                disabled={isSubmitting || !canSubmit}
                type="submit"
              >
                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                Confirmer et continuer
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
