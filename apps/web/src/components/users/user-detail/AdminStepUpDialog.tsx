'use client';

import { Loader2, ShieldCheck } from 'lucide-react';
import React, { type FC, useEffect, useRef, useState } from 'react';

import { MfaCodeInput } from '$features/auth/components/MfaCodeInput';
import { type ApiResponse, ErrorCode } from '$types/api.types';
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
  onComplete: (result: AdminStepUpResult) => Promise<void> | void;
  onProofKindRequired?: (proofKind: AdminStepUpKind) => void;
  open: boolean;
  proofKind?: AdminStepUpKind;
  title: string;
};

export type AdminStepUpKind = 'critical-mfa' | 'full' | 'password';

export type AdminStepUpResult = {
  criticalMfaExpiresAt: string | null;
  expiresAt: string;
  kind: AdminStepUpKind;
  passwordExpiresAt: string | null;
};

export const AdminStepUpDialog: FC<AdminStepUpDialogProps> = ({
  actorLoginName,
  description,
  onCancel,
  onComplete,
  onProofKindRequired,
  open,
  proofKind = 'full',
  title,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [currentTotpCode, setCurrentTotpCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const submissionInFlightRef = useRef(false);
  const totpInputRef = useRef<HTMLInputElement>(null);
  const requiresPassword = proofKind !== 'critical-mfa';
  const requiresTotp = proofKind !== 'password';
  const canSubmit =
    (!requiresPassword || currentPassword.length > 0) &&
    (!requiresTotp || /^\d{6}$/.test(currentTotpCode));

  useEffect(() => {
    if (!open) {
      submissionInFlightRef.current = false;

      return;
    }

    setCurrentPassword('');
    setCurrentTotpCode('');
    setError(null);
    setIsSubmitting(false);
  }, [open, title]);

  useEffect(() => {
    if (!open) return;

    if (requiresPassword) {
      passwordInputRef.current?.focus();
    } else {
      totpInputRef.current?.focus();
    }
  }, [open, proofKind, requiresPassword]);

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    if (!canSubmit || submissionInFlightRef.current) return;

    submissionInFlightRef.current = true;
    try {
      setIsSubmitting(true);
      setError(null);
      const response = await apiFetch('/api/auth/step-up', {
        body: JSON.stringify(
          proofKind === 'password'
            ? { currentPassword, kind: proofKind }
            : proofKind === 'critical-mfa'
              ? { currentTotpCode, kind: proofKind }
              : { currentPassword, currentTotpCode, kind: proofKind },
        ),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const data = (await response.json()) as ApiResponse<AdminStepUpResult>;

      if (!response.ok || !data.success) {
        const errorCode = data.success ? null : data.error.code;
        const errorMessage = data.success
          ? 'Impossible de confirmer votre identité'
          : data.error.message || 'Impossible de confirmer votre identité';

        if (
          proofKind === 'critical-mfa' &&
          errorCode === ErrorCode.PASSWORD_REAUTHENTICATION_REQUIRED
        ) {
          setCurrentPassword('');
          setCurrentTotpCode('');
          setError(
            'La confirmation du mot de passe a expiré. Confirmez à nouveau votre mot de passe et votre code MFA.',
          );
          onProofKindRequired?.('full');

          return;
        }

        setError(errorMessage);
        const passwordFailed =
          requiresPassword &&
          (!requiresTotp ||
            errorMessage.toLowerCase().includes('mot de passe'));

        if (passwordFailed) {
          passwordInputRef.current?.focus();
          passwordInputRef.current?.select();
        } else if (requiresTotp) {
          setCurrentTotpCode('');
          totpInputRef.current?.focus();
        } else {
          passwordInputRef.current?.focus();
          passwordInputRef.current?.select();
        }

        return;
      }

      await onComplete(data.data);
    } catch {
      setError('Impossible de confirmer votre identité');
    } finally {
      submissionInFlightRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && !submissionInFlightRef.current) onCancel();
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
              {proofKind === 'password'
                ? 'La confirmation de votre mot de passe restera valable pendant trente minutes sur cette session.'
                : proofKind === 'critical-mfa'
                  ? 'Cette confirmation MFA restera valable quinze minutes pour les autres élévations critiques.'
                  : 'Cette confirmation protège l’action sensible ; le mot de passe restera reconnu pendant trente minutes.'}
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

            {requiresPassword && (
              <div className="space-y-2">
                <Label htmlFor="admin-step-up-password" required>
                  Votre mot de passe
                </Label>
                <Input
                  allowPasswordManager
                  autoComplete="current-password"
                  autoFocus
                  disabled={isSubmitting}
                  id="admin-step-up-password"
                  name="current-password"
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  ref={passwordInputRef}
                  required
                  type="password"
                  value={currentPassword}
                />
              </div>
            )}

            {requiresTotp && (
              <MfaCodeInput
                autoFocus={!requiresPassword}
                disabled={isSubmitting}
                id="admin-step-up-code"
                inputRef={totpInputRef}
                kind="totp"
                onChange={setCurrentTotpCode}
                value={currentTotpCode}
              />
            )}

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
                {proofKind === 'password'
                  ? 'Confirmer'
                  : 'Confirmer et continuer'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
