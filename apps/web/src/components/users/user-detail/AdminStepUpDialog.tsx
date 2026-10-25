'use client';

import { Loader2, ShieldCheck } from 'lucide-react';
import React, { type FC, useEffect, useRef, useState } from 'react';

import { MfaCodeInput } from '$features/auth/components/MfaCodeInput';
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
import { ApiClientError } from '$utils/api.utils';
import { securityRequest } from '$utils/security-request.utils';

type AdminStepUpDialogProps = {
  actorLoginName: string;
  description: string;
  onCancel: () => void;
  onCloseAutoFocus?: React.ComponentProps<
    typeof DialogContent
  >['onCloseAutoFocus'];
  onComplete: (result: AdminStepUpResult) => Promise<void> | void;
  open: boolean;
  proofKind?: AdminStepUpKind;
  title: string;
};

export type AdminStepUpKind = 'full' | 'password';

export type AdminStepUpResult = {
  expiresAt: string;
  kind: AdminStepUpKind;
};

const AdminStepUpDialogContent: FC<AdminStepUpDialogProps> = ({
  description,
  onCancel,
  onCloseAutoFocus,
  onComplete,
  open,
  proofKind = 'full',
  title,
}) => {
  const mountedRef = useRef(false);
  const lifetimeRef = useRef<AbortController | null>(null);
  useEffect(() => {
    mountedRef.current = true;
    const controller = new AbortController();
    lifetimeRef.current = controller;

    return (): void => {
      mountedRef.current = false;
      controller.abort();
    };
  }, []);
  const [currentPassword, setCurrentPassword] = useState('');
  const [currentTotpCode, setCurrentTotpCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const submissionInFlightRef = useRef(false);
  const totpInputRef = useRef<HTMLInputElement>(null);
  const requiresTotp = proofKind === 'full';
  const canSubmit =
    currentPassword.length > 0 &&
    (!requiresTotp || /^\d{6}$/.test(currentTotpCode));
  const focusProofAfterSubmit = (kind: 'password' | 'totp'): void => {
    requestAnimationFrame(() => {
      if (!mountedRef.current) return;
      const input =
        kind === 'password' ? passwordInputRef.current : totpInputRef.current;
      input?.focus();
      if (kind === 'password') input?.select();
    });
  };

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
    if (open) passwordInputRef.current?.focus();
  }, [open, proofKind]);

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
      const lifetime = lifetimeRef.current;
      if (!lifetime || lifetime.signal.aborted) return;
      const data = await securityRequest<AdminStepUpResult>(
        '/api/auth/step-up',
        lifetime.signal,
        {
          body: JSON.stringify(
            proofKind === 'password'
              ? { currentPassword, kind: proofKind }
              : { currentPassword, currentTotpCode, kind: proofKind },
          ),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        },
      );
      if (!mountedRef.current) return;
      await onComplete(data);
    } catch (failure) {
      if (!mountedRef.current) return;
      if (
        failure instanceof ApiClientError &&
        failure.status < 500 &&
        failure.code !== 'INVALID_RESPONSE'
      ) {
        const errorMessage = failure.message;

        setError(errorMessage);
        const passwordFailed =
          !requiresTotp || errorMessage.toLowerCase().includes('mot de passe');

        if (passwordFailed) {
          focusProofAfterSubmit('password');
        } else {
          setCurrentTotpCode('');
          focusProofAfterSubmit('totp');
        }

        return;
      }

      setCurrentPassword('');
      setCurrentTotpCode('');
      setError(
        'La confirmation n’a pas pu être reçue. Saisissez une nouvelle preuve ou annulez.',
      );
      focusProofAfterSubmit('password');
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
        onCloseAutoFocus={onCloseAutoFocus}
      >
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

            <p className="border-primary/25 bg-primary/[0.08] text-muted-foreground rounded-md border p-3 text-sm leading-6">
              {proofKind === 'password'
                ? 'La confirmation de votre mot de passe restera valable pendant trente minutes sur cette session.'
                : 'Cette confirmation protège l’action sensible ; le mot de passe restera reconnu pendant trente minutes.'}
            </p>

            <div className="space-y-2">
              <Label htmlFor="admin-step-up-password" required>
                Votre mot de passe
              </Label>
              <Input
                autoFocus
                disabled={isSubmitting}
                id="admin-step-up-password"
                name="current-password"
                onChange={(event) => setCurrentPassword(event.target.value)}
                ref={passwordInputRef}
                required
                autoComplete="current-password"
                type="password"
                value={currentPassword}
              />
            </div>

            {requiresTotp && (
              <MfaCodeInput
                disabled={isSubmitting}
                id="admin-step-up-code"
                inputRef={totpInputRef}
                kind="totp"
                onChange={setCurrentTotpCode}
                value={currentTotpCode}
              />
            )}

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

export const AdminStepUpDialog: FC<AdminStepUpDialogProps> = (props) =>
  props.open ? (
    <AdminStepUpDialogContent
      key={`${props.actorLoginName}:${props.title}`}
      {...props}
    />
  ) : null;
