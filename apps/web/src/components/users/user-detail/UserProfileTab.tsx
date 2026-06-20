'use client';

import { Loader2, Mail, Save, User } from 'lucide-react';
import React, { type FC } from 'react';

import { Button } from '$ui/button';
import { Input } from '$ui/input';
import { Label } from '$ui/label';

type ProfileForm = {
  email: string;
  firstName: string;
  lastName: string;
};

type UserProfileTabProps = {
  canEdit: boolean;
  form: ProfileForm;
  isSaving: boolean;
  onSave: () => void;
  setForm: (form: ProfileForm) => void;
};

const SectionHeader: FC<{
  children: React.ReactNode;
  icon: React.ReactNode;
}> = ({ children, icon }) => (
  <h3 className="text-foreground flex items-center gap-2 text-sm font-medium">
    <span className="bg-primary/20 text-primary flex h-6 w-6 items-center justify-center rounded-md">
      {icon}
    </span>
    {children}
  </h3>
);

export const UserProfileTab: FC<UserProfileTabProps> = ({
  canEdit,
  form,
  isSaving,
  onSave,
  setForm,
}) => {
  return (
    <div className="space-y-6">
      <section className="border-border bg-card/70 rounded-lg border p-4 shadow-sm">
        <div className="space-y-4">
          <SectionHeader icon={<User className="h-3.5 w-3.5" />}>
            Identite
          </SectionHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs" required>
                Prenom
              </Label>
              <Input
                value={form.firstName}
                onChange={(event) =>
                  setForm({ ...form, firstName: event.target.value })
                }
                disabled={!canEdit}
                className="border-border bg-card"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs" required>
                Nom
              </Label>
              <Input
                value={form.lastName}
                onChange={(event) =>
                  setForm({ ...form, lastName: event.target.value })
                }
                disabled={!canEdit}
                className="border-border bg-card"
              />
            </div>
          </div>
        </div>
      </section>
      <section className="border-border bg-card/70 rounded-lg border p-4 shadow-sm">
        <div className="space-y-4">
          <SectionHeader icon={<Mail className="h-3.5 w-3.5" />}>
            Contact
          </SectionHeader>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs" required>
              Email
            </Label>
            <Input
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm({ ...form, email: event.target.value })
              }
              disabled={!canEdit}
              className="border-border bg-card"
            />
          </div>
        </div>
      </section>
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={onSave}
          disabled={isSaving || !canEdit}
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
    </div>
  );
};
