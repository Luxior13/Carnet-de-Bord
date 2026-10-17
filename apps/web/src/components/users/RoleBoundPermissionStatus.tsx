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
        'flex max-w-60 items-center gap-2 text-xs leading-5',
        isEnabled ? 'text-foreground' : 'text-muted-foreground',
      )}
      role="note"
    >
      <LockKeyhole className="size-3.5 shrink-0" />
      <span>{label}</span>
    </div>
  );
};
