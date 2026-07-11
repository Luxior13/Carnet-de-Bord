'use client';

import { AlertTriangle, Loader2, Mail, Save, User } from 'lucide-react';
import React, { type FC } from 'react';

import { SectionPanel } from '$components/layout/SectionPanel';
import { Badge } from '$ui/badge';
import { Button } from '$ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '$ui/card';
import { Input } from '$ui/input';
import { Label } from '$ui/label';
import { passwordManagerIgnoreAttributes } from '$utils/autofill.utils';

export type ProfileForm = {
  email: string;
  firstName: string;
  lastName: string;
};

type ProfileErrors = {
  email: string | null;
  firstName: string | null;
  lastName: string | null;
};

type UserProfileTabProps = {
  canEdit: boolean;
  canEditEmail: boolean;
  canSave: boolean;
  errors: ProfileErrors;
  form: ProfileForm;
  hasChanges: boolean;
  isSaving: boolean;
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
  canEditEmail,
  canSave,
  errors,
  form,
  hasChanges,
  isSaving,
  onCancel,
  onSave,
  setForm,
}) => {
  const emailHint = canEditEmail
    ? "Modifier cet email change l'identifiant utilise a la connexion."
    : "Email en lecture seule pour votre niveau d'acces.";

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    onSave();
  };

  return (
    <form {...passwordManagerIgnoreAttributes} onSubmit={handleSubmit}>
      <Card className="border-sidebar-border/70 overflow-hidden rounded-md py-0">
        <CardHeader className="border-sidebar-border/65 bg-surface-muted flex-row items-center justify-between border-b p-3 sm:p-4">
          <CardTitle className="text-sm">Compte utilisateur</CardTitle>
          {!canEdit && !canEditEmail && (
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
            <SectionPanel icon={<User className="size-3.5" />} title="Identite">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="user-first-name"
                    className="text-muted-foreground text-xs"
                    required
                  >
                    Prenom
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
              icon={<Mail className="size-3.5" />}
              title="Connexion"
            >
              <div className="space-y-1.5">
                <Label
                  htmlFor="user-email"
                  className="text-muted-foreground text-xs"
                  required
                >
                  Email de connexion
                </Label>
                <Input
                  id="user-email"
                  type="email"
                  value={form.email}
                  maxLength={254}
                  {...passwordManagerIgnoreAttributes}
                  placeholder="jean.dupont@exemple.fr"
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                  disabled={!canEditEmail}
                  aria-invalid={!!errors.email}
                  aria-describedby={
                    errors.email ? 'user-email-error' : 'user-email-hint'
                  }
                  className={inputClassName}
                />
                {errors.email ? (
                  <FieldError id="user-email-error">{errors.email}</FieldError>
                ) : (
                  <div
                    id="user-email-hint"
                    className="text-muted-foreground flex items-start gap-2 rounded-md border border-amber-500/25 bg-amber-500/10 px-2.5 py-2 text-xs"
                  >
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-400" />
                    <span>{emailHint}</span>
                  </div>
                )}
              </div>
            </SectionPanel>
          </div>
        </CardContent>
        <CardFooter className="border-sidebar-border/60 bg-surface-muted/95 sticky bottom-3 z-20 justify-between gap-3 rounded-b-lg border-t p-3 shadow-[var(--shadow-panel)] backdrop-blur sm:p-4">
          <p className="text-muted-foreground text-xs">
            {hasChanges ? 'Modifications non enregistrees' : 'A jour'}
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
