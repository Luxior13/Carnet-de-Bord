'use client';

import { Trash2 } from 'lucide-react';
import type { FC } from 'react';

import { Button } from '$ui/button';
import { Card, CardContent, CardHeader } from '$ui/card';

type UserDeletionCardProps = {
  canEditStatus: boolean;
  hasStatusChanges: boolean;
  isSaving: boolean;
  onDeleteUser: () => void;
  userIsActive: boolean;
};

export const UserDeletionCard: FC<UserDeletionCardProps> = ({
  canEditStatus,
  hasStatusChanges,
  isSaving,
  onDeleteUser,
  userIsActive,
}) => (
  <Card
    aria-labelledby="user-security-danger-heading"
    className="border-destructive/30 bg-destructive/5 rounded-xl"
  >
    <CardHeader className="border-destructive/20 bg-destructive/10 border-b p-3 sm:p-4">
      <h3
        id="user-security-danger-heading"
        className="text-destructive flex items-center gap-2 text-sm font-semibold"
      >
        <Trash2 className="size-4" />
        Zone danger
      </h3>
    </CardHeader>
    <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
      <div>
        <p className="text-sm font-medium">
          Supprimer définitivement cet utilisateur
        </p>
        <p
          className="text-muted-foreground text-xs"
          id="delete-user-requirement"
        >
          {userIsActive
            ? canEditStatus
              ? 'Désactivez d’abord ce compte et enregistrez ce changement. La suppression sera ensuite disponible.'
              : 'Ce compte doit d’abord être désactivé par une personne autorisée. La suppression sera ensuite disponible.'
            : hasStatusChanges
              ? 'Enregistrez ou annulez le changement d’état en cours avant de supprimer ce compte.'
              : 'Cette action est irréversible. L’identité sera anonymisée et le compte ne pourra pas être restauré.'}
        </p>
      </div>
      <Button
        type="button"
        variant="destructive"
        onClick={onDeleteUser}
        aria-describedby="delete-user-requirement"
        disabled={userIsActive || hasStatusChanges || isSaving}
        className="shrink-0"
      >
        Supprimer définitivement
      </Button>
    </CardContent>
  </Card>
);
