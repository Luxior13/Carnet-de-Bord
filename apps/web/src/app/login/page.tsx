'use client';

import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
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

const LAST_LOGIN_NAME_STORAGE_KEY = 'team-control:last-login-name';
const LEGACY_LAST_LOGIN_EMAIL_STORAGE_KEY = 'team-control:last-login-email';
const LEGACY_LOGIN_EMAILS_STORAGE_KEY = 'team-control:login-emails';

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
  const [error, setError] = useState<string | null>(null);
  const [returnPath, setReturnPath] = useState('/');
  const [isReturnPathReady, setIsReturnPathReady] = useState(false);
  const mfaInputRef = useRef<HTMLInputElement>(null);
  const displayedError = error ?? authError;

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

    const lastSavedLoginName = window.localStorage.getItem(
      LAST_LOGIN_NAME_STORAGE_KEY,
    );
    window.localStorage.removeItem(LEGACY_LAST_LOGIN_EMAIL_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_LOGIN_EMAILS_STORAGE_KEY);

    if (lastSavedLoginName) {
      setLoginName(lastSavedLoginName.trim().toLowerCase());
    }
  }, []);

  const saveLoginName = (loginNameToSave: string): void => {
    const normalizedLoginName = loginNameToSave.trim().toLowerCase();
    if (!normalizedLoginName) return;

    window.localStorage.setItem(
      LAST_LOGIN_NAME_STORAGE_KEY,
      normalizedLoginName,
    );
  };

  const handleCredentialsSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const normalizedLoginName = loginName.trim().toLowerCase();
      const result = await login({
        loginName: normalizedLoginName,
        password,
        rememberMe,
      });

      if (!result) return;

      setPassword('');
      saveLoginName(normalizedLoginName);

      if (result.status === 'authenticated') return;

      setChallengeExpiresAt(result.challengeExpiresAt);
      setMfaCode('');
      setMfaCodeKind('totp');
      clearError();
      setStep(result.status === 'mfa_setup_required' ? 'setup' : 'mfa');
    } catch {
      setError('Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMfaSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    if (!isCompleteMfaCode(mfaCode, mfaCodeKind)) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const success = await verifyMfa(mfaCode);

      if (!success) {
        setMfaCode('');
        mfaInputRef.current?.focus();
      }
    } catch {
      setError('Impossible de vérifier le code');
      setMfaCode('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToCredentials = async (): Promise<void> => {
    setIsSubmitting(true);

    try {
      await cancelMfaChallenge();
    } finally {
      clearError();
      setError(null);
      setPassword('');
      setMfaCode('');
      setChallengeExpiresAt(null);
      setStep('credentials');
      setIsSubmitting(false);
    }
  };

  const handleBootstrapComplete = async (
    data: MfaSetupConfirmationData,
  ): Promise<void> => {
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
          className="text-primary relative z-10 size-8 animate-spin"
        />
      </div>
    );
  }

  const title =
    step === 'mfa'
      ? 'Vérification en deux étapes'
      : step === 'setup'
        ? 'Protéger le compte superadmin'
        : 'Connexion';
  const description =
    step === 'mfa'
      ? 'Ouvrez votre application d’authentification pour terminer la connexion.'
      : step === 'setup'
        ? 'Cette configuration est obligatoire et ne sera demandée qu’une seule fois.'
        : 'Accédez à l’espace privé, aux comptes et à l’administration.';

  return (
    <main className="relative isolate flex min-h-svh items-center justify-center overflow-hidden p-4">
      <div aria-hidden="true" className="site-background-column" />
      <Card
        aria-busy={!!userData}
        className="relative z-10 w-full max-w-md overflow-hidden py-0"
      >
        {userData && (
          <div
            aria-live="polite"
            className="bg-card/95 absolute inset-0 z-20 flex flex-col items-center justify-center gap-3"
            role="status"
          >
            <Loader2 className="text-primary size-7 animate-spin" />
            <p className="text-sm font-medium">Ouverture de votre espace...</p>
          </div>
        )}
        <div className="bg-primary h-1 w-full" />
        <CardHeader className="space-y-4">
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
            <div className="bg-primary/10 text-primary inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-xs font-medium">
              {step === 'mfa' ? (
                <KeyRound className="size-4" />
              ) : (
                <ShieldCheck className="size-4" />
              )}
              Espace privé
            </div>
            <CardTitle className="text-2xl tracking-normal">{title}</CardTitle>
            <CardDescription className="max-w-sm leading-6">
              {description}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {step === 'credentials' && (
            <form
              autoComplete="on"
              className="space-y-5"
              onSubmit={handleCredentialsSubmit}
            >
              {displayedError && (
                <div
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
                    disabled={isSubmitting}
                    id="loginName"
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
                    disabled={isSubmitting}
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
                    disabled={isSubmitting}
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
                  disabled={isSubmitting}
                  id="rememberMe"
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                />
                <Label
                  className="text-muted-foreground cursor-pointer text-sm font-normal"
                  htmlFor="rememberMe"
                >
                  Rester connecté
                </Label>
              </div>
              <p className="text-muted-foreground text-xs leading-5">
                Mot de passe oublié ou accès bloqué&nbsp;? La récupération est
                gérée par un administrateur habilité de votre équipe.
              </p>
              <Button
                className="h-10 w-full"
                disabled={isSubmitting || !loginName || !password}
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
            </form>
          )}

          {step === 'mfa' && (
            <form className="space-y-4" onSubmit={handleMfaSubmit}>
              {displayedError && (
                <div
                  aria-live="assertive"
                  className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
                  role="alert"
                >
                  {displayedError}
                </div>
              )}
              <div className="bg-popover rounded-md border p-3 text-sm">
                Connexion pour <strong>{loginName.trim().toLowerCase()}</strong>
              </div>
              <MfaCodeInput
                autoFocus
                disabled={isSubmitting}
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
                disabled={isSubmitting}
                onClick={() => {
                  clearError();
                  setMfaCode('');
                  setMfaCodeKind((kind) =>
                    kind === 'totp' ? 'recovery' : 'totp',
                  );
                }}
                type="button"
                variant="link"
              >
                {mfaCodeKind === 'totp'
                  ? 'Utiliser un code de secours'
                  : 'Utiliser le code de l’application'}
              </Button>
              <div className="flex gap-2">
                <Button
                  aria-label="Retour à l’identifiant et au mot de passe"
                  className="shrink-0"
                  disabled={isSubmitting}
                  onClick={() => void handleBackToCredentials()}
                  type="button"
                  variant="outline"
                >
                  <ArrowLeft className="size-4" />
                  Retour
                </Button>
                <Button
                  className="flex-1"
                  disabled={
                    isSubmitting || !isCompleteMfaCode(mfaCode, mfaCodeKind)
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
              </div>
            </form>
          )}

          {step === 'setup' && (
            <MfaSetupFlow
              mode="bootstrap"
              onCancel={() => void handleBackToCredentials()}
              onComplete={handleBootstrapComplete}
            />
          )}
        </CardContent>

        <div className="border-sidebar-border/65 bg-surface-muted grid grid-cols-3 gap-2 border-t p-3 text-xs sm:p-4">
          {['Vue globale', 'Comptes', 'Sécurité'].map((item) => (
            <div
              className="bg-popover text-muted-foreground flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-md border px-2 py-2 text-center sm:flex-row sm:gap-2 sm:px-3"
              key={item}
            >
              <CheckCircle2 className="text-primary size-4" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </Card>
    </main>
  );
}

export default LoginPage;
