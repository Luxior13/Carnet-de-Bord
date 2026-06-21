import {
  Activity,
  Calendar,
  Check,
  Clock,
  Key,
  type LucideIcon,
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

type ResumeStatTone = 'neutral' | 'primary' | 'warning';

const getResumeStatToneClassName = (tone: ResumeStatTone): string => {
  if (tone === 'primary') return 'bg-primary/10 text-primary';
  if (tone === 'warning') return 'bg-amber-500/10 text-amber-400';

  return 'bg-secondary text-secondary-foreground';
};

const ResumeStatCard: FC<{
  icon: LucideIcon;
  label: string;
  tone?: ResumeStatTone;
  value: number;
}> = ({ icon: Icon, label, tone = 'neutral', value }) => (
  <Card className="border-border/70 bg-card overflow-hidden rounded-lg py-0">
    <CardContent className="p-3 sm:p-4">
      <div className="flex items-center gap-3">
        <div
          className={`${getResumeStatToneClassName(tone)} flex size-9 shrink-0 items-center justify-center rounded-md`}
        >
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-foreground text-xl font-semibold tracking-tight">
            {value}
          </p>
          <p className="text-muted-foreground truncate text-xs">{label}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

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
    <div className="space-y-3">
      {/* Quick Stats */}
      {auditStats && (
        <div className="grid gap-3 sm:grid-cols-3">
          <ResumeStatCard
            icon={Activity}
            label="Actions totales"
            value={auditStats.totalActions}
            tone="primary"
          />
          <ResumeStatCard
            icon={Check}
            label="Connexions reussies"
            value={auditStats.successfulLogins}
          />
          <ResumeStatCard
            icon={X}
            label="Tentatives échouées"
            value={auditStats.failedLogins}
            tone="warning"
          />
        </div>
      )}
      {/* User Details */}
      <Card className="border-border/70 bg-card overflow-hidden rounded-lg py-0">
        <CardHeader className="border-border/60 bg-accent border-b p-3 sm:p-4">
          <CardTitle className="text-sm">Informations compte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Mail size={16} className="text-muted-foreground" />
              <span className="text-muted-foreground">Email</span>
            </div>
            <span className="text-foreground min-w-0 text-right text-sm break-all">
              {user.email}
            </span>
          </div>
          <Separator className="bg-border/60" />
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-muted-foreground" />
              <span className="text-muted-foreground">Rôle</span>
            </div>
            <Badge variant={getRoleColor(user.role)}>
              {getAccessLabel(user)}
            </Badge>
          </div>
          <Separator className="bg-border/60" />
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-muted-foreground" />
              <span className="text-muted-foreground">Dernière connexion</span>
            </div>
            <span className="text-foreground text-right text-sm">
              {formatDate(user.lastLoginAt)}
            </span>
          </div>
          <Separator className="bg-border/60" />
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Key size={16} className="text-muted-foreground" />
              <span className="text-muted-foreground">Mot de passe</span>
            </div>
            {user.mustChangePassword ? (
              <Badge
                variant="outline"
                className="border-amber-500/40 text-amber-400"
              >
                À changer
              </Badge>
            ) : (
              <span className="text-muted-foreground text-sm">
                Changé le {formatDate(user.passwordChangedAt)}
              </span>
            )}
          </div>
          <Separator className="bg-border/60" />
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-muted-foreground" />
              <span className="text-muted-foreground">Statut</span>
            </div>
            {user.isActive ? (
              <Badge variant="secondary">
                <Check size={12} className="mr-1" />
                Actif
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-muted-foreground/35 bg-muted/30 text-muted-foreground"
              >
                <X size={12} className="mr-1" />
                Inactif
              </Badge>
            )}
          </div>
          <Separator className="bg-border/60" />
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-muted-foreground" />
              <span className="text-muted-foreground">Créé le</span>
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
