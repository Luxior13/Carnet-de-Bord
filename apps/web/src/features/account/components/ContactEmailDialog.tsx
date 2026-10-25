'use client';

import {
  AlertTriangle,
  Loader2,
  Mail,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import React, { type FC, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

import { isAccountFormSnapshot } from '$features/account/account.utils';
import { RoutesApi } from '$types/api.types';
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
import { ApiClientError, apiFetchJson } from '$utils/api.utils';
import { passwordManagerIgnoreAttributes } from '$utils/autofill.utils';

type ContactEmailDialogProps = {
  contactEmail: string | null;
  expectedUpdatedAt: UserType['updatedAt'];
  loginName: string;
  onAccessDenied: () => Promise<void>;
  onCancel: () => void;
  onDirtyChange: (dirty: boolean) => void;
  onSuccess: (updatedUser: UserType) => Promise<void>;
  open: boolean;
  restoreFocus: (event: Event) => void;
  userId: string;
};

const CONTACT_EMAIL_MAX_LENGTH = 254;
const contactEmailSchema = z.string().email();

const normalizeContactEmail = (value: string): string | null => {
  const normalized = value.trim().toLowerCase();

  return normalized || null;
};

export const ContactEmailDialog: FC<ContactEmailDialogProps> = ({
  contactEmail,
  expectedUpdatedAt,
  loginName,
  onAccessDenied,
  onCancel,
  onDirtyChange,
  onSuccess,
  open,
  restoreFocus,
  userId,
}) => {
  const submissionRef = useRef(false);
  const mountedRef = useRef(false);
  const requestRef = useRef<AbortController | null>(null);
  const snapshotRef = useRef({ contactEmail, expectedUpdatedAt });
  snapshotRef.current = { contactEmail, expectedUpdatedAt };
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    mountedRef.current = true;

    return (): void => {
      mountedRef.current = false;
      requestRef.current?.abort();
    };
  }, []);
  const [nextContactEmail, setNextContactEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [baseContactEmail, setBaseContactEmail] = useState(contactEmail);
  const [baseVersion, setBaseVersion] = useState(expectedUpdatedAt);
  const [notice, setNotice] = useState<string | null>(null);
  const [isConfirmingRemoval, setIsConfirmingRemoval] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const normalizedContactEmail = useMemo(
    () => normalizeContactEmail(nextContactEmail),
    [nextContactEmail],
  );
  const currentNormalizedContactEmail = baseContactEmail?.toLowerCase() ?? null;
  const busy = isSaving || isRefreshing;
  const emailError = isConfirmingRemoval
    ? null
    : nextContactEmail.trim().length > CONTACT_EMAIL_MAX_LENGTH
      ? 'Adresse email trop longue'
      : normalizedContactEmail &&
          !contactEmailSchema.safeParse(normalizedContactEmail).success
        ? 'Adresse email invalide'
        : null;
  const hasChanges = normalizedContactEmail !== currentNormalizedContactEmail;
  const hasDraftChanges =
    hasChanges || currentPassword.length > 0 || isConfirmingRemoval;
  const canSubmit =
    !busy &&
    !conflict &&
    currentPassword.length > 0 &&
    (isConfirmingRemoval
      ? currentNormalizedContactEmail !== null
      : normalizedContactEmail !== null && !emailError && hasChanges);

  useEffect(() => {
    requestRef.current?.abort();
    requestRef.current = null;
    submissionRef.current = false;
    const snapshot = snapshotRef.current;
    setNextContactEmail(open ? (snapshot.contactEmail ?? '') : '');
    setBaseContactEmail(snapshot.contactEmail);
    setBaseVersion(snapshot.expectedUpdatedAt);
    setCurrentPassword('');
    setError(null);
    setIsSaving(false);
    setIsRefreshing(false);
    setConflict(false);
    setNotice(null);
    setIsConfirmingRemoval(false);
    setShowDiscardConfirm(false);
  }, [open]);

  useEffect(() => {
    onDirtyChange(open && (hasDraftChanges || busy));

    return (): void => onDirtyChange(false);
  }, [busy, hasDraftChanges, onDirtyChange, open]);

  const focusField = (password = false): void => {
    requestAnimationFrame(() => {
      if (!mountedRef.current) return;
      formRef.current
        ?.querySelector<HTMLInputElement>(
          password
            ? '#account-contact-current-password'
            : 'input:not(:disabled)',
        )
        ?.focus();
    });
  };

  const reloadVersion = async (): Promise<void> => {
    if (submissionRef.current || !mountedRef.current || !open) return;
    submissionRef.current = true;
    setIsRefreshing(true);
    const controller = new AbortController();
    requestRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const data = await apiFetchJson<{ user: UserType }>(RoutesApi.me, {
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!mountedRef.current || requestRef.current !== controller) return;
      if (
        controller.signal.aborted ||
        !isAccountFormSnapshot(data.user, userId)
      )
        throw new Error('Invalid account response');
      const receivedVersion = new Date(data.user.updatedAt).getTime();
      if (
        [baseVersion, snapshotRef.current.expectedUpdatedAt].some(
          (version) => version && new Date(version).getTime() > receivedVersion,
        )
      )
        throw new Error('Stale account response');
      setBaseContactEmail(data.user.contactEmail);
      setBaseVersion(data.user.updatedAt);
      setConflict(false);
      setCurrentPassword('');
      setError(null);
      setNotice(
        `Adresse actuellement enregistrée : ${data.user.contactEmail ?? 'Non renseignée'}. Votre saisie est conservée ; vérifiez-la avant de confirmer.`,
      );
      void onSuccess(data.user).catch(() => {
        if (mountedRef.current)
          setError(
            'Version relue. La vue du compte n’a pas pu être actualisée.',
          );
      });
      focusField();
    } catch (failure) {
      if (!mountedRef.current || requestRef.current !== controller) return;
      setError(
        'Impossible de relire le compte. Réessayez ; votre saisie est conservée.',
      );
      if (
        failure instanceof ApiClientError &&
        (failure.status === 401 || failure.status === 403)
      )
        void onAccessDenied().catch(() => {});
    } finally {
      clearTimeout(timeout);
      if (requestRef.current === controller) {
        requestRef.current = null;
        submissionRef.current = false;
        if (mountedRef.current) setIsRefreshing(false);
      }
    }
  };

  const requestClose = (): void => {
    if (submissionRef.current) return;

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
    if (submissionRef.current || !mountedRef.current || !open || conflict)
      return;
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
    if (!baseVersion || !Number.isFinite(new Date(baseVersion).getTime())) {
      setConflict(true);
      setError('Actualisez la version du compte avant de confirmer.');

      return;
    }
    if (isConfirmingRemoval && !currentNormalizedContactEmail) return;

    const contactEmailToSave = isConfirmingRemoval
      ? null
      : normalizedContactEmail;

    const controller = new AbortController();
    requestRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      submissionRef.current = true;
      setIsSaving(true);
      const data = await apiFetchJson<{ user: UserType }>(
        RoutesApi.contactEmail,
        {
          body: JSON.stringify({
            contactEmail: contactEmailToSave,
            currentPassword,
            expectedUpdatedAt: new Date(baseVersion).toISOString(),
          }),
          headers: { 'Content-Type': 'application/json' },
          method: 'PATCH',
          signal: controller.signal,
        },
      );
      if (!mountedRef.current || requestRef.current !== controller) return;
      if (
        controller.signal.aborted ||
        !isAccountFormSnapshot(data.user, userId)
      )
        throw new Error('Invalid contact response');
      setCurrentPassword('');
      toast.success(
        isConfirmingRemoval
          ? 'Adresse de contact supprimée'
          : 'Adresse de contact mise à jour',
      );
      void onSuccess(data.user).catch(() => {
        if (mountedRef.current)
          toast.error(
            'Adresse enregistrée. La vue du compte n’a pas pu être actualisée.',
          );
      });
      onCancel();
    } catch (failure) {
      if (!mountedRef.current || requestRef.current !== controller) return;
      const uncertain =
        !(failure instanceof ApiClientError) ||
        failure.status >= 500 ||
        failure.code === 'INVALID_RESPONSE';
      setConflict(
        uncertain ||
          (failure instanceof ApiClientError && failure.status === 409),
      );
      setCurrentPassword('');
      setError(
        uncertain
          ? 'La réponse n’a pas pu être confirmée. L’adresse a peut-être été modifiée. Actualisez la version avant de réessayer.'
          : failure.message,
      );
      if (
        failure instanceof ApiClientError &&
        (failure.status === 401 || failure.status === 403)
      )
        void onAccessDenied().catch(() => {});
      focusField(true);
    } finally {
      clearTimeout(timeout);
      if (requestRef.current === controller) {
        requestRef.current = null;
        submissionRef.current = false;
        if (mountedRef.current) setIsSaving(false);
      }
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
        <DialogContent
          className="overflow-y-auto p-0 sm:max-w-md"
          onCloseAutoFocus={restoreFocus}
        >
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

            <form
              ref={formRef}
              aria-busy={busy || undefined}
              className="mt-4 space-y-4"
              onSubmit={handleSubmit}
              {...passwordManagerIgnoreAttributes}
            >
              {error && (
                <div
                  className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border p-3 text-sm"
                  aria-live="polite"
                  role="alert"
                >
                  {error}
                </div>
              )}
              {notice && (
                <p className="text-muted-foreground text-xs" role="status">
                  {notice}
                </p>
              )}
              {conflict && (
                <Button
                  disabled={busy}
                  onClick={() => void reloadVersion()}
                  type="button"
                  variant="outline"
                >
                  {isRefreshing ? 'Actualisation…' : 'Actualiser la version'}
                </Button>
              )}

              {isConfirmingRemoval ? (
                <div className="border-destructive/30 bg-destructive/10 rounded-md border p-3">
                  <p className="text-foreground text-sm font-medium">
                    Confirmer la suppression de cette adresse ?
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm break-all">
                    {baseContactEmail}
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
                    autoCorrect="off"
                    autoFocus
                    disabled={busy}
                    id="account-contact-email"
                    inputMode="email"
                    maxLength={CONTACT_EMAIL_MAX_LENGTH}
                    onChange={(event) =>
                      setNextContactEmail(event.target.value)
                    }
                    placeholder="nom@exemple.fr"
                    required
                    spellCheck={false}
                    type="text"
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
                  {baseContactEmail && (
                    <Button
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive px-0"
                      disabled={busy}
                      onClick={() => {
                        setError(null);
                        setIsConfirmingRemoval(true);
                        focusField(true);
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
                  autoFocus={isConfirmingRemoval}
                  disabled={busy}
                  id="account-contact-current-password"
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  placeholder="Confirmez votre identité"
                  required
                  autoComplete="current-password"
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

              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button
                  className="flex-1"
                  disabled={busy}
                  onClick={() => {
                    if (isConfirmingRemoval) {
                      setError(null);
                      setIsConfirmingRemoval(false);
                      focusField();

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
        <AlertDialogContent className="overflow-y-auto p-0">
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
