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

const AdminMfaResetDialogContent: FC<AdminMfaResetDialogProps> = ({
  onCancel,
  onComplete,
  open,
  targetLabel,
  targetUserId,
}) => {
  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;

    return (): void => {
      mountedRef.current = false;
    };
  }, []);
  const [currentPassword, setCurrentPassword] = useState('');
  const [currentTotpCode, setCurrentTotpCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionInFlightRef = useRef(false);
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
    if (!canSubmit || submissionInFlightRef.current || !mountedRef.current)
      return;
    submissionInFlightRef.current = true;

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

      if (!mountedRef.current) return;
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
      if (!mountedRef.current) return;
      setError('Impossible de réinitialiser la double authentification');
    } finally {
      submissionInFlightRef.current = false;
      if (mountedRef.current) setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && !submissionInFlightRef.current) onCancel();
      }}
    >
      <DialogContent
        aria-busy={isSubmitting || undefined}
        className="p-0 sm:max-w-lg"
      >
        <div className="bg-warning h-1" />
        <div className="p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ServiceIcon className="bg-warning/10 text-warning">
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

          <form
            autoComplete="off"
            className="mt-4 space-y-4"
            onSubmit={handleSubmit}
          >
            {error && (
              <div
                aria-live="assertive"
                className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border p-3 text-sm"
                role="alert"
              >
                {error}
              </div>
            )}

            <div className="border-warning/30 bg-warning/10 text-warning rounded-md border p-3 text-sm leading-6">
              Utilisez cette récupération uniquement si le membre a perdu son
              téléphone et tous ses codes de secours. À sa prochaine connexion,
              il devra configurer un nouvel authentificateur avant de pouvoir
              accéder au site.
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-mfa-reset-password" required>
                Votre mot de passe superadmin
              </Label>
              <Input
                autoFocus
                disabled={isSubmitting}
                id="admin-mfa-reset-password"
                name="current-password"
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="Confirmez votre identité"
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

            <div className="flex flex-col-reverse gap-2 sm:flex-row">
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
                className="bg-warning text-warning-foreground hover:bg-warning/90 flex-1"
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

export const AdminMfaResetDialog: FC<AdminMfaResetDialogProps> = (props) =>
  props.open ? (
    <AdminMfaResetDialogContent
      key={`${props.actorLoginName}:${props.targetUserId}`}
      {...props}
    />
  ) : null;
