'use client';

import { useRouter } from 'next/navigation';
import React, { type FC } from 'react';

import { EntityDangerZone } from '$components/layout/EntityDangerZone';

import { deletePerson } from '../person.api';
import type { PersonDetail } from '../types/person.types';

type PersonDangerZoneProps = {
  available?: boolean;
  onReload: () => Promise<PersonDetail>;
  person: PersonDetail;
  returnHref: string;
};

export const PersonDangerZone: FC<PersonDangerZoneProps> = ({
  available = true,
  onReload,
  person,
  returnHref,
}) => {
  const router = useRouter();

  return (
    <EntityDangerZone
      available={available}
      key={person.id}
      description="L’identité, les coordonnées et les profils sociaux seront supprimés sans possibilité de restauration."
      dialogDescription="Cette action est irréversible. Vérifiez la fiche avant de confirmer sa suppression."
      dialogNotice="La fiche et ses données personnelles seront effacées immédiatement et définitivement."
      onDelete={(version, idempotencyKey, signal) =>
        deletePerson({
          idempotencyKey,
          personId: person.id,
          signal,
          version,
        })
      }
      onDeleted={() => router.replace(returnHref)}
      onDeletedLabel="Retour au répertoire"
      onReloadVersion={async () => (await onReload()).version}
      version={person.version}
    />
  );
};
