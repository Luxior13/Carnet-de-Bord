'use client';

import { Copy, Loader2, QrCode, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import React, { type FC, useRef, useState } from 'react';
import { toast } from 'sonner';

import { type ApiResponse, RoutesApi } from '$types/api.types';
import type {
  MfaSetupConfirmationData,
  MfaSetupStartData,
} from '$types/auth.types';
import { Button } from '$ui/button';
import { Input } from '$ui/input';
import { Label } from '$ui/label';
import { apiFetch } from '$utils/api.utils';

import {
  isCompleteMfaCode,
  MfaCodeInput,
  type MfaCodeKind,
} from './MfaCodeInput';
import { MfaRecoveryCodesPanel } from './MfaRecoveryCodesPanel';

export type MfaSetupMode = 'activate' | 'bootstrap' | 'replace';

type MfaSetupFlowProps = {
  allowCancel?: boolean;
  loginName?: string;
  mode: MfaSetupMode;
  onCancel?: () => void;
  onComplete: (data: MfaSetupConfirmationData) => Promise<void> | void;
};

type SetupStep = 'authorize' | 'recovery' | 'scan';

export const MfaSetupFlow: FC<MfaSetupFlowProps> = ({
  allowCancel = true,
  loginName,
  mode,
  onCancel,
  onComplete,
}) => {
  const [step, setStep] = useState<SetupStep>('authorize');
  const [currentPassword, setCurrentPassword] = useState('');
  const [currentCode, setCurrentCode] = useState('');
  const [currentCodeKind, setCurrentCodeKind] = useState<MfaCodeKind>('totp');
  const [newCode, setNewCode] = useState('');
  const [setup, setSetup] = useState<MfaSetupStartData | null>(null);
  const [completion, setCompletion] = useState<MfaSetupConfirmationData | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const newCodeInputRef = useRef<HTMLInputElement>(null);
  const isBootstrap = mode === 'bootstrap';
  const isReplacing = mode === 'replace';
  const canAuthorize =
    isBootstrap ||
    (currentPassword.length > 0 &&
      (!isReplacing || isCompleteMfaCode(currentCode, currentCodeKind)));

  const handleStart = async (): Promise<void> => {
    if (!canAuthorize) return;

    try {
      setIsSubmitting(true);
      setError(null);
      const response = await apiFetch(RoutesApi.mfaSetup, {
        body: JSON.stringify(
          isBootstrap
            ? {}
            : {
                currentPassword,
                ...(isReplacing ? { currentCode } : {}),
              },
        ),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const data = (await response.json()) as ApiResponse<MfaSetupStartData>;

      if (!response.ok || !data.success) {
        setError(
          data.success
            ? 'Impossible de préparer la double authentification'
            : data.error.message ||
                'Impossible de préparer la double authentification',
        );

        return;
      }

      setSetup(data.data);
      setNewCode('');
      setStep('scan');
    } catch {
      setError('Impossible de préparer la double authentification');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirm = async (
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    if (!isCompleteMfaCode(newCode, 'totp')) return;

    try {
      setIsSubmitting(true);
      setError(null);
      const response = await apiFetch(RoutesApi.mfaSetup, {
        body: JSON.stringify({ code: newCode }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PUT',
      });
      const data =
        (await response.json()) as ApiResponse<MfaSetupConfirmationData>;

      if (!response.ok || !data.success) {
        setError(
          data.success
            ? 'Code incorrect ou expiré'
            : data.error.message || 'Code incorrect ou expiré',
        );
        setNewCode('');
        newCodeInputRef.current?.focus();

        return;
      }

      setCompletion(data.data);
      setStep('recovery');
    } catch {
      setError('Impossible d’activer la double authentification');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyManualKey = async (): Promise<void> => {
    if (!setup) return;

    try {
      await navigator.clipboard.writeText(setup.manualKey);
      toast.success('Clé de configuration copiée');
    } catch {
      toast.error('Impossible de copier la clé');
    }
  };

  const handleFinish = async (): Promise<void> => {
    if (!completion) return;

    try {
      setIsSubmitting(true);
      setError(null);
      await onComplete(completion);
    } catch {
      setError('Impossible de terminer la configuration');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 'recovery' && completion) {
    return (
      <div className="space-y-4">
        <div className="space-y-1" aria-live="polite">
          <p className="font-semibold">Conservez vos codes de secours</p>
          <p className="text-muted-foreground text-sm leading-6">
            Ils permettent de vous connecter si votre téléphone n’est plus
            disponible.
          </p>
        </div>
        {error && (
          <div
            aria-live="assertive"
            className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border p-3 text-sm"
            role="alert"
          >
            {error}
          </div>
        )}
        <MfaRecoveryCodesPanel
          codes={completion.recoveryCodes}
          isFinishing={isSubmitting}
          onFinish={() => void handleFinish()}
        />
      </div>
    );
  }

  if (step === 'scan' && setup) {
    return (
      <form className="space-y-4" onSubmit={handleConfirm}>
        {error && (
          <div
            aria-live="assertive"
            className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border p-3 text-sm"
            role="alert"
          >
            {error}
          </div>
        )}

        <ol className="text-muted-foreground list-inside list-decimal space-y-1 text-sm leading-6">
          <li>Ouvrez votre application d’authentification.</li>
          <li>Ajoutez un compte puis scannez ce QR code.</li>
          <li>Saisissez le nouveau code à 6 chiffres.</li>
        </ol>

        <div className="flex justify-center rounded-md border bg-white p-4">
          <Image
            alt="QR code pour configurer l’application d’authentification"
            height={208}
            priority
            src={setup.qrCodeDataUrl}
            unoptimized
            width={208}
          />
        </div>

        <div className="space-y-2 rounded-md border p-3">
          <p className="text-muted-foreground text-xs font-medium uppercase">
            Clé de configuration manuelle
          </p>
          <div className="flex items-center gap-2">
            <code
              aria-label="Clé de configuration"
              className="bg-background min-w-0 flex-1 rounded border px-3 py-2 text-sm break-all"
            >
              {setup.manualKey}
            </code>
            <Button
              aria-label="Copier la clé de configuration"
              disabled={isSubmitting}
              onClick={() => void handleCopyManualKey()}
              size="icon"
              type="button"
              variant="outline"
            >
              <Copy className="size-4" />
            </Button>
          </div>
        </div>

        <MfaCodeInput
          autoFocus
          disabled={isSubmitting}
          error={error}
          id="mfa-setup-code"
          inputRef={newCodeInputRef}
          kind="totp"
          onChange={setNewCode}
          value={newCode}
        />

        <div className="flex gap-2">
          {allowCancel && onCancel && (
            <Button
              className="flex-1"
              disabled={isSubmitting}
              onClick={onCancel}
              type="button"
              variant="outline"
            >
              Annuler
            </Button>
          )}
          <Button
            className="flex-1"
            disabled={isSubmitting || !isCompleteMfaCode(newCode, 'totp')}
            type="submit"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Vérification...
              </>
            ) : (
              'Activer la double authentification'
            )}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void handleStart();
      }}
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

      <div className="border-primary/25 bg-primary/[0.08] flex items-start gap-3 rounded-md border p-3 text-sm leading-6">
        {isBootstrap ? (
          <QrCode className="text-primary mt-1 size-4 shrink-0" />
        ) : (
          <ShieldCheck className="text-primary mt-1 size-4 shrink-0" />
        )}
        <p>
          {isBootstrap
            ? 'Le compte superadmin doit être protégé par une application d’authentification avant de continuer. Les sessions longues restent désactivées pour ce compte.'
            : isReplacing
              ? 'L’ancienne application restera valide jusqu’à la confirmation de la nouvelle.'
              : 'Confirmez votre mot de passe avant de lier votre application d’authentification.'}
        </p>
      </div>

      {!isBootstrap && (
        <>
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
            <Label htmlFor="mfa-current-password" required>
              Mot de passe actuel
            </Label>
            <Input
              autoComplete="current-password"
              autoFocus
              disabled={isSubmitting}
              id="mfa-current-password"
              name="current-password"
              onChange={(event) => setCurrentPassword(event.target.value)}
              placeholder="Confirmez votre identité"
              required
              type="password"
              value={currentPassword}
            />
          </div>
        </>
      )}

      {isReplacing && (
        <>
          <MfaCodeInput
            disabled={isSubmitting}
            id="mfa-current-code"
            kind={currentCodeKind}
            onChange={setCurrentCode}
            value={currentCode}
          />
          <Button
            className="h-auto p-0 text-xs"
            onClick={() => {
              setCurrentCode('');
              setCurrentCodeKind((kind) =>
                kind === 'totp' ? 'recovery' : 'totp',
              );
            }}
            type="button"
            variant="link"
          >
            {currentCodeKind === 'totp'
              ? 'Utiliser un code de secours'
              : 'Utiliser le code de l’application'}
          </Button>
        </>
      )}

      <div className="flex gap-2">
        {allowCancel && onCancel && (
          <Button
            className="flex-1"
            disabled={isSubmitting}
            onClick={onCancel}
            type="button"
            variant="outline"
          >
            Retour
          </Button>
        )}
        <Button
          className="flex-1"
          disabled={isSubmitting || !canAuthorize}
          type="submit"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Préparation...
            </>
          ) : isBootstrap ? (
            'Configurer maintenant'
          ) : (
            'Continuer'
          )}
        </Button>
      </div>
    </form>
  );
};
