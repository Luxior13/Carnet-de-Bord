'use client';

import { ShieldAlert } from 'lucide-react';
import React, { type FC, useEffect, useRef, useState } from 'react';

import { MfaCodeInput } from '$features/auth/components/MfaCodeInput';
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
import { ApiClientError, apiFetchJson } from '$utils/api.utils';

type AdminMfaResetDialogProps = {
  actorLoginName: string;
  onCancel: () => void;
  onCheck: () => Promise<UserType | null>;
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
  onCheck,
  onComplete,
  open,
  targetLabel,
  targetUserId,
}) => {
  const mountedRef = useRef(false);
  const activeRequestRef = useRef<AbortController | null>(null);
  useEffect(() => {
    mountedRef.current = true;

    return (): void => {
      mountedRef.current = false;
      activeRequestRef.current?.abort();
    };
  }, []);
  const [currentPassword, setCurrentPassword] = useState('');
  const [currentTotpCode, setCurrentTotpCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [outcomeUnknown, setOutcomeUnknown] = useState(false);
  const submissionInFlightRef = useRef(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const totpInputRef = useRef<HTMLInputElement>(null);
  const canSubmit =
    currentPassword.length > 0 && /^\d{6}$/.test(currentTotpCode);

  useEffect(() => {
    if (!open) return;

    setCurrentPassword('');
    setCurrentTotpCode('');
    setError(null);
    setIsSubmitting(false);
    setIsChecking(false);
    setOutcomeUnknown(false);
  }, [open, targetUserId]);

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    if (
      !canSubmit ||
      outcomeUnknown ||
      submissionInFlightRef.current ||
      !mountedRef.current
    )
      return;
    submissionInFlightRef.current = true;
    const request = new AbortController();
    activeRequestRef.current = request;
    const timeout = setTimeout(() => request.abort(), 30_000);

    try {
      setIsSubmitting(true);
      setError(null);
      const data = await apiFetchJson<AdminMfaResetResponse>(
        `/api/users/${encodeURIComponent(targetUserId)}/reset-mfa`,
        {
          body: JSON.stringify({ currentPassword, currentTotpCode }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
          signal: request.signal,
        },
      );
      if (!mountedRef.current) return;
      if (data.user?.id !== targetUserId || data.user.mfaEnabledAt !== null)
        throw new Error('Incomplete MFA reset response');
      await onComplete(data.user);
    } catch (failure) {
      if (!mountedRef.current) return;
      const uncertain =
        !(failure instanceof ApiClientError) ||
        failure.status >= 500 ||
        failure.code === 'INVALID_RESPONSE';
      setOutcomeUnknown(uncertain);
      setCurrentTotpCode('');
      if (uncertain) setCurrentPassword('');
      setError(
        uncertain
          ? 'La réponse du serveur n’a pas pu être confirmée. La double authentification a peut-être été réinitialisée et les sessions fermées. Vérifiez l’état du compte avant de recommencer.'
          : failure.message,
      );
      requestAnimationFrame(() =>
        (uncertain ? feedbackRef.current : totpInputRef.current)?.focus(),
      );
    } finally {
      clearTimeout(timeout);
      activeRequestRef.current = null;
      submissionInFlightRef.current = false;
      if (mountedRef.current) setIsSubmitting(false);
    }
  };
  const checkOutcome = async (): Promise<void> => {
    if (submissionInFlightRef.current || !mountedRef.current) return;
    submissionInFlightRef.current = true;
    setIsChecking(true);
    try {
      const user = await onCheck();
      if (!mountedRef.current) return;
      if (
        !user ||
        user.id !== targetUserId ||
        user.securityDetailsVisible === false ||
        user.mfaEnabledAt === undefined
      )
        throw new Error('MFA state unavailable');
      if (user.mfaEnabledAt === null) {
        await onComplete(user);

        return;
      }
      setOutcomeUnknown(false);
      setError(
        'La double authentification est encore active. Vous pouvez confirmer une nouvelle tentative avec votre mot de passe et un nouveau code.',
      );
      requestAnimationFrame(() => passwordInputRef.current?.focus());
    } catch {
      if (!mountedRef.current) return;
      setError(
        'Vérification impossible. Le résultat reste incertain : vérifiez l’état du compte avant toute nouvelle réinitialisation.',
      );
      requestAnimationFrame(() => feedbackRef.current?.focus());
    } finally {
      submissionInFlightRef.current = false;
      if (mountedRef.current) setIsChecking(false);
    }
  };
  const busy = isSubmitting || isChecking;

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && !submissionInFlightRef.current) onCancel();
      }}
    >
      <DialogContent
        aria-busy={busy || undefined}
        className="p-0 sm:max-w-lg"
        onCloseAutoFocus={(event) => {
          const target =
            document.getElementById('user-reset-mfa') ??
            document.getElementById('user-security-mfa-heading');
          if (target) {
            event.preventDefault();
            target.focus();
          }
        }}
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
                ref={feedbackRef}
                tabIndex={-1}
                aria-live="assertive"
                className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border p-3 text-sm"
                role="alert"
              >
                {error}
                {outcomeUnknown && (
                  <Button
                    className="mt-3"
                    loading={isChecking}
                    onClick={() => void checkOutcome()}
                    type="button"
                    variant="outline"
                  >
                    {isChecking ? 'Vérification…' : 'Vérifier l’état du compte'}
                  </Button>
                )}
              </div>
            )}

            <div className="border-warning/30 bg-warning/10 text-warning rounded-md border p-3 text-sm leading-6">
              Utilisez cette récupération uniquement si l’utilisateur a perdu
              son téléphone et tous ses codes de secours. À sa prochaine
              connexion, il devra configurer un nouvel authentificateur avant de
              pouvoir accéder au site.
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-mfa-reset-password" required>
                Votre mot de passe
              </Label>
              <Input
                autoFocus
                disabled={busy || outcomeUnknown}
                id="admin-mfa-reset-password"
                name="current-password"
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="Confirmez votre identité"
                required
                ref={passwordInputRef}
                autoComplete="current-password"
                type="password"
                value={currentPassword}
              />
            </div>

            <MfaCodeInput
              disabled={busy || outcomeUnknown}
              id="admin-mfa-reset-code"
              inputRef={totpInputRef}
              kind="totp"
              onChange={setCurrentTotpCode}
              value={currentTotpCode}
            />

            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button
                className="flex-1"
                disabled={busy}
                onClick={onCancel}
                type="button"
                variant="outline"
              >
                {outcomeUnknown ? 'Fermer' : 'Annuler'}
              </Button>
              <Button
                className="bg-warning text-warning-foreground hover:bg-warning/90 flex-1"
                disabled={!canSubmit || outcomeUnknown || isChecking}
                loading={isSubmitting}
                type="submit"
              >
                {isSubmitting ? 'Réinitialisation…' : 'Réinitialiser'}
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
