import {
  Activity,
  Calendar,
  Check,
  Clock,
  Key,
  Mail,
  Shield,
  X,
} from 'lucide-react';
import React, { type FC } from 'react';

import { getAccessLabel, getRoleColor } from '$constants/permissions.constants';
import type { UserAuditStats, UserType } from '$types/auth.types';
import { Badge } from '$ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '$ui/card';
import { Separator } from '$ui/separator';

type UserResumeTabProps = {
  auditStats: UserAuditStats | null;
  user: UserType;
};

export const UserResumeTab: FC<UserResumeTabProps> = ({ auditStats, user }) => {
  const formatDate = (date: Date | string | null): string => {
    if (!date) return 'Jamais';

    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-4">
      {/* Quick Stats */}
      {auditStats && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-border bg-card/70 overflow-hidden rounded-lg py-0">
            <CardContent className="p-4 text-center">
              <p className="text-foreground text-2xl font-bold">
                {auditStats.totalActions}
              </p>
              <p className="text-muted-foreground text-sm">Actions totales</p>
            </CardContent>
          </Card>
          <Card className="overflow-hidden rounded-lg border-emerald-500/20 bg-emerald-500/10 py-0">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-emerald-400">
                {auditStats.successfulLogins}
              </p>
              <p className="text-sm text-emerald-400/70">Connexions reussies</p>
            </CardContent>
          </Card>
          <Card className="overflow-hidden rounded-lg border-red-500/20 bg-red-500/10 py-0">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-400">
                {auditStats.failedLogins}
              </p>
              <p className="text-sm text-red-400/70">Tentatives echouees</p>
            </CardContent>
          </Card>
        </div>
      )}
      {/* User Details */}
      <Card className="border-border/70 bg-card/70 overflow-hidden rounded-lg py-0">
        <CardHeader className="border-border/60 border-b p-4">
          <CardTitle className="text-base">Informations compte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Mail size={16} className="text-muted-foreground" />
              <span className="text-muted-foreground">Email</span>
            </div>
            <span className="text-foreground min-w-0 text-right text-sm break-all">
              {user.email}
            </span>
          </div>
          <Separator className="bg-secondary" />
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-muted-foreground" />
              <span className="text-muted-foreground">Role</span>
            </div>
            <Badge variant={getRoleColor(user.role)}>
              {getAccessLabel(user)}
            </Badge>
          </div>
          <Separator className="bg-secondary" />
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-muted-foreground" />
              <span className="text-muted-foreground">Derniere connexion</span>
            </div>
            <span className="text-foreground text-right text-sm">
              {formatDate(user.lastLoginAt)}
            </span>
          </div>
          <Separator className="bg-secondary" />
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Key size={16} className="text-muted-foreground" />
              <span className="text-muted-foreground">Mot de passe</span>
            </div>
            {user.mustChangePassword ? (
              <Badge
                variant="outline"
                className="border-amber-500 text-amber-500"
              >
                A changer
              </Badge>
            ) : (
              <span className="text-muted-foreground text-sm">
                Change le {formatDate(user.passwordChangedAt)}
              </span>
            )}
          </div>
          <Separator className="bg-secondary" />
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-muted-foreground" />
              <span className="text-muted-foreground">Statut</span>
            </div>
            {user.isActive ? (
              <Badge className="bg-emerald-500">
                <Check size={12} className="mr-1" />
                Actif
              </Badge>
            ) : (
              <Badge className="bg-red-500">
                <X size={12} className="mr-1" />
                Inactif
              </Badge>
            )}
          </div>
          <Separator className="bg-secondary" />
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-muted-foreground" />
              <span className="text-muted-foreground">Cree le</span>
            </div>
            <span className="text-foreground text-right text-sm">
              {formatDate(user.createdAt)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
