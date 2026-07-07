'use client';

import {
  AlertTriangle,
  Briefcase,
  Building2,
  CalendarDays,
  Globe2,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Save,
  User,
} from 'lucide-react';
import React, { type FC } from 'react';

import { SectionPanel } from '$components/layout/SectionPanel';
import { Badge } from '$ui/badge';
import { Button } from '$ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '$ui/card';
import { Input } from '$ui/input';
import { Label } from '$ui/label';
import { Textarea } from '$ui/textarea';

export type StaffProfileForm = {
  department: string;
  discordId: string;
  displayName: string;
  internalNote: string;
  jobTitle: string;
  joinedAt: string;
  phone: string;
  timezone: string;
};

export type ProfileForm = {
  email: string;
  firstName: string;
  lastName: string;
  staffProfile: StaffProfileForm;
};

type ProfileErrors = {
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  staffProfile: Record<keyof StaffProfileForm, string | null>;
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
  const canEditEmailField = canEdit && canEditEmail;
  const emailHint = !canEdit
    ? 'Email en lecture seule pour votre niveau d’accès.'
    : canEditEmail
      ? "Modifier cet email change l'identifiant utilisé à la connexion."
      : "Modifier l'email d'un administrateur est réservé au superadmin.";

  const updateStaffProfile = (
    field: keyof StaffProfileForm,
    value: string,
  ): void => {
    setForm({
      ...form,
      staffProfile: {
        ...form.staffProfile,
        [field]: value,
      },
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    onSave();
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card className="border-sidebar-border/70 overflow-hidden rounded-xl py-0">
        <CardHeader className="border-sidebar-border/65 bg-surface-muted flex-row items-center justify-between border-b p-3 sm:p-4">
          <div>
            <CardTitle className="text-sm">Profil staff</CardTitle>
          </div>
          {!canEdit && (
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
                    autoComplete="given-name"
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
                    autoComplete="family-name"
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
              <div className="space-y-1.5">
                <Label
                  htmlFor="user-display-name"
                  className="text-muted-foreground text-xs"
                >
                  Nom affiché
                </Label>
                <Input
                  id="user-display-name"
                  value={form.staffProfile.displayName}
                  maxLength={80}
                  placeholder="Coach Jean"
                  onChange={(event) =>
                    updateStaffProfile('displayName', event.target.value)
                  }
                  disabled={!canEdit}
                  aria-invalid={!!errors.staffProfile.displayName}
                  aria-describedby={
                    errors.staffProfile.displayName
                      ? 'user-display-name-error'
                      : undefined
                  }
                  className={inputClassName}
                />
                {errors.staffProfile.displayName && (
                  <FieldError id="user-display-name-error">
                    {errors.staffProfile.displayName}
                  </FieldError>
                )}
              </div>
            </SectionPanel>
            <SectionPanel icon={<Mail className="size-3.5" />} title="Contact">
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
                  autoComplete="email"
                  placeholder="jean.dupont@exemple.fr"
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                  disabled={!canEditEmailField}
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
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="user-discord"
                    className="text-muted-foreground text-xs"
                  >
                    ID Discord
                  </Label>
                  <div className="relative">
                    <MessageCircle className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
                    <Input
                      id="user-discord"
                      value={form.staffProfile.discordId}
                      maxLength={20}
                      inputMode="numeric"
                      placeholder="123456789012345678"
                      onChange={(event) =>
                        updateStaffProfile('discordId', event.target.value)
                      }
                      disabled={!canEdit}
                      aria-invalid={!!errors.staffProfile.discordId}
                      aria-describedby={
                        errors.staffProfile.discordId
                          ? 'user-discord-error'
                          : undefined
                      }
                      className={`${inputClassName} pl-9`}
                    />
                  </div>
                  {errors.staffProfile.discordId && (
                    <FieldError id="user-discord-error">
                      {errors.staffProfile.discordId}
                    </FieldError>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="user-phone"
                    className="text-muted-foreground text-xs"
                  >
                    Téléphone
                  </Label>
                  <div className="relative">
                    <Phone className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
                    <Input
                      id="user-phone"
                      type="tel"
                      value={form.staffProfile.phone}
                      maxLength={32}
                      autoComplete="tel"
                      placeholder="+33 6 12 34 56 78"
                      onChange={(event) =>
                        updateStaffProfile('phone', event.target.value)
                      }
                      disabled={!canEdit}
                      aria-invalid={!!errors.staffProfile.phone}
                      aria-describedby={
                        errors.staffProfile.phone
                          ? 'user-phone-error'
                          : undefined
                      }
                      className={`${inputClassName} pl-9`}
                    />
                  </div>
                  {errors.staffProfile.phone && (
                    <FieldError id="user-phone-error">
                      {errors.staffProfile.phone}
                    </FieldError>
                  )}
                </div>
              </div>
            </SectionPanel>
          </div>
          <SectionPanel
            icon={<Briefcase className="size-3.5" />}
            title="Organisation"
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="user-job-title"
                  className="text-muted-foreground text-xs"
                >
                  Poste
                </Label>
                <div className="relative">
                  <Briefcase className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
                  <Input
                    id="user-job-title"
                    value={form.staffProfile.jobTitle}
                    maxLength={80}
                    placeholder="Responsable finances"
                    onChange={(event) =>
                      updateStaffProfile('jobTitle', event.target.value)
                    }
                    disabled={!canEdit}
                    aria-invalid={!!errors.staffProfile.jobTitle}
                    aria-describedby={
                      errors.staffProfile.jobTitle
                        ? 'user-job-title-error'
                        : undefined
                    }
                    className={`${inputClassName} pl-9`}
                  />
                </div>
                {errors.staffProfile.jobTitle && (
                  <FieldError id="user-job-title-error">
                    {errors.staffProfile.jobTitle}
                  </FieldError>
                )}
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="user-department"
                  className="text-muted-foreground text-xs"
                >
                  Pôle
                </Label>
                <div className="relative">
                  <Building2 className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
                  <Input
                    id="user-department"
                    value={form.staffProfile.department}
                    maxLength={80}
                    placeholder="Direction"
                    onChange={(event) =>
                      updateStaffProfile('department', event.target.value)
                    }
                    disabled={!canEdit}
                    aria-invalid={!!errors.staffProfile.department}
                    aria-describedby={
                      errors.staffProfile.department
                        ? 'user-department-error'
                        : undefined
                    }
                    className={`${inputClassName} pl-9`}
                  />
                </div>
                {errors.staffProfile.department && (
                  <FieldError id="user-department-error">
                    {errors.staffProfile.department}
                  </FieldError>
                )}
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="user-timezone"
                  className="text-muted-foreground text-xs"
                >
                  Fuseau horaire
                </Label>
                <div className="relative">
                  <Globe2 className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
                  <Input
                    id="user-timezone"
                    value={form.staffProfile.timezone}
                    maxLength={64}
                    placeholder="Europe/Paris"
                    onChange={(event) =>
                      updateStaffProfile('timezone', event.target.value)
                    }
                    disabled={!canEdit}
                    aria-invalid={!!errors.staffProfile.timezone}
                    aria-describedby={
                      errors.staffProfile.timezone
                        ? 'user-timezone-error'
                        : undefined
                    }
                    className={`${inputClassName} pl-9`}
                  />
                </div>
                {errors.staffProfile.timezone && (
                  <FieldError id="user-timezone-error">
                    {errors.staffProfile.timezone}
                  </FieldError>
                )}
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="user-joined-at"
                  className="text-muted-foreground text-xs"
                >
                  Arrivée staff
                </Label>
                <div className="relative">
                  <CalendarDays className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
                  <Input
                    id="user-joined-at"
                    type="date"
                    value={form.staffProfile.joinedAt}
                    placeholder="2026-06-21"
                    onChange={(event) =>
                      updateStaffProfile('joinedAt', event.target.value)
                    }
                    disabled={!canEdit}
                    aria-invalid={!!errors.staffProfile.joinedAt}
                    aria-describedby={
                      errors.staffProfile.joinedAt
                        ? 'user-joined-at-error'
                        : undefined
                    }
                    className={`${inputClassName} pl-9`}
                  />
                </div>
                {errors.staffProfile.joinedAt && (
                  <FieldError id="user-joined-at-error">
                    {errors.staffProfile.joinedAt}
                  </FieldError>
                )}
              </div>
            </div>
          </SectionPanel>
          <SectionPanel
            icon={<MessageCircle className="size-3.5" />}
            title="Note interne"
          >
            <div className="space-y-1.5">
              <Label htmlFor="user-internal-note" className="sr-only">
                Note interne
              </Label>
              <Textarea
                id="user-internal-note"
                value={form.staffProfile.internalNote}
                maxLength={1000}
                rows={4}
                placeholder="Informations utiles pour le staff, contexte interne, responsabilités ou remarques administratives."
                onChange={(event) =>
                  updateStaffProfile('internalNote', event.target.value)
                }
                disabled={!canEdit}
                aria-invalid={!!errors.staffProfile.internalNote}
                aria-describedby={
                  errors.staffProfile.internalNote
                    ? 'user-internal-note-error user-internal-note-count'
                    : 'user-internal-note-count'
                }
                className={`${inputClassName} min-h-24 resize-y`}
              />
              <div className="flex items-center justify-between gap-3">
                {errors.staffProfile.internalNote ? (
                  <FieldError id="user-internal-note-error">
                    {errors.staffProfile.internalNote}
                  </FieldError>
                ) : (
                  <span />
                )}
                <span
                  id="user-internal-note-count"
                  className="text-muted-foreground ml-auto text-xs"
                >
                  {form.staffProfile.internalNote.length}/1000
                </span>
              </div>
            </div>
          </SectionPanel>
        </CardContent>
        <CardFooter className="border-sidebar-border/65 bg-surface-muted justify-between gap-3 border-t p-3 sm:p-4">
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
