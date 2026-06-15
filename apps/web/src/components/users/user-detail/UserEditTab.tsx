'use client';

import { UserRole } from '@repo/database';
import { Loader2, Mail, Save, Shield, User } from 'lucide-react';
import React, { type FC } from 'react';

import type { UserType } from '$types/auth.types';
import { Button } from '$ui/button';
import { Card, CardContent } from '$ui/card';
import { Input } from '$ui/input';
import { Label } from '$ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '$ui/select';
import { Switch } from '$ui/switch';

type EditForm = {
  email: string;
  firstName: string;
  isActive: boolean;
  lastName: string;
  role: UserRole;
};

type UserEditTabProps = {
  canEdit: boolean;
  currentUserId: string | undefined;
  editForm: EditForm;
  isCurrentUserProtected: boolean | undefined;
  isSaving: boolean;
  onDelete: () => void;
  onResetPassword: () => void;
  onSave: () => void;
  setEditForm: (form: EditForm) => void;
  tempPassword: string | null;
  user: UserType;
};

// ============================================
// SECTION HEADER COMPONENT
// ============================================

const SectionHeader: FC<{
  children: React.ReactNode;
  icon: React.ReactNode;
}> = ({ children, icon }) => (
  <h4 className="text-foreground mb-2 flex items-center gap-2 text-sm font-medium">
    <span className="bg-primary/20 text-primary flex h-6 w-6 items-center justify-center rounded-md">
      {icon}
    </span>
    {children}
  </h4>
);

// ============================================
// COMPONENT
// ============================================

export const UserEditTab: FC<UserEditTabProps> = ({
  canEdit,
  currentUserId,
  editForm,
  isCurrentUserProtected,
  isSaving,
  onSave,
  setEditForm,
  tempPassword,
  user,
}) => {
  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
        {/* Temp Password Alert */}
        {tempPassword && (
          <Card className="overflow-hidden rounded-lg border-emerald-500/20 bg-emerald-500/10">
            <CardContent className="p-4">
              <p className="mb-2 font-medium text-emerald-400">
                Nouveau mot de passe temporaire :
              </p>
              <code className="bg-card text-foreground block rounded-lg p-2 font-mono text-lg">
                {tempPassword}
              </code>
              <p className="text-muted-foreground mt-2 text-xs">
                Communiquez ce mot de passe a l&apos;utilisateur.
              </p>
            </CardContent>
          </Card>
        )}
        {/* Profil */}
        <div className="space-y-2">
          <SectionHeader icon={<User className="h-3.5 w-3.5" />}>
            Profil
          </SectionHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs" required>
                  Prenom
                </Label>
                <Input
                  value={editForm.firstName}
                  onChange={(e) =>
                    setEditForm({ ...editForm, firstName: e.target.value })
                  }
                  disabled={!canEdit}
                  className="border-border bg-card"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs" required>
                  Nom
                </Label>
                <Input
                  value={editForm.lastName}
                  onChange={(e) =>
                    setEditForm({ ...editForm, lastName: e.target.value })
                  }
                  disabled={!canEdit}
                  className="border-border bg-card"
                />
              </div>
            </div>
          </div>
        </div>
        {/* Contact */}
        <div className="space-y-2">
          <SectionHeader icon={<Mail className="h-3.5 w-3.5" />}>
            Contact
          </SectionHeader>
          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs" required>
              Email
            </Label>
            <Input
              type="email"
              value={editForm.email}
              onChange={(e) =>
                setEditForm({ ...editForm, email: e.target.value })
              }
              disabled={!canEdit}
              className="border-border bg-card"
            />
          </div>
        </div>
        {/* Role & Permissions */}
        <div className="space-y-2">
          <SectionHeader icon={<Shield className="h-3.5 w-3.5" />}>
            Role et acces
          </SectionHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs" required>
                Role (identification uniquement)
              </Label>
              {user.isProtected ? (
                <Input
                  value="Superadmin"
                  disabled
                  className="border-border bg-card"
                />
              ) : (
                <Select
                  value={editForm.role}
                  onValueChange={(v) =>
                    setEditForm({ ...editForm, role: v as UserRole })
                  }
                  disabled={!isCurrentUserProtected}
                >
                  <SelectTrigger className="border-border bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">Utilisateur</SelectItem>
                    <SelectItem value="ADMIN">Administrateur</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <p className="text-muted-foreground text-xs">
                Le superadmin est le compte technique protege. Les autres droits
                sont definis dans l&apos;onglet Permissions.
              </p>
            </div>
            <div className="border-border bg-background/35 flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-foreground text-sm font-medium">
                  Compte actif
                </Label>
                <p className="text-muted-foreground text-xs">
                  Les comptes inactifs ne peuvent pas se connecter
                </p>
              </div>
              <Switch
                checked={editForm.isActive}
                onCheckedChange={(checked) =>
                  setEditForm({ ...editForm, isActive: checked })
                }
                disabled={!canEdit || user.id === currentUserId}
              />
            </div>
          </div>
        </div>
      </div>
      {/* Footer Actions */}
      <div className="border-border flex shrink-0 items-center justify-end gap-2 border-t p-4">
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
