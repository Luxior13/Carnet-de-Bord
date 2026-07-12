'use client';

import {
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

import { SITE_CONFIG } from '$constants/app.constants';
import { useUser } from '$context/UserContext';
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

const LAST_LOGIN_EMAIL_STORAGE_KEY = 'team-control:last-login-email';
const LEGACY_LOGIN_EMAILS_STORAGE_KEY = 'team-control:login-emails';

function LoginPage(): React.ReactNode {
  const router = useRouter();
  const {
    error: authError,
    isLoading: authLoading,
    login,
    userData,
  } = useUser();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [returnPath, setReturnPath] = useState('/');
  const [isReturnPathReady, setIsReturnPathReady] = useState(false);
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

    const lastSavedEmail = window.localStorage.getItem(
      LAST_LOGIN_EMAIL_STORAGE_KEY,
    );
    window.localStorage.removeItem(LEGACY_LOGIN_EMAILS_STORAGE_KEY);

    if (lastSavedEmail) {
      setEmail(lastSavedEmail.trim().toLowerCase());
    }
  }, []);

  const saveLoginEmail = (emailToSave: string): void => {
    const normalizedEmail = emailToSave.trim().toLowerCase();
    if (!normalizedEmail) return;

    window.localStorage.setItem(LAST_LOGIN_EMAIL_STORAGE_KEY, normalizedEmail);
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const success = await login({
        email: normalizedEmail,
        password,
        rememberMe,
      });

      if (success) {
        saveLoginEmail(normalizedEmail);
        router.replace(returnPath);
      }
    } catch {
      setError('Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="relative isolate flex min-h-svh items-center justify-center overflow-hidden">
        <div aria-hidden="true" className="site-background-column" />
        <Loader2 className="text-primary relative z-10 size-8 animate-spin" />
      </div>
    );
  }

  if (userData) {
    return null;
  }

  return (
    <main className="relative isolate flex min-h-svh items-center justify-center overflow-hidden p-4">
      <div aria-hidden="true" className="site-background-column" />
      <Card className="relative z-10 w-full max-w-md overflow-hidden py-0">
        <div className="bg-primary h-1 w-full" />
        <CardHeader className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="bg-primary flex size-10 items-center justify-center rounded-lg shadow-none">
              <Image
                src="/assets/noc.png"
                alt=""
                width={28}
                height={28}
                className="object-contain"
                priority
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
              <ShieldCheck className="size-4" />
              Espace privé
            </div>
            <CardTitle className="text-2xl tracking-normal">
              Connexion
            </CardTitle>
            <CardDescription className="max-w-sm leading-6">
              Accédez à l&apos;espace privé, aux comptes et à
              l&apos;administration.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <form onSubmit={handleSubmit} className="space-y-5" autoComplete="on">
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
              <Label htmlFor="email" required>
                Email
              </Label>
              <div className="relative">
                <Mail className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  id="email"
                  name="username"
                  type="email"
                  autoComplete="username"
                  inputMode="email"
                  placeholder="email@exemple.fr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 pl-10"
                  required
                  disabled={isSubmitting}
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
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Votre mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 px-10"
                  required
                  disabled={isSubmitting}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-1 size-8 -translate-y-1/2"
                  onClick={() => setShowPassword((value) => !value)}
                  disabled={isSubmitting}
                  aria-label={
                    showPassword
                      ? 'Masquer le mot de passe'
                      : 'Afficher le mot de passe'
                  }
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
                id="rememberMe"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
                disabled={isSubmitting}
              />
              <Label
                htmlFor="rememberMe"
                className="text-muted-foreground cursor-pointer text-sm font-normal"
              >
                Rester connecté
              </Label>
            </div>
            <Button
              type="submit"
              className="h-10 w-full"
              disabled={isSubmitting || !email || !password}
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
        </CardContent>
        <div className="border-sidebar-border/65 bg-surface-muted grid gap-2 border-t p-4 text-xs sm:grid-cols-3">
          {['Vue d’ensemble', 'Comptes', 'Sécurité'].map((item) => (
            <div
              key={item}
              className="bg-popover text-muted-foreground flex items-center gap-2 rounded-md border px-3 py-2"
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
