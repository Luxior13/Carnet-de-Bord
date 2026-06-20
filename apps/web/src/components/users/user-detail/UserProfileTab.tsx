'use client';

import { Loader2, Mail, Save, User } from 'lucide-react';
import React, { type FC } from 'react';

import { Button } from '$ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '$ui/card';
import { Input } from '$ui/input';
import { Label } from '$ui/label';
import { Separator } from '$ui/separator';

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

const SectionTitle: FC<{
  children: React.ReactNode;
  icon: React.ReactNode;
}> = ({ children, icon }) => (
  <h3 className="text-foreground flex items-center gap-2 text-sm font-semibold">
    <span className="bg-primary/10 text-primary flex size-7 items-center justify-center rounded-md">
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
    <Card className="border-border/70 bg-card/70 overflow-hidden rounded-lg py-0">
      <CardHeader className="border-border/60 border-b p-4">
        <CardTitle className="text-base">Profil utilisateur</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 p-4">
        <div className="space-y-4">
          <SectionTitle icon={<User className="size-3.5" />}>
            Identite
          </SectionTitle>
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
        <Separator />
        <div className="space-y-4">
          <SectionTitle icon={<Mail className="size-3.5" />}>
            Contact
          </SectionTitle>
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
      </CardContent>
      <CardFooter className="border-border/60 bg-background/20 justify-end border-t p-4">
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
      </CardFooter>
    </Card>
  );
};
