import {
  Activity,
  Calendar,
  Check,
  Clock,
  Key,
  type LucideIcon,
  Mail,
  X,
} from 'lucide-react';
import React, { type FC } from 'react';

import type { UserAuditStats, UserType } from '$types/auth.types';
import { Badge } from '$ui/badge';
import { Card, CardContent, CardHeader } from '$ui/card';

type UserResumeTabProps = {
  auditStats: UserAuditStats | null;
  canViewActivity: boolean;
  canViewContact: boolean;
  user: UserType;
};

type ResumeStatTone = 'neutral' | 'primary' | 'warning';

const getResumeStatToneClassName = (tone: ResumeStatTone): string => {
  if (tone === 'primary') {
    return 'border-primary/35 bg-primary/15 text-primary-emphasis';
  }
  if (tone === 'warning') {
    return 'border-warning/35 bg-warning/10 text-warning';
  }

  return 'border-border/50 bg-surface-raised text-muted-foreground';
};

const ResumeStatCard: FC<{
  icon: LucideIcon;
  label: string;
  tone?: ResumeStatTone;
  value: number | string;
}> = ({ icon: Icon, label, tone = 'neutral', value }) => (
  <Card className="border-border/70 overflow-hidden rounded-md py-0">
    <CardContent className="p-3 sm:p-4">
      <div className="flex items-center gap-3">
        <div
          className={`${getResumeStatToneClassName(tone)} flex size-9 shrink-0 items-center justify-center rounded-lg border`}
        >
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-foreground text-xl font-semibold tracking-normal">
            {value}
          </p>
          <p className="text-muted-foreground truncate text-xs">{label}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

export const UserResumeTab: FC<UserResumeTabProps> = ({
  auditStats,
  canViewActivity,
  canViewContact,
  user,
}) => {
  const formatDate = (date: Date | string | null): string => {
    if (!date) return 'Jamais';

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) return 'Jamais';

    return parsedDate.toLocaleDateString('fr-FR', {
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <section className="space-y-3" aria-labelledby="user-summary-heading">
      <h2 id="user-summary-heading" className="sr-only">
        Résumé du compte
      </h2>
      {/* Quick Stats */}
      {canViewActivity && (
        <div className="grid gap-3 sm:grid-cols-3">
          <ResumeStatCard
            icon={Activity}
            label="Actions totales"
            value={auditStats?.totalActions ?? '—'}
            tone="primary"
          />
          <ResumeStatCard
            icon={Check}
            label="Connexions réussies"
            value={auditStats?.successfulLogins ?? '—'}
          />
          <ResumeStatCard
            icon={X}
            label="Tentatives échouées"
            value={auditStats?.failedLogins ?? '—'}
            tone={(auditStats?.failedLogins ?? 0) > 0 ? 'warning' : 'neutral'}
          />
        </div>
      )}
      {/* User Details */}
      <Card className="border-border/70 overflow-hidden rounded-md py-0">
        <CardHeader className="border-border/65 bg-surface-muted border-b p-3 sm:p-4">
          <h3 className="text-sm font-semibold">Informations du compte</h3>
        </CardHeader>
        <CardContent className="p-3 sm:p-4">
          <dl className="divide-border/60 divide-y">
            <div className="grid gap-1 py-3 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-start sm:gap-4">
              <dt className="text-muted-foreground flex items-center gap-2 text-sm">
                <Mail size={16} className="text-muted-foreground" />
                Email de contact
              </dt>
              <dd className="text-foreground min-w-0 text-sm break-all sm:text-right">
                {canViewContact
                  ? (user.contactEmail ?? 'Non renseigné')
                  : 'Masqué — permission requise'}
              </dd>
            </div>
            <div className="grid gap-1 py-3 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-start sm:gap-4">
              <dt className="text-muted-foreground flex items-center gap-2 text-sm">
                <Clock size={16} className="text-muted-foreground" />
                Dernière connexion
              </dt>
              <dd className="text-foreground text-sm sm:text-right">
                {formatDate(user.lastLoginAt)}
              </dd>
            </div>
            {user.securityDetailsVisible !== false &&
              user.mustChangePassword && (
                <div className="grid gap-1 py-3 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-start sm:gap-4">
                  <dt className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Key size={16} className="text-muted-foreground" />
                    Mot de passe
                  </dt>
                  <dd className="sm:text-right">
                    <Badge
                      variant="outline"
                      className="border-warning/40 text-warning"
                    >
                      À changer
                    </Badge>
                  </dd>
                </div>
              )}
            <div className="grid gap-1 py-3 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-start sm:gap-4">
              <dt className="text-muted-foreground flex items-center gap-2 text-sm">
                <Calendar size={16} className="text-muted-foreground" />
                Créé le
              </dt>
              <dd className="text-foreground text-sm sm:text-right">
                {formatDate(user.createdAt)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </section>
  );
};
