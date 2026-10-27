'use client';

import { AlertTriangle, AtSign, LogIn, Mail, UserRound } from 'lucide-react';
import React, { type FC, useEffect, useRef, useState } from 'react';

import { RubricCard } from '$components/layout/RubricCard';
import { SectionActionBar } from '$components/layout/SectionActionBar';
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
import { Input } from '$ui/input';
import { Label } from '$ui/label';
import { StatusBadge } from '$ui/status-badge';
import { passwordManagerIgnoreAttributes } from '$utils/autofill.utils';

export type ProfileForm = {
  contactEmail: string;
  firstName: string;
  lastName: string;
  loginName: string;
};

type ProfileErrors = {
  contactEmail: string | null;
  firstName: string | null;
  lastName: string | null;
  loginName: string | null;
};

type UserProfileTabProps = {
  canEdit: boolean;
  canEditContact: boolean;
  canEditLogin: boolean;
  canSave?: boolean;
  canViewContact: boolean;
  errors: ProfileErrors;
  form: ProfileForm;
  hasChanges: boolean;
  isRefreshing?: boolean;
  isSaving: boolean;
  isSelf?: boolean;
  loginReadOnlyHint: string;
  onCancel: () => void;
  onSave: () => void;
  /** Saved login, to warn about the sessions only once it is changed. */
  savedLoginName: string;
  setForm: (form: ProfileForm) => void;
};

const FieldError: FC<{ children: React.ReactNode; id: string }> = ({
  children,
  id,
}) => (
  <p id={id} className="text-destructive text-xs">
    {children}
  </p>
);

export const UserProfileTab: FC<UserProfileTabProps> = ({
  canEdit,
  canEditContact,
  canEditLogin,
  canSave = true,
  canViewContact,
  errors,
  form,
  hasChanges,
  isRefreshing = false,
  isSaving,
  isSelf = false,
  loginReadOnlyHint,
  onCancel,
  onSave,
  savedLoginName,
  setForm,
}) => {
  const formRef = useRef<HTMLFormElement>(null);
  const [contactRemovalIntent, setContactRemovalIntent] = useState<
    'save' | 'stage' | null
  >(null);
  const [isContactRemovalConfirmed, setIsContactRemovalConfirmed] =
    useState(false);
  const [committedContactEmail, setCommittedContactEmail] = useState(
    form.contactEmail.trim(),
  );
  useEffect(() => {
    if (!hasChanges) {
      setCommittedContactEmail(form.contactEmail.trim());
      setIsContactRemovalConfirmed(false);
    }
  }, [form.contactEmail, hasChanges]);

  useEffect(() => {
    if (form.contactEmail.trim()) {
      setIsContactRemovalConfirmed(false);
    }
  }, [form.contactEmail]);

  // The consequence is a warning only once the login actually changes.
  const loginChanged = canEditLogin && form.loginName.trim() !== savedLoginName;
  const loginHint = !canEditLogin
    ? loginReadOnlyHint
    : loginChanged
      ? "L'utilisateur devra utiliser ce nouvel identifiant à sa prochaine connexion."
      : "Sert à la connexion de l'utilisateur.";
  const contactHint = canEditContact
    ? "Adresse facultative, distincte de l'identifiant de connexion."
    : "L'email de contact est en lecture seule depuis cette fiche.";

  const submitProfile = (): void => {
    if (isSaving || !canSave) return;
    const removesExistingContact =
      canEditContact &&
      committedContactEmail.length > 0 &&
      form.contactEmail.trim().length === 0;

    if (removesExistingContact && !isContactRemovalConfirmed) {
      setContactRemovalIntent('save');

      return;
    }

    onSave();
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    submitProfile();
  };

  const handleCancel = (): void => {
    onCancel();
    requestAnimationFrame(() => {
      const field = formRef.current?.querySelector<HTMLInputElement>(
        'input:not(:disabled)',
      );
      const heading = formRef.current?.querySelector<HTMLElement>('h2');
      (field ?? heading)?.focus();
    });
  };

  const handleConfirmContactRemoval = (): void => {
    const intent = contactRemovalIntent;

    setContactRemovalIntent(null);
    setIsContactRemovalConfirmed(true);

    if (intent === 'stage') {
      setForm({ ...form, contactEmail: '' });

      return;
    }

    if (intent === 'save') {
      onSave();
    }
  };

  if (isSelf) {
    return (
      <div className="space-y-3">
        {/* Reading view: description lists, no title repeating the link. */}
        <h2 className="sr-only">Profil</h2>
        <RubricCard
          icon={<UserRound />}
          id="profile-identity-title"
          title="Identité"
        >
          <dl>
            <div className="min-w-0">
              <dt className="text-muted-foreground text-xs">Nom</dt>
              <dd className="text-foreground mt-1 text-sm font-medium break-words">
                {form.firstName} {form.lastName}
              </dd>
            </div>
          </dl>
        </RubricCard>
        <RubricCard
          icon={<LogIn />}
          id="profile-connection-title"
          title="Connexion et contact"
        >
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <div className="min-w-0">
              <dt className="text-muted-foreground text-xs">
                Identifiant de connexion
              </dt>
              <dd className="text-foreground mt-1 font-mono text-sm break-all">
                {form.loginName}
              </dd>
            </div>
            {canViewContact && (
              <div className="min-w-0">
                <dt className="text-muted-foreground text-xs">
                  Email de contact
                </dt>
                <dd className="text-foreground mt-1 text-sm break-all">
                  {form.contactEmail || 'Non renseigné'}
                </dd>
              </div>
            )}
          </dl>
        </RubricCard>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      {...passwordManagerIgnoreAttributes}
      data-user-profile-form
      noValidate
      aria-busy={isSaving}
      onSubmit={handleSubmit}
    >
      {/* The section link already names the section: no visible title. */}
      <h2 className="sr-only" tabIndex={-1}>
        Profil
      </h2>
      <div className="space-y-3">
        <RubricCard
          aside={
            !canEdit &&
            !canEditContact &&
            !canEditLogin && (
              <StatusBadge tone="muted">Lecture seule</StatusBadge>
            )
          }
          icon={<UserRound />}
          id="profile-identity-title"
          title="Identité"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="user-first-name" required>
                Prénom
              </Label>
              <Input
                id="user-first-name"
                value={form.firstName}
                maxLength={50}
                {...passwordManagerIgnoreAttributes}
                placeholder="Jean"
                onChange={(event) =>
                  setForm({ ...form, firstName: event.target.value })
                }
                disabled={!canEdit || isSaving}
                aria-invalid={!!errors.firstName}
                aria-describedby={
                  errors.firstName ? 'user-first-name-error' : undefined
                }
              />
              {errors.firstName && (
                <FieldError id="user-first-name-error">
                  {errors.firstName}
                </FieldError>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-last-name">
                Nom <span className="font-normal">(facultatif)</span>
              </Label>
              <Input
                id="user-last-name"
                value={form.lastName}
                maxLength={50}
                {...passwordManagerIgnoreAttributes}
                placeholder="Dupont"
                onChange={(event) =>
                  setForm({ ...form, lastName: event.target.value })
                }
                disabled={!canEdit || isSaving}
                aria-invalid={!!errors.lastName}
                aria-describedby={
                  errors.lastName ? 'user-last-name-error' : undefined
                }
              />
              {errors.lastName && (
                <FieldError id="user-last-name-error">
                  {errors.lastName}
                </FieldError>
              )}
            </div>
          </div>
        </RubricCard>

        <RubricCard
          icon={<LogIn />}
          id="profile-connection-title"
          title="Connexion et contact"
        >
          <div className="grid items-start gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="user-login-name" required>
                Identifiant de connexion
              </Label>
              <div className="relative">
                <AtSign
                  aria-hidden="true"
                  className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2"
                />
                <Input
                  aria-describedby={
                    errors.loginName
                      ? 'user-login-name-error'
                      : 'user-login-name-hint'
                  }
                  aria-invalid={!!errors.loginName}
                  autoCapitalize="none"
                  autoCorrect="off"
                  disabled={!canEditLogin || isSaving}
                  id="user-login-name"
                  maxLength={32}
                  {...passwordManagerIgnoreAttributes}
                  placeholder="jean.dupont"
                  spellCheck={false}
                  type="text"
                  value={form.loginName}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      loginName: event.target.value.toLowerCase(),
                    })
                  }
                  className="pl-9"
                />
              </div>
              {errors.loginName ? (
                <FieldError id="user-login-name-error">
                  {errors.loginName}
                </FieldError>
              ) : (
                <p
                  id="user-login-name-hint"
                  className={
                    loginChanged
                      ? 'text-muted-foreground border-warning/25 bg-warning/10 flex items-start gap-2 rounded-md border px-2.5 py-2 text-xs'
                      : 'text-muted-foreground text-xs'
                  }
                >
                  {loginChanged && (
                    <AlertTriangle className="text-warning mt-0.5 size-3.5 shrink-0" />
                  )}
                  <span>{loginHint}</span>
                </p>
              )}
            </div>
            {canViewContact ? (
              <div className="space-y-1.5">
                <Label htmlFor="user-contact-email">
                  Email de contact{' '}
                  <span className="font-normal">(facultatif)</span>
                </Label>
                <div className="relative">
                  <Mail
                    aria-hidden="true"
                    className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2"
                  />
                  <Input
                    aria-describedby={
                      errors.contactEmail
                        ? 'user-contact-email-error'
                        : 'user-contact-email-hint'
                    }
                    aria-invalid={!!errors.contactEmail}
                    disabled={!canEditContact || isSaving}
                    id="user-contact-email"
                    maxLength={254}
                    {...passwordManagerIgnoreAttributes}
                    placeholder="Non renseigné"
                    inputMode="email"
                    type="text"
                    value={form.contactEmail}
                    onChange={(event) =>
                      setForm({ ...form, contactEmail: event.target.value })
                    }
                    className="pl-9"
                  />
                </div>
                {errors.contactEmail ? (
                  <FieldError id="user-contact-email-error">
                    {errors.contactEmail}
                  </FieldError>
                ) : (
                  <p
                    id="user-contact-email-hint"
                    className="text-muted-foreground text-xs"
                  >
                    {contactHint}
                  </p>
                )}
                {canEditContact && committedContactEmail.length > 0 && (
                  <Button
                    className="h-auto px-0 text-xs"
                    disabled={isSaving}
                    onClick={() => setContactRemovalIntent('stage')}
                    type="button"
                    variant="link"
                  >
                    Supprimer l&apos;adresse de contact
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <p className="text-muted-foreground text-xs font-medium">
                  Email de contact
                </p>
                <div className="bg-muted/30 text-muted-foreground rounded-md border px-3 py-2 text-sm">
                  Masqué — permission requise
                </div>
              </div>
            )}
          </div>
        </RubricCard>
      </div>
      {hasChanges && (
        <SectionActionBar
          conflict={!canSave}
          isResolvingConflict={isRefreshing}
          isSaving={isSaving && !isRefreshing}
          onCancel={handleCancel}
          saveType="submit"
        />
      )}
      <AlertDialog
        open={contactRemovalIntent !== null}
        onOpenChange={(open) => {
          if (!open) setContactRemovalIntent(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Supprimer l&apos;adresse de contact ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Ce compte n&apos;aura plus d&apos;adresse de contact enregistrée.
              L&apos;identifiant de connexion ne sera pas modifié.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Conserver l&apos;adresse</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmContactRemoval}
            >
              Supprimer l&apos;adresse
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
};
