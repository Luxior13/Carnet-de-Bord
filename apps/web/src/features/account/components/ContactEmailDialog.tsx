'use client';

import {
  AlertTriangle,
  Loader2,
  Mail,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import React, { type FC, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { type ApiResponse, RoutesApi } from '$types/api.types';
import type { UserType } from '$types/auth.types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '$ui/alert-dialog';
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
  const [isConfirmingRemoval, setIsConfirmingRemoval] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const normalizedContactEmail = useMemo(
    () => normalizeContactEmail(nextContactEmail),
    [nextContactEmail],
  );
  const currentNormalizedContactEmail = contactEmail?.toLowerCase() ?? null;
  const emailError = isConfirmingRemoval
    ? null
    : nextContactEmail.trim().length > CONTACT_EMAIL_MAX_LENGTH
      ? 'Adresse email trop longue'
      : normalizedContactEmail &&
          !CONTACT_EMAIL_PATTERN.test(normalizedContactEmail)
        ? 'Adresse email invalide'
        : null;
  const hasChanges = normalizedContactEmail !== currentNormalizedContactEmail;
  const hasDraftChanges =
    hasChanges || currentPassword.length > 0 || isConfirmingRemoval;
  const canSubmit =
    !isSaving &&
    currentPassword.length > 0 &&
    (isConfirmingRemoval
      ? currentNormalizedContactEmail !== null
      : normalizedContactEmail !== null && !emailError && hasChanges);

  useEffect(() => {
    if (!open) return;

    setNextContactEmail(contactEmail ?? '');
    setCurrentPassword('');
    setError(null);
    setIsSaving(false);
    setIsConfirmingRemoval(false);
    setShowDiscardConfirm(false);
  }, [contactEmail, open]);

  const requestClose = (): void => {
    if (isSaving) return;

    if (hasDraftChanges) {
      setShowDiscardConfirm(true);

      return;
    }

    onCancel();
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    setError(null);

    if (!isConfirmingRemoval && emailError) {
      setError(emailError);

      return;
    }

    if (!isConfirmingRemoval && !normalizedContactEmail) {
      setError('Une adresse email est requise');

      return;
    }

    if (!isConfirmingRemoval && !hasChanges) {
      setError("L'adresse de contact n'a pas changé");

      return;
    }

    if (!currentPassword) {
      setError('Le mot de passe actuel est requis');

      return;
    }

    const contactEmailToSave = isConfirmingRemoval
      ? null
      : normalizedContactEmail;

    try {
      setIsSaving(true);
      const response = await apiFetch(RoutesApi.contactEmail, {
        body: JSON.stringify({
          contactEmail: contactEmailToSave,
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
        isConfirmingRemoval
          ? 'Adresse de contact supprimée'
          : 'Adresse de contact mise à jour',
      );
      onCancel();
    } catch {
      setError("Impossible de modifier l'adresse de contact");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) requestClose();
        }}
      >
        <DialogContent className="overflow-hidden p-0 sm:max-w-md">
          <div className="p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ServiceIcon className="bg-primary/10 text-primary-emphasis">
                  {isConfirmingRemoval ? (
                    <Trash2 className="size-4" />
                  ) : (
                    <Mail className="size-4" />
                  )}
                </ServiceIcon>
                {isConfirmingRemoval
                  ? "Supprimer l'adresse de contact"
                  : "Modifier l'adresse de contact"}
              </DialogTitle>
              <DialogDescription>
                {isConfirmingRemoval
                  ? 'Cette action retire uniquement votre adresse de contact.'
                  : 'Cette adresse est indépendante de votre identifiant de connexion et ne permet pas de vous authentifier.'}
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

              {isConfirmingRemoval ? (
                <div className="border-destructive/30 bg-destructive/10 rounded-md border p-3">
                  <p className="text-foreground text-sm font-medium">
                    Confirmer la suppression de cette adresse ?
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm break-all">
                    {contactEmail}
                  </p>
                  <p className="text-muted-foreground mt-2 text-xs leading-5">
                    Votre identifiant, votre mot de passe et vos sessions ne
                    seront pas modifiés.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="account-contact-email" required>
                    Adresse de contact
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
                    onChange={(event) =>
                      setNextContactEmail(event.target.value)
                    }
                    placeholder="nom@exemple.fr"
                    required
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
                      'Utilisée uniquement comme adresse de contact, jamais pour vous connecter.'}
                  </p>
                  {contactEmail && (
                    <Button
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive px-0"
                      disabled={isSaving}
                      onClick={() => {
                        setError(null);
                        setIsConfirmingRemoval(true);
                      }}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      <Trash2 className="size-4" />
                      Supprimer l&apos;adresse de contact
                    </Button>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="account-contact-current-password" required>
                  Mot de passe actuel
                </Label>
                <Input
                  autoComplete="current-password"
                  autoFocus={isConfirmingRemoval}
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

              {!isConfirmingRemoval && (
                <div className="border-primary/25 bg-primary/[0.08] text-muted-foreground flex items-start gap-2 rounded-md border p-3 text-xs leading-5">
                  <ShieldCheck className="text-primary-emphasis mt-0.5 size-4 shrink-0" />
                  <p>
                    Votre identifiant <strong>{loginName}</strong>, votre mot de
                    passe et vos sessions ne seront pas modifiés.
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  disabled={isSaving}
                  onClick={() => {
                    if (isConfirmingRemoval) {
                      setError(null);
                      setIsConfirmingRemoval(false);

                      return;
                    }

                    requestClose();
                  }}
                  type="button"
                  variant="outline"
                >
                  {isConfirmingRemoval ? 'Retour' : 'Annuler'}
                </Button>
                <Button
                  className="flex-1"
                  disabled={!canSubmit}
                  type="submit"
                  variant={isConfirmingRemoval ? 'destructive' : 'default'}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Enregistrement...
                    </>
                  ) : isConfirmingRemoval ? (
                    'Confirmer la suppression'
                  ) : (
                    'Confirmer'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={showDiscardConfirm}
        onOpenChange={setShowDiscardConfirm}
      >
        <AlertDialogContent className="border-border overflow-hidden rounded-lg p-0">
          <div className="p-6">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground flex items-center gap-2">
                <span className="bg-warning/10 flex size-8 items-center justify-center rounded-lg">
                  <AlertTriangle className="text-warning size-4" />
                </span>
                Abandonner les modifications ?
              </AlertDialogTitle>
              <AlertDialogDescription>
                L&apos;adresse ou le mot de passe saisi ne sera pas conservé.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel>Continuer la modification</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  setShowDiscardConfirm(false);
                  onCancel();
                }}
              >
                Abandonner
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
