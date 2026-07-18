import { UserRole } from '@repo/shared';
import { LockKeyhole } from 'lucide-react';
import React, { type FC } from 'react';

import { cn } from '$utils/css.utils';

type RoleBoundPermissionStatusProps = {
  isEnabled: boolean;
  role: UserRole;
};

export const RoleBoundPermissionStatus: FC<RoleBoundPermissionStatusProps> = ({
  isEnabled,
  role,
}) => {
  const label =
    role === UserRole.ADMIN
      ? 'Fourni par le rôle Administrateur'
      : 'Réservé aux administrateurs';

  return (
    <div
      aria-label={`Autorisation en lecture seule : ${label}`}
      className={cn(
        'flex min-h-10 max-w-72 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold',
        isEnabled
          ? 'border-success/35 bg-success/10 text-success'
          : 'border-border/65 bg-surface-control text-muted-foreground',
      )}
      role="note"
    >
      <LockKeyhole className="size-3.5 shrink-0" />
      <span>{label}</span>
    </div>
  );
};
