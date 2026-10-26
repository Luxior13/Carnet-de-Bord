'use client';

import { ArrowLeft, Eye, EyeOff, Loader2, Lock, UserRound } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';

import { SITE_CONFIG } from '$constants/app.constants';
import { useUser } from '$context/UserContext';
import {
  isCompleteMfaCode,
  MfaCodeInput,
  type MfaCodeKind,
} from '$features/auth/components/MfaCodeInput';
import { MfaSetupFlow } from '$features/auth/components/MfaSetupFlow';
import type { MfaSetupConfirmationData } from '$types/auth.types';
import { Button } from '$ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '$ui/card';
import { Checkbox } from '$ui/checkbox';
import { Input } from '$ui/input';
import { Label } from '$ui/label';
import { getSafeReturnPath } from '$utils/navigation.utils';

type LoginStep = 'credentials' | 'mfa' | 'setup';

function LoginPage(): React.ReactNode {
  const router = useRouter();
  const {
    cancelMfaChallenge,
    clearError,
    completeAuthentication,
    error: authError,
    isLoading: authLoading,
    login,
    refreshUser,
    userData,
    verifyMfa,
  } = useUser();

  const [loginName, setLoginName] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<LoginStep>('credentials');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaCodeKind, setMfaCodeKind] = useState<MfaCodeKind>('totp');
  const [challengeExpiresAt, setChallengeExpiresAt] = useState<string | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [verificationUnknown, setVerificationUnknown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [returnPath, setReturnPath] = useState('/');
  const [isReturnPathReady, setIsReturnPathReady] = useState(false);
  const submissionRef = useRef(false);
  const mountedRef = useRef(false);
  const requestRef = useRef<AbortController | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const loginInputRef = useRef<HTMLInputElement>(null);
  const mfaInputRef = useRef<HTMLInputElement>(null);
  const displayedError = sessionChecked
    ? (authError ??
      'Aucune session active n’a été retrouvée. Recommencez la connexion avec un nouveau code.')
    : (error ?? authError);

  useEffect(() => {
    mountedRef.current = true;

    return (): void => {
      mountedRef.current = false;
      requestRef.current?.abort();
      requestRef.current = null;
    };
  }, []);

  const isCurrentRequest = (request: AbortController): boolean =>
    mountedRef.current && requestRef.current === request;

  useEffect(() => {
    if (displayedError && !isSubmitting && !authLoading)
      errorRef.current?.focus();
  }, [authLoading, displayedError, isSubmitting, step]);

  useEffect(() => {
    if (userData && !authLoading && isReturnPathReady) {
      router.replace(returnPath);
    }
  }, [userData, authLoading, isReturnPathReady, returnPath, router]);

  useEffect(() => {
    setReturnPath(
      getSafeReturnPath(
        new URLSearchParams(window.location.search).get('next'),
      ),
    );
    setIsReturnPathReady(true);
  }, []);

  useEffect(() => {
    if (!authLoading && step === 'credentials') loginInputRef.current?.focus();
  }, [authLoading, step]);

  const handleCredentialsSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    if (
      submissionRef.current ||
      !mountedRef.current ||
      userData ||
      !loginName.trim() ||
      !password
    )
      return;
    const request = new AbortController();
    requestRef.current = request;
    const timeout = setTimeout(() => request.abort(), 30_000);
    submissionRef.current = true;
    setError(null);
    setIsSubmitting(true);

    try {
      const normalizedLoginName = loginName.trim().toLowerCase();
      const result = await login(
        {
          loginName: normalizedLoginName,
          password,
          rememberMe,
        },
        { signal: request.signal },
      );

      if (!isCurrentRequest(request)) return;
      if (request.signal.aborted) {
        setError('La connexion a pris trop de temps. Vous pouvez réessayer.');

        return;
      }

      if (!result) return;

      setPassword('');
      setShowPassword(false);

      setChallengeExpiresAt(result.challengeExpiresAt);
      setMfaCode('');
      setMfaCodeKind('totp');
      setVerificationUnknown(false);
      setSessionChecked(false);
      clearError();
      setStep(result.status === 'mfa_setup_required' ? 'setup' : 'mfa');
    } catch {
      if (!isCurrentRequest(request)) return;
      setError('Une erreur est survenue');
    } finally {
      clearTimeout(timeout);
      if (isCurrentRequest(request)) {
        requestRef.current = null;
        submissionRef.current = false;
        setIsSubmitting(false);
      }
    }
  };

  const handleMfaSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    if (
      submissionRef.current ||
      verificationUnknown ||
      !mountedRef.current ||
      userData ||
      !isCompleteMfaCode(mfaCode, mfaCodeKind)
    )
      return;
    const request = new AbortController();
    requestRef.current = request;
    const timeout = setTimeout(() => request.abort(), 30_000);
    submissionRef.current = true;

    setError(null);
    setIsSubmitting(true);

    try {
      const success = await verifyMfa(mfaCode, { signal: request.signal });
      if (!isCurrentRequest(request)) return;
      if (request.signal.aborted) throw new Error('MFA verification timed out');

      if (!success) {
        setMfaCode('');
      }
    } catch {
      if (!isCurrentRequest(request)) return;
      setVerificationUnknown(true);
      setError(
        'La réponse de connexion n’a pas pu être confirmée. Vérifiez si votre session a été ouverte avant de recommencer. Le code utilisé peut déjà avoir été consommé.',
      );
      setMfaCode('');
    } finally {
      clearTimeout(timeout);
      if (isCurrentRequest(request)) {
        requestRef.current = null;
        submissionRef.current = false;
        setIsSubmitting(false);
      }
    }
  };

  const handleCheckSession = async (): Promise<void> => {
    if (submissionRef.current || !mountedRef.current || !verificationUnknown)
      return;
    submissionRef.current = true;
    setIsSubmitting(true);
    setIsCheckingSession(true);
    setSessionChecked(false);
    try {
      await refreshUser();
      if (mountedRef.current) setSessionChecked(true);
    } catch {
      if (mountedRef.current)
        setError(
          'Impossible de vérifier votre session. Vous pouvez réessayer.',
        );
    } finally {
      if (mountedRef.current) {
        submissionRef.current = false;
        setIsSubmitting(false);
        setIsCheckingSession(false);
      }
    }
  };

  const handleBackToCredentials = async (): Promise<void> => {
    if (submissionRef.current || !mountedRef.current) return;
    const request = new AbortController();
    requestRef.current = request;
    const timeout = setTimeout(() => request.abort(), 30_000);
    submissionRef.current = true;
    setIsSubmitting(true);

    try {
      await cancelMfaChallenge({ signal: request.signal });
    } finally {
      clearTimeout(timeout);
      if (isCurrentRequest(request)) {
        requestRef.current = null;
        clearError();
        setError(null);
        setPassword('');
        setShowPassword(false);
        setMfaCode('');
        setVerificationUnknown(false);
        setSessionChecked(false);
        setChallengeExpiresAt(null);
        setStep('credentials');
        submissionRef.current = false;
        setIsSubmitting(false);
      }
    }
  };

  const handleBootstrapComplete = async (
    data: MfaSetupConfirmationData,
  ): Promise<void> => {
    if (!mountedRef.current) return;
    if (
      data.status !== 'authenticated' ||
      !data.session ||
      data.mustChangePassword === undefined
    ) {
      throw new Error('La session sécurisée n’a pas pu être créée');
    }

    completeAuthentication({
      mustChangePassword: data.mustChangePassword,
      session: data.session,
      status: 'authenticated',
      user: data.user,
    });
  };

  if (authLoading) {
    return (
      <div
        aria-label="Chargement"
        className="relative isolate flex min-h-svh items-center justify-center overflow-hidden"
        role="status"
      >
        <div aria-hidden="true" className="site-background-column" />
        <Loader2
          aria-hidden
          className="text-primary-emphasis relative z-10 size-8 animate-spin"
        />
      </div>
    );
  }

  const title =
    step === 'mfa'
      ? 'Vérification en deux étapes'
      : step === 'setup'
        ? 'Protéger votre compte'
        : 'Connexion';
  const description =
    step === 'mfa'
      ? 'Ouvrez votre application d’authentification pour terminer la connexion.'
      : step === 'setup'
        ? 'Cette configuration est obligatoire pour accéder au site et ne sera demandée qu’une seule fois.'
        : 'Accédez à l’espace privé, aux comptes et à l’administration.';

  return (
    <main className="relative isolate flex min-h-svh items-center justify-center overflow-hidden p-4">
      <div aria-hidden="true" className="site-background-column" />
      <Card
        aria-busy={isSubmitting || !!userData}
        className="border-border-content bg-surface-panel rounded-panel relative z-10 w-full max-w-md overflow-hidden py-0"
      >
        {userData && (
          <div
            aria-live="polite"
            className="bg-card/95 absolute inset-0 z-20 flex flex-col items-center justify-center gap-3"
            role="status"
          >
            <Loader2 className="text-primary-emphasis size-7 animate-spin" />
            <p className="text-sm font-medium">Ouverture de votre espace...</p>
          </div>
        )}
        <CardHeader className="bg-surface-panel-header border-border-divider space-y-4 border-b pb-5">
          <div className="flex items-center gap-3">
            <span className="bg-primary flex size-10 items-center justify-center rounded-lg shadow-none">
              <Image
                alt=""
                className="object-contain"
                height={28}
                priority
                src="/assets/noc.png"
                width={28}
              />
            </span>
            <div>
              <p className="text-sm font-semibold">{SITE_CONFIG.name}</p>
              <p className="text-muted-foreground text-xs">
                {SITE_CONFIG.subtitle}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <CardTitle
              as="h1"
              className="text-xl leading-7 tracking-normal sm:text-2xl sm:leading-8"
            >
              {title}
            </CardTitle>
            <CardDescription className="max-w-sm leading-6">
              {description}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {step === 'credentials' && (
            <form
              autoComplete="off"
              className="space-y-5"
              onSubmit={handleCredentialsSubmit}
            >
              {displayedError && (
                <div
                  ref={errorRef}
                  tabIndex={-1}
                  aria-live="assertive"
                  className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
                  role="alert"
                >
                  {displayedError}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="loginName" required>
                  Identifiant de connexion
                </Label>
                <div className="relative">
                  <UserRound className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                  <Input
                    autoCapitalize="none"
                    autoComplete="username"
                    autoCorrect="off"
                    className="h-10 pl-10"
                    disabled={isSubmitting || !!userData}
                    id="loginName"
                    ref={loginInputRef}
                    maxLength={32}
                    name="username"
                    onChange={(event) => setLoginName(event.target.value)}
                    placeholder="jean.dupont"
                    required
                    spellCheck={false}
                    type="text"
                    value={loginName}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" required>
                  Mot de passe
                </Label>
                <div className="relative">
                  <Lock className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                  <Input
                    autoComplete="current-password"
                    className="h-10 px-10"
                    disabled={isSubmitting || !!userData}
                    id="password"
                    name="password"
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Votre mot de passe"
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                  />
                  <Button
                    aria-label={
                      showPassword
                        ? 'Masquer le mot de passe'
                        : 'Afficher le mot de passe'
                    }
                    className="text-muted-foreground hover:text-foreground absolute top-1/2 right-1 size-8 -translate-y-1/2"
                    disabled={isSubmitting || !!userData}
                    onClick={() => setShowPassword((value) => !value)}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={rememberMe}
                  disabled={isSubmitting || !!userData}
                  id="rememberMe"
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                />
                <Label
                  className="text-muted-foreground cursor-pointer text-sm font-normal"
                  htmlFor="rememberMe"
                >
                  Rester connecté sur cet appareil
                </Label>
              </div>
              <Button
                className="h-10 w-full"
                disabled={
                  isSubmitting || !!userData || !loginName.trim() || !password
                }
                type="submit"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Connexion...
                  </>
                ) : (
                  'Se connecter'
                )}
              </Button>
              <p className="text-muted-foreground text-xs leading-5">
                Reste connecté jusqu’à 30 jours ; le code est demandé à chaque
                nouvelle connexion. À cocher uniquement sur un appareil
                personnel. Sans effet pour le compte superadmin.
              </p>
              <p className="text-muted-foreground text-xs leading-5">
                Mot de passe oublié ou accès bloqué&nbsp;? La récupération est
                gérée par le propriétaire superadmin.
              </p>
            </form>
          )}

          {step === 'mfa' && (
            <form
              autoComplete="off"
              className="space-y-4"
              onSubmit={handleMfaSubmit}
            >
              {displayedError && (
                <div
                  ref={errorRef}
                  tabIndex={-1}
                  aria-live="assertive"
                  className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
                  role="alert"
                >
                  {displayedError}
                </div>
              )}
              <div className="bg-surface-inset rounded-md border p-3 text-sm">
                Connexion pour <strong>{loginName.trim().toLowerCase()}</strong>
              </div>
              <MfaCodeInput
                autoFocus
                disabled={isSubmitting || verificationUnknown || !!userData}
                id="login-mfa-code"
                inputRef={mfaInputRef}
                kind={mfaCodeKind}
                onChange={setMfaCode}
                value={mfaCode}
              />
              {challengeExpiresAt && (
                <p className="text-muted-foreground text-xs">
                  Cette vérification expire automatiquement après quelques
                  minutes.
                </p>
              )}
              <Button
                className="h-auto p-0 text-xs"
                disabled={isSubmitting || verificationUnknown || !!userData}
                onClick={() => {
                  clearError();
                  setError(null);
                  setMfaCode('');
                  setMfaCodeKind((kind) =>
                    kind === 'totp' ? 'recovery' : 'totp',
                  );
                  requestAnimationFrame(() => {
                    if (mountedRef.current && !submissionRef.current)
                      mfaInputRef.current?.focus();
                  });
                }}
                type="button"
                variant="link"
              >
                {mfaCodeKind === 'totp'
                  ? 'Utiliser un code de secours'
                  : 'Utiliser le code de l’application'}
              </Button>
              {verificationUnknown && (
                <div className="space-y-3">
                  <p className="text-muted-foreground text-sm leading-6">
                    Si aucune session n’est retrouvée, recommencez avec vos
                    identifiants puis un nouveau code de l’application ou un
                    autre code de secours.
                  </p>
                  <Button
                    className="w-full"
                    disabled={isSubmitting || !!userData}
                    loading={isCheckingSession}
                    onClick={() => void handleCheckSession()}
                    type="button"
                  >
                    {isCheckingSession
                      ? 'Vérification de la session…'
                      : 'Vérifier la session'}
                  </Button>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  aria-label={
                    verificationUnknown
                      ? 'Recommencer la connexion'
                      : 'Retour à l’identifiant et au mot de passe'
                  }
                  className="shrink-0"
                  disabled={isSubmitting || !!userData}
                  onClick={() => void handleBackToCredentials()}
                  type="button"
                  variant="outline"
                >
                  <ArrowLeft className="size-4" />
                  {verificationUnknown ? 'Recommencer la connexion' : 'Retour'}
                </Button>
                {!verificationUnknown && (
                  <Button
                    className="flex-1"
                    disabled={
                      isSubmitting ||
                      !!userData ||
                      !isCompleteMfaCode(mfaCode, mfaCodeKind)
                    }
                    type="submit"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Vérification...
                      </>
                    ) : (
                      'Vérifier et se connecter'
                    )}
                  </Button>
                )}
              </div>
            </form>
          )}

          {step === 'setup' && (
            <MfaSetupFlow
              mode="bootstrap"
              onCancel={handleBackToCredentials}
              onComplete={handleBootstrapComplete}
            />
          )}
        </CardContent>
      </Card>
    </main>
  );
}

export default LoginPage;
