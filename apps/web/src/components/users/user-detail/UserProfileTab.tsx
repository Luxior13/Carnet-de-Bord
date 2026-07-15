'use client';

import { AlertTriangle, AtSign, Loader2, Mail, Save, User } from 'lucide-react';
import React, { type FC } from 'react';

import { SectionPanel } from '$components/layout/SectionPanel';
import { Badge } from '$ui/badge';
import { Button } from '$ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '$ui/card';
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
  loginReadOnlyHint,
  onCancel,
  onSave,
  setForm,
}) => {
  const loginHint = canEditLogin
    ? "Modifier l'identifiant déconnectera l'utilisateur de ses sessions actives."
    : loginReadOnlyHint;
  const contactHint = canEditContact
    ? "Adresse facultative, distincte de l'identifiant de connexion. Toute nouvelle adresse restera non vérifiée."
    : "L'email de contact est en lecture seule depuis cette fiche.";

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    onSave();
  };

  return (
    <form {...passwordManagerIgnoreAttributes} onSubmit={handleSubmit}>
      <Card className="border-sidebar-border/70 overflow-hidden rounded-md py-0">
        <CardHeader className="border-sidebar-border/65 bg-surface-muted flex-row items-center justify-between border-b p-3 sm:p-4">
          <CardTitle className="text-sm">Compte utilisateur</CardTitle>
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
                      className="text-muted-foreground flex items-start gap-2 rounded-md border border-amber-500/25 bg-amber-500/10 px-2.5 py-2 text-xs"
                    >
                      <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-400" />
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
        <CardFooter className="border-sidebar-border/60 bg-surface-muted/95 sticky bottom-3 z-20 justify-between gap-3 rounded-b-lg border-t p-3 shadow-[var(--shadow-panel)] backdrop-blur sm:p-4">
          <p className="text-muted-foreground text-xs">
            {hasChanges ? 'Modifications non enregistrées' : 'À jour'}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
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
      </Card>
    </form>
  );
};
