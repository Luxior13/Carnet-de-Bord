import { Calendar, Clock, Hash } from 'lucide-react';
import React, { type FC } from 'react';

import type { UserType } from '$types/auth.types';
import { Badge } from '$ui/badge';

type AccountInfoSectionProps = {
  userData: UserType;
};

export const AccountInfoSection: FC<AccountInfoSectionProps> = ({
  userData,
}) => {
  const formatRelativeTime = (date: Date | string | null) => {
    if (!date) return 'Jamais';
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "A l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7)
      return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;

    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="border-border bg-card overflow-hidden rounded-lg border shadow-sm">
      <div className="p-6">
        <h3 className="text-foreground mb-4 flex items-center gap-2 text-base font-semibold">
          <span className="bg-primary/10 flex h-7 w-7 items-center justify-center rounded-lg">
            <Hash size={16} className="text-primary" />
          </span>
          Informations du compte
        </h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <p className="text-muted-foreground text-sm">Créé le</p>
            <p className="text-foreground flex items-center gap-1 text-sm font-medium">
              <Calendar size={14} className="text-muted-foreground" />
              {new Date(userData.createdAt).toLocaleDateString('fr-FR')}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Dernière connexion</p>
            <p className="text-foreground flex items-center gap-1 text-sm font-medium">
              <Clock size={14} className="text-muted-foreground" />
              {formatRelativeTime(userData.lastLoginAt)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Statut</p>
            <Badge
              className={userData.isActive ? 'bg-emerald-500' : 'bg-red-500'}
            >
              {userData.isActive ? 'Actif' : 'Inactif'}
            </Badge>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">ID utilisateur</p>
            <p className="text-muted-foreground font-mono text-xs">
              {userData.id.slice(0, 12)}...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
