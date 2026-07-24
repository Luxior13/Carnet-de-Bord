'use client';

import { useRouter } from 'next/navigation';
import React, { type FC } from 'react';

import { EntityDangerZone } from '$components/layout/EntityDangerZone';

import { deletePerson } from '../person.api';
import type { PersonDetail } from '../types/person.types';

type PersonDangerZoneProps = {
  onReload: () => Promise<PersonDetail>;
  person: PersonDetail;
};

export const PersonDangerZone: FC<PersonDangerZoneProps> = ({
  onReload,
  person,
}) => {
  const router = useRouter();

  return (
    <EntityDangerZone
      description="L’identité, les coordonnées et les profils sociaux seront supprimés sans possibilité de restauration."
      dialogDescription="Cette action est irréversible. Aucun mot de passe ni code de double authentification n’est demandé : vérifiez attentivement avant de confirmer."
      dialogNotice="La fiche et ses données personnelles seront effacées immédiatement et définitivement."
      onDelete={(version, idempotencyKey) =>
        deletePerson({
          idempotencyKey,
          personId: person.id,
          version,
        })
      }
      onDeleted={() => router.replace('/vie-interne/repertoire')}
      onReloadVersion={async () => (await onReload()).version}
      version={person.version}
    />
  );
};
