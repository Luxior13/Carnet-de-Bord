'use client';

import { KeyRound, Loader2, ShieldOff } from 'lucide-react';
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

import {
  isCompleteMfaCode,
  MfaCodeInput,
  type MfaCodeKind,
} from './MfaCodeInput';
import { MfaRecoveryCodesPanel } from './MfaRecoveryCodesPanel';

export type MfaActionMode = 'disable' | 'recovery-codes';

type MfaActionResponse = {
  recoveryCodes?: string[];
  user?: UserType;
};

type MfaActionDialogProps = {
  loginName?: string;
  mode: MfaActionMode;
  onCancel: () => void;
  onComplete: (user?: UserType) => Promise<void> | void;
  open: boolean;
};

export const MfaActionDialog: FC<MfaActionDialogProps> = ({
  loginName,
  mode,
  onCancel,
  onComplete,
  open,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [currentCode, setCurrentCode] = useState('');
  const [codeKind, setCodeKind] = useState<MfaCodeKind>('totp');
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [responseUser, setResponseUser] = useState<UserType | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currentCodeInputRef = useRef<HTMLInputElement>(null);
  const isDisabling = mode === 'disable';
  const effectiveCodeKind = isDisabling ? codeKind : 'totp';
  const canSubmit =
    currentPassword.length > 0 &&
    isCompleteMfaCode(currentCode, effectiveCodeKind);

  useEffect(() => {
    if (!open) return;

    setCurrentPassword('');
    setCurrentCode('');
    setCodeKind('totp');
    setRecoveryCodes(null);
    setResponseUser(undefined);
    setError(null);
    setIsSubmitting(false);
  }, [mode, open]);

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    if (!canSubmit) return;

    try {
      setIsSubmitting(true);
      setError(null);
      const requestBody:
        | MfaRecoveryCodesRegenerationRequest
        | { currentCode: string; currentPassword: string } = isDisabling
        ? { currentCode, currentPassword }
        : { currentPassword, currentTotpCode: currentCode };
      const response = await apiFetch(
        isDisabling ? RoutesApi.mfa : RoutesApi.mfaRecoveryCodes,
        {
          body: JSON.stringify(requestBody),
          headers: { 'Content-Type': 'application/json' },
          method: isDisabling ? 'DELETE' : 'POST',
        },
      );
      const data = (await response.json()) as ApiResponse<MfaActionResponse>;

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

      if (!isDisabling) {
        if (!data.data.recoveryCodes?.length) {
          setError('Aucun code de secours n’a été généré');

          return;
        }

        setResponseUser(data.data.user);
        setRecoveryCodes(data.data.recoveryCodes);

        return;
      }

      await onComplete(data.data.user);
      toast.success('Double authentification désactivée');
      onCancel();
    } catch {
      setError('Impossible de confirmer cette action');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecoveryCodesSaved = async (): Promise<void> => {
    try {
      setIsSubmitting(true);
      await onComplete(responseUser);
      toast.success('Nouveaux codes de secours générés');
      onCancel();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && !isSubmitting && !recoveryCodes) onCancel();
      }}
    >
      <DialogContent
        className="max-h-[calc(100svh-2rem)] overflow-y-auto p-0 sm:max-w-lg"
        hideCloseButton={!!recoveryCodes}
      >
        <div
          className={isDisabling ? 'bg-destructive h-1' : 'bg-primary h-1'}
        />
        <div className="p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ServiceIcon
                className={
                  isDisabling
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-primary/10 text-primary'
                }
              >
                {isDisabling ? (
                  <ShieldOff className="size-4" />
                ) : (
                  <KeyRound className="size-4" />
                )}
              </ServiceIcon>
              {isDisabling
                ? 'Désactiver la double authentification'
                : recoveryCodes
                  ? 'Nouveaux codes de secours'
                  : 'Générer de nouveaux codes'}
            </DialogTitle>
            <DialogDescription>
              {isDisabling
                ? 'Votre compte ne demandera plus de second code à la connexion.'
                : 'Confirmez avec votre application d’authentification. Les anciens codes seront immédiatement invalidés.'}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            {recoveryCodes ? (
              <MfaRecoveryCodesPanel
                codes={recoveryCodes}
                isFinishing={isSubmitting}
                onFinish={() => void handleRecoveryCodesSaved()}
              />
            ) : (
              <form className="space-y-4" onSubmit={handleSubmit}>
                {error && (
                  <div
                    aria-live="assertive"
                    className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border p-3 text-sm"
                    role="alert"
                  >
                    {error}
                  </div>
                )}

                {isDisabling && (
                  <div className="border-destructive/30 bg-destructive/10 rounded-md border p-3 text-sm leading-6">
                    Cette action réduit la protection du compte et déconnectera
                    les autres sessions.
                  </div>
                )}

                {loginName && (
                  <input
                    aria-hidden="true"
                    autoComplete="username"
                    className="sr-only"
                    name="username"
                    readOnly
                    tabIndex={-1}
                    value={loginName}
                  />
                )}

                <div className="space-y-2">
                  <Label htmlFor="mfa-action-current-password" required>
                    Mot de passe actuel
                  </Label>
                  <Input
                    autoComplete="current-password"
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
                  kind={effectiveCodeKind}
                  onChange={setCurrentCode}
                  value={currentCode}
                />
                {isDisabling && (
                  <Button
                    className="h-auto p-0 text-xs"
                    onClick={() => {
                      setCurrentCode('');
                      setCodeKind((kind) =>
                        kind === 'totp' ? 'recovery' : 'totp',
                      );
                    }}
                    type="button"
                    variant="link"
                  >
                    {codeKind === 'totp'
                      ? 'Utiliser un code de secours'
                      : 'Utiliser le code de l’application'}
                  </Button>
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
                    variant={isDisabling ? 'destructive' : 'default'}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Vérification...
                      </>
                    ) : isDisabling ? (
                      'Désactiver'
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
