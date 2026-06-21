'use client';

import { Loader2, Mail, Save, User } from 'lucide-react';
import React, { type FC } from 'react';

import { Button } from '$ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '$ui/card';
import { Input } from '$ui/input';
import { Label } from '$ui/label';

type ProfileForm = {
  email: string;
  firstName: string;
  lastName: string;
};

type UserProfileTabProps = {
  canEdit: boolean;
  canSave: boolean;
  errors: {
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  };
  form: ProfileForm;
  hasChanges: boolean;
  isSaving: boolean;
  onCancel: () => void;
  onSave: () => void;
  setForm: (form: ProfileForm) => void;
};

const SectionTitle: FC<{
  children: React.ReactNode;
  icon: React.ReactNode;
}> = ({ children, icon }) => (
  <h3 className="text-foreground flex items-center gap-2 text-sm font-semibold">
    <span className="bg-primary/10 text-primary flex size-6 items-center justify-center rounded-md">
      {icon}
    </span>
    {children}
  </h3>
);

export const UserProfileTab: FC<UserProfileTabProps> = ({
  canEdit,
  canSave,
  errors,
  form,
  hasChanges,
  isSaving,
  onCancel,
  onSave,
  setForm,
}) => {
  return (
    <Card className="border-border/70 overflow-hidden rounded-lg bg-[#192132] py-0">
      <CardHeader className="border-border/60 border-b bg-[#212A3A] p-3 sm:p-4">
        <CardTitle className="text-sm">Profil utilisateur</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-3 sm:p-4">
        <div className="border-border/60 space-y-3 rounded-md border bg-[#12171E] p-3">
          <SectionTitle icon={<User className="size-3.5" />}>
            Identite
          </SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs" required>
                Prenom
              </Label>
              <Input
                id="user-first-name"
                value={form.firstName}
                onChange={(event) =>
                  setForm({ ...form, firstName: event.target.value })
                }
                disabled={!canEdit}
                aria-invalid={!!errors.firstName}
                aria-describedby={
                  errors.firstName ? 'user-first-name-error' : undefined
                }
                className="border-border bg-[#12171E]"
              />
              {errors.firstName && (
                <p
                  id="user-first-name-error"
                  className="text-destructive text-xs"
                >
                  {errors.firstName}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs" required>
                Nom
              </Label>
              <Input
                id="user-last-name"
                value={form.lastName}
                onChange={(event) =>
                  setForm({ ...form, lastName: event.target.value })
                }
                disabled={!canEdit}
                aria-invalid={!!errors.lastName}
                aria-describedby={
                  errors.lastName ? 'user-last-name-error' : undefined
                }
                className="border-border bg-[#12171E]"
              />
              {errors.lastName && (
                <p
                  id="user-last-name-error"
                  className="text-destructive text-xs"
                >
                  {errors.lastName}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="border-border/60 space-y-3 rounded-md border bg-[#12171E] p-3">
          <SectionTitle icon={<Mail className="size-3.5" />}>
            Contact
          </SectionTitle>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs" required>
              Email
            </Label>
            <Input
              id="user-email"
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm({ ...form, email: event.target.value })
              }
              disabled={!canEdit}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'user-email-error' : undefined}
              className="border-border bg-[#12171E]"
            />
            {errors.email && (
              <p id="user-email-error" className="text-destructive text-xs">
                {errors.email}
              </p>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-border/60 justify-between gap-3 border-t bg-[#212A3A] p-3 sm:p-4">
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
            type="button"
            size="sm"
            onClick={onSave}
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
  );
};
