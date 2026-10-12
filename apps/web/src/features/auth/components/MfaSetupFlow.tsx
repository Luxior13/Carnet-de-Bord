'use client';

import { Copy, Loader2, QrCode, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import React, { type FC, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { RoutesApi } from '$types/api.types';
import type {
  MfaSetupConfirmationData,
  MfaSetupStartData,
} from '$types/auth.types';
import { Button } from '$ui/button';
import { Input } from '$ui/input';
import { Label } from '$ui/label';
import { ApiClientError, apiFetchJson } from '$utils/api.utils';

import {
  isCompleteMfaCode,
  MfaCodeInput,
  type MfaCodeKind,
} from './MfaCodeInput';
import { MfaRecoveryCodesPanel } from './MfaRecoveryCodesPanel';

export type MfaSetupMode = 'activate' | 'bootstrap' | 'replace';

type MfaSetupFlowProps = {
  allowCancel?: boolean;
  mode: MfaSetupMode;
  onCancel?: () => Promise<void> | void;
  onComplete: (data: MfaSetupConfirmationData) => Promise<void> | void;
};

type SetupStep = 'authorize' | 'recovery' | 'scan';

export const MfaSetupFlow: FC<MfaSetupFlowProps> = ({
  allowCancel = true,
  mode,
  onCancel,
  onComplete,
}) => {
  const [step, setStep] = useState<SetupStep>('authorize');
  const submissionRef = useRef(false);
  const mountedRef = useRef(false);
  const copyOperationRef = useRef(0);
  const requestRef = useRef<AbortController | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    mountedRef.current = true;

    return (): void => {
      mountedRef.current = false;
      requestRef.current?.abort();
      requestRef.current = null;
      // This counter invalidates promises; it is not a DOM ref.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      copyOperationRef.current++;
    };
  }, []);
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
  const [confirmationUnknown, setConfirmationUnknown] = useState(false);
  const newCodeInputRef = useRef<HTMLInputElement>(null);
  const isBootstrap = mode === 'bootstrap';
  const isReplacing = mode === 'replace';
  const canAuthorize =
    isBootstrap ||
    (currentPassword.length > 0 &&
      (!isReplacing || isCompleteMfaCode(currentCode, currentCodeKind)));

  const handleStart = async (): Promise<void> => {
    if (submissionRef.current || !mountedRef.current || !canAuthorize) return;
    const request = new AbortController();
    requestRef.current = request;
    const timeout = setTimeout(() => request.abort(), 30_000);

    try {
      submissionRef.current = true;
      setIsSubmitting(true);
      setError(null);
      const data = await apiFetchJson<MfaSetupStartData>(RoutesApi.mfaSetup, {
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
        signal: request.signal,
      });

      if (!mountedRef.current || requestRef.current !== request) return;
      if (request.signal.aborted)
        throw new Error('Setup preparation timed out');
      if (!data?.manualKey || !data.qrCodeDataUrl)
        throw new Error('Setup data missing');
      setSetup(data);
      setCurrentPassword('');
      setCurrentCode('');
      setNewCode('');
      setStep('scan');
    } catch (failure) {
      if (!mountedRef.current || requestRef.current !== request) return;
      const uncertain =
        !(failure instanceof ApiClientError) ||
        failure.status >= 500 ||
        failure.code === 'INVALID_RESPONSE';
      if (uncertain && isReplacing) setCurrentCode('');
      setError(
        uncertain && isReplacing
          ? 'La préparation n’a pas pu être confirmée. Votre application actuelle reste active ; le code utilisé peut déjà avoir été consommé. Recommencez avec un nouveau code.'
          : failure instanceof ApiClientError
            ? failure.message
            : 'Impossible de préparer la double authentification. Vous pouvez recommencer la préparation.',
      );
    } finally {
      clearTimeout(timeout);
      if (mountedRef.current && requestRef.current === request) {
        requestRef.current = null;
        submissionRef.current = false;
        setIsSubmitting(false);
      }
    }
  };

  const handleConfirm = async (
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    if (
      submissionRef.current ||
      confirmationUnknown ||
      !mountedRef.current ||
      !isCompleteMfaCode(newCode, 'totp')
    )
      return;
    const request = new AbortController();
    requestRef.current = request;
    const timeout = setTimeout(() => request.abort(), 30_000);

    try {
      submissionRef.current = true;
      setIsSubmitting(true);
      setError(null);
      const data = await apiFetchJson<MfaSetupConfirmationData>(
        RoutesApi.mfaSetup,
        {
          body: JSON.stringify({ code: newCode }),
          headers: { 'Content-Type': 'application/json' },
          method: 'PUT',
          signal: request.signal,
        },
      );

      if (!mountedRef.current || requestRef.current !== request) return;
      if (request.signal.aborted)
        throw new Error('Setup confirmation timed out');
      if (!data?.user || !data.recoveryCodes?.length)
        throw new Error('Setup confirmation incomplete');
      setCompletion(data);
      copyOperationRef.current++;
      setSetup(null);
      setNewCode('');
      setStep('recovery');
    } catch (failure) {
      if (!mountedRef.current || requestRef.current !== request) return;
      setNewCode('');
      const uncertain =
        !(failure instanceof ApiClientError) ||
        failure.status >= 500 ||
        failure.code === 'INVALID_RESPONSE';
      setConfirmationUnknown(uncertain);
      if (
        uncertain ||
        (failure instanceof ApiClientError && failure.status === 401)
      ) {
        copyOperationRef.current++;
        setSetup(null);
      }
      if (failure instanceof ApiClientError && failure.status === 401) {
        // Expired setup must allow explicit preparation again, even in mandatory mode.
        setCurrentPassword('');
        setCurrentCode('');
        setStep('authorize');
      }
      setError(
        uncertain
          ? 'La réponse du serveur n’a pas pu être confirmée. La nouvelle application a peut-être été activée et les codes de secours n’ont pas été reçus. Vérifiez votre accès avec la nouvelle application avant de recommencer.'
          : failure.message,
      );
    } finally {
      clearTimeout(timeout);
      if (mountedRef.current && requestRef.current === request) {
        requestRef.current = null;
        submissionRef.current = false;
        setIsSubmitting(false);
      }
    }
  };

  const handleCopyManualKey = async (): Promise<void> => {
    if (!setup) return;
    const operation = ++copyOperationRef.current;

    try {
      await navigator.clipboard.writeText(setup.manualKey);
      if (!mountedRef.current || operation !== copyOperationRef.current) return;
      toast.success('Clé de configuration copiée');
    } catch {
      if (!mountedRef.current || operation !== copyOperationRef.current) return;
      toast.error('Impossible de copier la clé');
    }
  };

  useEffect(() => {
    if (error && !isSubmitting) errorRef.current?.focus();
  }, [error, isSubmitting]);

  const handleFinish = async (): Promise<void> => {
    if (!completion || submissionRef.current || !mountedRef.current) return;

    try {
      submissionRef.current = true;
      setIsSubmitting(true);
      setError(null);
      await onComplete(completion);
    } catch {
      if (!mountedRef.current) return;
      setError('Impossible de terminer la configuration');
    } finally {
      submissionRef.current = false;
      if (mountedRef.current) setIsSubmitting(false);
    }
  };

  const handleCancel = async (): Promise<void> => {
    if (!onCancel || submissionRef.current || !mountedRef.current) return;
    submissionRef.current = true;
    setIsSubmitting(true);
    setError(null);
    try {
      await onCancel();
    } catch {
      if (mountedRef.current)
        setError('Impossible d’annuler la configuration. Réessayez.');
    } finally {
      submissionRef.current = false;
      if (mountedRef.current) setIsSubmitting(false);
    }
  };

  if (confirmationUnknown) {
    return (
      <div className="space-y-4">
        <div
          className="border-warning/35 bg-warning/10 rounded-md border p-3 text-sm leading-6"
          ref={errorRef}
          role="alert"
          tabIndex={-1}
        >
          {error}
        </div>
        <p className="text-muted-foreground text-sm">
          Rechargez le compte pour relire son état. Si la nouvelle application
          est active, utilisez-la puis générez de nouveaux codes de secours
          depuis la section Sécurité.
        </p>
        <Button
          className="w-full"
          onClick={() => window.location.reload()}
          type="button"
        >
          Recharger le compte
        </Button>
      </div>
    );
  }

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
            ref={errorRef}
            tabIndex={-1}
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
      <form autoComplete="off" className="space-y-4" onSubmit={handleConfirm}>
        {error && (
          <div
            ref={errorRef}
            tabIndex={-1}
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

        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          {allowCancel && onCancel && (
            <Button
              className="flex-1"
              disabled={isSubmitting}
              onClick={() => void handleCancel()}
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
      autoComplete="off"
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void handleStart();
      }}
    >
      {error && (
        <div
          ref={errorRef}
          tabIndex={-1}
          aria-live="assertive"
          className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border p-3 text-sm"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="border-primary/25 bg-primary/[0.08] flex items-start gap-3 rounded-md border p-3 text-sm leading-6">
        {isBootstrap ? (
          <QrCode className="text-primary-emphasis mt-1 size-4 shrink-0" />
        ) : (
          <ShieldCheck className="text-primary-emphasis mt-1 size-4 shrink-0" />
        )}
        <p>
          {isBootstrap
            ? 'Tous les comptes doivent être protégés par une application d’authentification avant de pouvoir accéder au site.'
            : isReplacing
              ? 'L’ancienne application restera valide jusqu’à la confirmation de la nouvelle.'
              : 'Confirmez votre mot de passe avant de lier votre application d’authentification.'}
        </p>
      </div>

      {!isBootstrap && (
        <>
          <div className="space-y-2">
            <Label htmlFor="mfa-current-password" required>
              Mot de passe actuel
            </Label>
            <Input
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
            disabled={isSubmitting}
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

      <div className="flex flex-col-reverse gap-2 sm:flex-row">
        {allowCancel && onCancel && (
          <Button
            className="flex-1"
            disabled={isSubmitting}
            onClick={() => void handleCancel()}
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
