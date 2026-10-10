import Link from 'next/link';
import React, { type FC } from 'react';

import { ContentState } from '$components/layout/ContentState';
import { userDetailPath } from '$constants/routes.constants';
import { Button } from '$ui/button';

import type { CreateUserController } from './useCreateUser';

export const CreationFeedback: FC<{
  controller: CreateUserController;
  returnHref: string;
}> = ({ controller, returnHref }) => {
  const {
    checkCreation,
    feedbackRef,
    handleCreateUser,
    isChecking,
    isCreating,
    recovery,
    resetForm,
    submissionError,
  } = controller;
  if (!submissionError && !recovery) return null;

  const found = recovery?.status === 'found' && recovery.user;
  const absent = recovery?.status === 'absent';
  const busy = isChecking || isCreating;

  return (
    <div ref={feedbackRef} tabIndex={-1} aria-busy={busy} className="min-w-0">
      <ContentState
        kind={submissionError ? 'error' : 'warning'}
        title={
          found
            ? 'Un compte utilise cet identifiant'
            : absent
              ? 'Aucun compte trouvé pour le moment'
              : recovery
                ? 'Vérifier la création'
                : 'La création demande votre attention'
        }
        description={
          <div className="space-y-2">
            {submissionError && <p>{submissionError}</p>}
            {recovery && (
              <p>
                Identifiant :{' '}
                <strong className="break-all">{recovery.loginName}</strong>
              </p>
            )}
            {found && (
              <p>
                Le mot de passe initial ne peut plus être affiché. Ouvrez la
                fiche pour utiliser les actions de sécurité autorisées et
                générer un nouveau mot de passe. Si vous n’avez pas ces droits,
                contactez un administrateur habilité.
              </p>
            )}
            {absent && (
              <p>
                Vous pouvez réessayer avec ce même identifiant. La première
                demande peut encore aboutir ; l’identifiant unique empêche la
                création de deux comptes.
              </p>
            )}
          </div>
        }
        action={
          recovery ? (
            <div className="flex flex-wrap gap-2">
              {found ? (
                <>
                  <Button asChild>
                    <Link
                      href={`${userDetailPath(found.id)}?${new URLSearchParams({ returnTo: returnHref })}`}
                    >
                      Ouvrir la fiche
                    </Link>
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Créer un autre compte
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant={absent ? 'outline' : 'default'}
                    disabled={busy}
                    onClick={() => void checkCreation()}
                  >
                    {isChecking
                      ? 'Vérification…'
                      : absent
                        ? 'Vérifier à nouveau'
                        : 'Vérifier la création'}
                  </Button>
                  {absent && (
                    <Button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleCreateUser()}
                    >
                      {isCreating ? 'Création…' : 'Réessayer la création'}
                    </Button>
                  )}
                </>
              )}
            </div>
          ) : undefined
        }
      />
    </div>
  );
};
