'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import React, { type FC, useState } from 'react';

import { EntityDangerZone } from '$components/layout/EntityDangerZone';
import { useUser } from '$context/UserContext';

import { deletePerson } from '../person.api';
import type { PersonDetail } from '../types/person.types';

const AdminStepUpDialog = dynamic(() =>
  import('$components/users/user-detail/AdminStepUpDialog').then(
    (module) => module.AdminStepUpDialog,
  ),
);

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
  const { userData } = useUser();
  // Deleting a record asks for a recent password, like deleting an account;
  // a confirmed proof resumes the same deletion request.
  const [resumeDeletion, setResumeDeletion] = useState<(() => void) | null>(
    null,
  );

  return (
    <>
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
        onPasswordProofRequired={(resume) => setResumeDeletion(() => resume)}
        onReloadVersion={async () => (await onReload()).version}
        version={person.version}
      />
      {resumeDeletion && (
        <AdminStepUpDialog
          actorLoginName={userData?.loginName ?? ''}
          description="Confirmez votre mot de passe pour supprimer définitivement cette fiche."
          onCancel={() => setResumeDeletion(null)}
          onComplete={() => {
            const resume = resumeDeletion;
            setResumeDeletion(null);
            resume();
          }}
          open
          proofKind="password"
          title="Confirmer la suppression"
        />
      )}
    </>
  );
};
