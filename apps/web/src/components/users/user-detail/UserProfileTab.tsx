'use client';

import { AlertTriangle, Mail } from 'lucide-react';
import React, { type FC, useEffect, useState } from 'react';

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
import { Badge } from '$ui/badge';
import { Button } from '$ui/button';
import { Card, CardContent, CardHeader } from '$ui/card';
import { Input } from '$ui/input';
import { Label } from '$ui/label';
import { Separator } from '$ui/separator';
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
  canViewContact: boolean;
  errors: ProfileErrors;
  form: ProfileForm;
  hasChanges: boolean;
  isSaving: boolean;
  isSelf?: boolean;
  loginReadOnlyHint: string;
  onCancel: () => void;
  onSave: () => void;
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

const FormSectionTitle: FC<{ children: React.ReactNode; id: string }> = ({
  children,
  id,
}) => (
  <h3
    id={id}
    className="text-muted-foreground text-[11px] font-medium tracking-[0.08em] uppercase"
  >
    {children}
  </h3>
);

export const UserProfileTab: FC<UserProfileTabProps> = ({
  canEdit,
  canEditContact,
  canEditLogin,
  canViewContact,
  errors,
  form,
  hasChanges,
  isSaving,
  isSelf = false,
  loginReadOnlyHint,
  onCancel,
  onSave,
  setForm,
}) => {
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

  const loginHint = canEditLogin
    ? "Modifier l'identifiant déconnectera l'utilisateur de ses sessions actives."
    : loginReadOnlyHint;
  const contactHint = canEditContact
    ? "Adresse facultative, distincte de l'identifiant de connexion."
    : "L'email de contact est en lecture seule depuis cette fiche.";

  const submitProfile = (): void => {
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
      <Card>
        <CardHeader className="p-3.5 sm:p-4">
          <h2 className="text-sm font-semibold">Profil administratif</h2>
        </CardHeader>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2">
          <div className="border-border/60 bg-surface-inset rounded-md border p-3">
            <p className="text-muted-foreground text-xs">Identité</p>
            <p className="text-foreground mt-1 text-sm font-medium">
              {form.firstName} {form.lastName}
            </p>
          </div>
          <div className="border-border/60 bg-surface-inset rounded-md border p-3">
            <p className="text-muted-foreground text-xs">
              Identifiant de connexion
            </p>
            <p className="text-foreground mt-1 font-mono text-sm break-all">
              {form.loginName}
            </p>
          </div>
          {canViewContact && (
            <div className="border-border/60 bg-surface-inset rounded-md border p-3 sm:col-span-2">
              <p className="text-muted-foreground text-xs">Email de contact</p>
              <p className="text-foreground mt-1 text-sm break-all">
                {form.contactEmail || 'Non renseigné'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <form {...passwordManagerIgnoreAttributes} onSubmit={handleSubmit}>
      <Card>
        <CardHeader className="flex-row items-center justify-between p-3.5 sm:p-4">
          <h2 className="text-sm font-semibold">Profil utilisateur</h2>
          {!canEdit && !canEditContact && !canEditLogin && (
            <Badge
              variant="outline"
              className="border-muted-foreground/35 bg-muted/30 text-muted-foreground"
            >
              Lecture seule
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-5 p-4 sm:p-5">
          <section
            aria-labelledby="profile-identity-title"
            className="space-y-3"
          >
            <FormSectionTitle id="profile-identity-title">
              Identité
            </FormSectionTitle>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label
                  htmlFor="user-first-name"
                  className="text-muted-foreground text-xs"
                  required
                >
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
                  disabled={!canEdit}
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
                <Label
                  htmlFor="user-last-name"
                  className="text-muted-foreground text-xs"
                >
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
                  disabled={!canEdit}
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
          </section>

          <Separator />

          <section
            aria-labelledby="profile-connection-title"
            className="space-y-3"
          >
            <FormSectionTitle id="profile-connection-title">
              Connexion et contact
            </FormSectionTitle>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="user-login-name"
                  className="text-muted-foreground text-xs"
                  required
                >
                  Identifiant de connexion
                </Label>
                <Input
                  aria-describedby={
                    errors.loginName
                      ? 'user-login-name-error'
                      : 'user-login-name-hint'
                  }
                  aria-invalid={!!errors.loginName}
                  autoCapitalize="none"
                  autoCorrect="off"
                  disabled={!canEditLogin}
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
                  className="font-mono"
                />
                {errors.loginName ? (
                  <FieldError id="user-login-name-error">
                    {errors.loginName}
                  </FieldError>
                ) : (
                  <div
                    id="user-login-name-hint"
                    className="text-muted-foreground border-warning/25 bg-warning/10 flex items-start gap-2 rounded-md border px-2.5 py-2 text-xs"
                  >
                    <AlertTriangle className="text-warning mt-0.5 size-3.5 shrink-0" />
                    <span>{loginHint}</span>
                  </div>
                )}
              </div>
              {canViewContact ? (
                <div className="space-y-1.5">
                  <Label
                    htmlFor="user-contact-email"
                    className="text-muted-foreground text-xs"
                  >
                    Email de contact{' '}
                    <span className="font-normal">(facultatif)</span>
                  </Label>
                  <div className="relative">
                    <Mail className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
                    <Input
                      aria-describedby={
                        errors.contactEmail
                          ? 'user-contact-email-error'
                          : 'user-contact-email-hint'
                      }
                      aria-invalid={!!errors.contactEmail}
                      disabled={!canEditContact}
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
          </section>
        </CardContent>
      </Card>
      {hasChanges && (
        <SectionActionBar
          isSaving={isSaving}
          onCancel={onCancel}
          onSave={submitProfile}
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
