'use client';

import { KeyRound, Loader2 } from 'lucide-react';
import React, { type FC, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { type ApiResponse, RoutesApi } from '$types/api.types';
import type {
  MfaRecoveryCodesRegenerationRequest,
  UserType,
} from '$types/auth.types';
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

import { isCompleteMfaCode, MfaCodeInput } from './MfaCodeInput';
import { MfaRecoveryCodesPanel } from './MfaRecoveryCodesPanel';

type MfaActionResponse = {
  recoveryCodes?: string[];
  user?: UserType;
};

type MfaActionDialogProps = {
  onCancel: () => void;
  onComplete: (user?: UserType) => Promise<void> | void;
  open: boolean;
};

export const MfaActionDialog: FC<MfaActionDialogProps> = ({
  onCancel,
  onComplete,
  open,
}) => {
  const submissionRef = useRef(false);
  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;

    return (): void => {
      mountedRef.current = false;
    };
  }, []);
  const [currentPassword, setCurrentPassword] = useState('');
  const [currentCode, setCurrentCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [responseUser, setResponseUser] = useState<UserType | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currentCodeInputRef = useRef<HTMLInputElement>(null);
  const canSubmit =
    currentPassword.length > 0 && isCompleteMfaCode(currentCode, 'totp');

  useEffect(() => {
    if (!open) return;

    setCurrentPassword('');
    setCurrentCode('');
    setRecoveryCodes(null);
    setResponseUser(undefined);
    setError(null);
    setIsSubmitting(false);
  }, [open]);

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    if (submissionRef.current || !mountedRef.current || !canSubmit) return;

    try {
      submissionRef.current = true;
      setIsSubmitting(true);
      setError(null);
      const requestBody: MfaRecoveryCodesRegenerationRequest = {
        currentPassword,
        currentTotpCode: currentCode,
      };
      const response = await apiFetch(RoutesApi.mfaRecoveryCodes, {
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const data = (await response.json()) as ApiResponse<MfaActionResponse>;

      if (!mountedRef.current) return;
      if (!response.ok || !data.success) {
        setError(
          data.success
            ? 'Impossible de confirmer cette action'
            : data.error.message || 'Impossible de confirmer cette action',
        );
        setCurrentCode('');
        currentCodeInputRef.current?.focus();

        return;
      }

      if (!data.data.recoveryCodes?.length) {
        setError('Aucun code de secours n’a été généré');

        return;
      }

      setResponseUser(data.data.user);
      setRecoveryCodes(data.data.recoveryCodes);
    } catch {
      if (!mountedRef.current) return;
      setError('Impossible de confirmer cette action');
    } finally {
      submissionRef.current = false;
      if (mountedRef.current) setIsSubmitting(false);
    }
  };

  const handleRecoveryCodesSaved = async (): Promise<void> => {
    if (submissionRef.current || !mountedRef.current) return;
    try {
      submissionRef.current = true;
      setIsSubmitting(true);
      setError(null);
      await onComplete(responseUser);
      if (!mountedRef.current) return;
      toast.success('Nouveaux codes de secours générés');
      onCancel();
    } catch {
      if (mountedRef.current)
        setError(
          'Impossible de terminer. Vos codes restent affichés ; réessayez.',
        );
    } finally {
      submissionRef.current = false;
      if (mountedRef.current) setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && !submissionRef.current && !recoveryCodes) onCancel();
      }}
    >
      <DialogContent
        className="p-0 sm:max-w-lg"
        hideCloseButton={!!recoveryCodes}
      >
        <div className="p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ServiceIcon className="bg-primary/10 text-primary-emphasis">
                <KeyRound className="size-4" />
              </ServiceIcon>
              {recoveryCodes
                ? 'Nouveaux codes de secours'
                : 'Générer de nouveaux codes'}
            </DialogTitle>
            <DialogDescription>
              Confirmez avec votre application d’authentification. Les anciens
              codes seront immédiatement invalidés.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            {error && (
              <div
                aria-live="assertive"
                className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border p-3 text-sm"
                role="alert"
              >
                {error}
              </div>
            )}
            {recoveryCodes ? (
              <MfaRecoveryCodesPanel
                codes={recoveryCodes}
                isFinishing={isSubmitting}
                onFinish={() => void handleRecoveryCodesSaved()}
              />
            ) : (
              <form
                autoComplete="off"
                className="space-y-4"
                onSubmit={handleSubmit}
              >
                <div className="space-y-2">
                  <Label htmlFor="mfa-action-current-password" required>
                    Mot de passe actuel
                  </Label>
                  <Input
                    autoFocus
                    disabled={isSubmitting}
                    id="mfa-action-current-password"
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
                  id="mfa-action-current-code"
                  inputRef={currentCodeInputRef}
                  kind="totp"
                  onChange={setCurrentCode}
                  value={currentCode}
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
                    className="flex-1"
                    disabled={isSubmitting || !canSubmit}
                    type="submit"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Vérification...
                      </>
                    ) : (
                      'Générer'
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
