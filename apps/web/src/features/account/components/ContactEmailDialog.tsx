'use client';

import { Loader2, Mail, ShieldCheck } from 'lucide-react';
import React, { type FC, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { type ApiResponse, RoutesApi } from '$types/api.types';
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

type ContactEmailDialogProps = {
  contactEmail: string | null;
  loginName: string;
  onCancel: () => void;
  onSuccess: (updatedUser: UserType) => Promise<void>;
  open: boolean;
};

const CONTACT_EMAIL_MAX_LENGTH = 254;
const CONTACT_EMAIL_PATTERN = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/;

const normalizeContactEmail = (value: string): string | null => {
  const normalized = value.trim().toLowerCase();

  return normalized || null;
};

export const ContactEmailDialog: FC<ContactEmailDialogProps> = ({
  contactEmail,
  loginName,
  onCancel,
  onSuccess,
  open,
}) => {
  const [nextContactEmail, setNextContactEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const normalizedContactEmail = useMemo(
    () => normalizeContactEmail(nextContactEmail),
    [nextContactEmail],
  );
  const currentNormalizedContactEmail = contactEmail?.toLowerCase() ?? null;
  const emailError =
    nextContactEmail.trim().length > CONTACT_EMAIL_MAX_LENGTH
      ? 'Adresse email trop longue'
      : normalizedContactEmail &&
          !CONTACT_EMAIL_PATTERN.test(normalizedContactEmail)
        ? 'Adresse email invalide'
        : null;
  const hasChanges = normalizedContactEmail !== currentNormalizedContactEmail;
  const isRemovingContact =
    currentNormalizedContactEmail !== null && normalizedContactEmail === null;
  const canSubmit =
    !isSaving && !emailError && hasChanges && currentPassword.length > 0;

  useEffect(() => {
    if (!open) return;

    setNextContactEmail(contactEmail ?? '');
    setCurrentPassword('');
    setError(null);
    setIsSaving(false);
  }, [contactEmail, open]);

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    setError(null);

    if (emailError) {
      setError(emailError);

      return;
    }

    if (!hasChanges) {
      setError("L'adresse de contact n'a pas changé");

      return;
    }

    if (!currentPassword) {
      setError('Le mot de passe actuel est requis');

      return;
    }

    try {
      setIsSaving(true);
      const response = await apiFetch(RoutesApi.contactEmail, {
        body: JSON.stringify({
          contactEmail: normalizedContactEmail,
          currentPassword,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      });
      const data = (await response.json()) as ApiResponse<{ user: UserType }>;

      if (!response.ok || !data.success) {
        const responseError = data.success ? null : data.error.message;

        setError(
          responseError || "Impossible de modifier l'adresse de contact",
        );

        return;
      }

      await onSuccess(data.data.user);
      toast.success(
        normalizedContactEmail
          ? 'Adresse de contact mise à jour'
          : 'Adresse de contact supprimée',
      );
      onCancel();
    } catch {
      setError("Impossible de modifier l'adresse de contact");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && !isSaving) onCancel();
      }}
    >
      <DialogContent className="overflow-hidden p-0 sm:max-w-md">
        <div className="p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ServiceIcon className="bg-primary/10 text-primary-emphasis">
                <Mail className="size-4" />
              </ServiceIcon>
              Modifier l&apos;adresse de contact
            </DialogTitle>
            <DialogDescription>
              Cette adresse est indépendante de votre identifiant de connexion
              et ne permet pas de vous authentifier.
            </DialogDescription>
          </DialogHeader>

          <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div
                className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border p-3 text-sm"
                aria-live="polite"
                role="alert"
              >
                {error}
              </div>
            )}

            <input
              aria-hidden="true"
              autoComplete="username"
              className="sr-only"
              name="username"
              readOnly
              tabIndex={-1}
              value={loginName}
            />

            <div className="space-y-2">
              <Label htmlFor="account-contact-email">
                Nouvelle adresse de contact
              </Label>
              <Input
                aria-describedby="account-contact-email-help"
                aria-invalid={!!emailError}
                autoCapitalize="none"
                autoComplete="email"
                autoFocus
                disabled={isSaving}
                id="account-contact-email"
                maxLength={CONTACT_EMAIL_MAX_LENGTH}
                name="email"
                onChange={(event) => setNextContactEmail(event.target.value)}
                placeholder="nom@exemple.fr"
                spellCheck={false}
                type="email"
                value={nextContactEmail}
              />
              <p
                className={
                  emailError
                    ? 'text-destructive text-xs'
                    : 'text-muted-foreground text-xs'
                }
                id="account-contact-email-help"
              >
                {emailError ??
                  "Laissez ce champ vide pour supprimer l'adresse. Toute nouvelle adresse sera marquée comme non vérifiée."}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="account-contact-current-password" required>
                Mot de passe actuel
              </Label>
              <Input
                autoComplete="current-password"
                disabled={isSaving}
                id="account-contact-current-password"
                name="current-password"
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="Confirmez votre identité"
                required
                type="password"
                value={currentPassword}
              />
            </div>

            <div className="border-primary/25 bg-primary/[0.08] text-muted-foreground flex items-start gap-2 rounded-md border p-3 text-xs leading-5">
              <ShieldCheck className="text-primary-emphasis mt-0.5 size-4 shrink-0" />
              <p>
                Votre identifiant <strong>{loginName}</strong>, votre mot de
                passe et vos sessions ne seront pas modifiés.
              </p>
            </div>

            {isRemovingContact && (
              <div className="border-warning/30 bg-warning/10 text-warning rounded-md border p-3 text-xs leading-5">
                Confirmer supprimera l&apos;adresse de contact actuellement
                enregistrée. Votre identifiant restera inchangé.
              </div>
            )}

            <div className="flex gap-2">
              <Button
                className="flex-1"
                disabled={isSaving}
                onClick={onCancel}
                type="button"
                variant="outline"
              >
                Annuler
              </Button>
              <Button
                className="flex-1"
                disabled={!canSubmit}
                type="submit"
                variant={isRemovingContact ? 'destructive' : 'default'}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : isRemovingContact ? (
                  'Supprimer'
                ) : (
                  'Confirmer'
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
