'use client';

import {
  AlertTriangle,
  AtSign,
  Edit,
  Loader2,
  Mail,
  Save,
  User,
} from 'lucide-react';
import React, { type FC, useEffect, useRef, useState } from 'react';

import { SectionPanel } from '$components/layout/SectionPanel';
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
import { Card, CardContent, CardFooter, CardHeader } from '$ui/card';
import { Input } from '$ui/input';
import { Label } from '$ui/label';
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
  canSave: boolean;
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

const inputClassName = 'border-border/80 bg-input';

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
  canSave,
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
  const [isEditing, setIsEditing] = useState(false);
  const wasSavingRef = useRef(false);
  const canEditAnything = canEdit || canEditContact || canEditLogin;

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

  useEffect(() => {
    if (wasSavingRef.current && !isSaving && !hasChanges) {
      setIsEditing(false);
    }
    wasSavingRef.current = isSaving;
  }, [hasChanges, isSaving]);

  const loginHint = canEditLogin
    ? "Modifier l'identifiant déconnectera l'utilisateur de ses sessions actives."
    : loginReadOnlyHint;
  const contactHint = canEditContact
    ? "Adresse facultative, distincte de l'identifiant de connexion."
    : "L'email de contact est en lecture seule depuis cette fiche.";

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

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
      <Card className="border-border/70 overflow-hidden rounded-lg py-0">
        <CardHeader className="border-border/65 bg-surface-muted border-b p-4">
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

  if (!isEditing) {
    return (
      <Card className="border-border/70 overflow-hidden rounded-lg py-0">
        <CardHeader className="border-border/65 bg-surface-muted flex-row items-center justify-between gap-3 border-b p-3 sm:p-4">
          <h2 className="text-sm font-semibold">Profil utilisateur</h2>
          {canEditAnything ? (
            <Button
              onClick={() => setIsEditing(true)}
              size="sm"
              type="button"
              variant="outline"
            >
              <Edit className="size-4" />
              Modifier
            </Button>
          ) : (
            <Badge
              variant="outline"
              className="border-muted-foreground/35 bg-muted/30 text-muted-foreground"
            >
              Lecture seule
            </Badge>
          )}
        </CardHeader>
        <CardContent className="p-3 sm:p-4">
          <dl className="divide-border/60 divide-y">
            <div className="grid gap-1 py-3 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-4">
              <dt className="text-muted-foreground text-sm">Identité</dt>
              <dd className="text-foreground text-sm font-medium sm:text-right">
                {form.firstName} {form.lastName}
              </dd>
            </div>
            <div className="grid gap-1 py-3 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-4">
              <dt className="text-muted-foreground text-sm">
                Identifiant de connexion
              </dt>
              <dd className="text-foreground font-mono text-sm break-all sm:text-right">
                {form.loginName}
              </dd>
            </div>
            <div className="grid gap-1 py-3 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-4">
              <dt className="text-muted-foreground text-sm">
                Email de contact
              </dt>
              <dd className="text-foreground text-sm break-all sm:text-right">
                {canViewContact
                  ? form.contactEmail || 'Non renseigné'
                  : 'Masqué — permission requise'}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    );
  }

  return (
    <form {...passwordManagerIgnoreAttributes} onSubmit={handleSubmit}>
      <Card className="border-border/70 overflow-hidden rounded-lg py-0">
        <CardHeader className="border-border/65 bg-surface-muted flex-row items-center justify-between border-b p-3 sm:p-4">
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
        <CardContent className="space-y-3 p-3 sm:p-4">
          <div className="grid gap-3 xl:grid-cols-2">
            <SectionPanel icon={<User className="size-3.5" />} title="Identité">
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
                    className={inputClassName}
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
                    required
                  >
                    Nom
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
                    className={inputClassName}
                  />
                  {errors.lastName && (
                    <FieldError id="user-last-name-error">
                      {errors.lastName}
                    </FieldError>
                  )}
                </div>
              </div>
            </SectionPanel>
            <SectionPanel
              icon={<AtSign className="size-3.5" />}
              title="Connexion et contact"
            >
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
                    className={`${inputClassName} font-mono`}
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
                        type="email"
                        value={form.contactEmail}
                        onChange={(event) =>
                          setForm({ ...form, contactEmail: event.target.value })
                        }
                        className={`${inputClassName} pl-9`}
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
            </SectionPanel>
          </div>
        </CardContent>
        {(canEdit || canEditContact || canEditLogin) && (
          <CardFooter className="border-border/60 bg-surface-muted/95 flex-col items-stretch justify-between gap-3 rounded-b-lg border-t p-3 sm:flex-row sm:items-center sm:p-4">
            <p className="text-muted-foreground text-xs">
              {hasChanges ? 'Modifications non enregistrées' : 'À jour'}
            </p>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onCancel();
                  setIsEditing(false);
                }}
                disabled={!hasChanges || isSaving}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSaving || !canSave}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isSaving ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-1.5 h-4 w-4" />
                )}
                Enregistrer
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
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
              Cette adresse ne pourra plus recevoir de notifications pour ce
              compte. L&apos;identifiant de connexion ne sera pas modifié.
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
