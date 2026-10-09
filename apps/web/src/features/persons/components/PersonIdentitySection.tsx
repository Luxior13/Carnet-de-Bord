'use client';

import { UserRound } from 'lucide-react';
import React, { type FC, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';

import { SectionActionBar } from '$components/layout/SectionActionBar';
import { UnsavedNavigationDialog } from '$components/layout/UnsavedNavigationDialog';
import { useUnsavedNavigationGuard } from '$hooks/useUnsavedNavigationGuard';
import { CardContent, CardHeader } from '$ui/card';
import { ServiceIcon } from '$ui/service-icon';
import { ApiClientError } from '$utils/api.utils';

import { updatePerson } from '../person.api';
import { PERSON_AUDIT_KEYS } from '../person.constants';
import { isPersonIdentityEqual, zodErrorMap } from '../person.ui';
import { updatePersonSchema } from '../schemas/person.schemas';
import type { PersonDetail } from '../types/person.types';
import type { PersonFieldProvenanceTarget } from './PersonFieldProvenanceHint';
import {
  PersonIdentityFields,
  type PersonIdentityFormValue,
} from './PersonIdentityFields';

type PersonIdentitySectionProps = {
  canUpdate: boolean;
  canViewProvenance: boolean;
  onChange: (person: PersonDetail) => void;
  onReload: () => Promise<PersonDetail>;
  person: PersonDetail;
};

const toForm = (person: PersonDetail): PersonIdentityFormValue => ({
  birthDate: person.birthDate ?? '',
  firstName: person.firstName ?? '',
  lastName: person.lastName ?? '',
  nickname: person.nickname ?? '',
  structureStatus: person.structureStatus,
});

/**
 * Edition directe de l'identite : les champs sont toujours affiches, la barre
 * d'action n'apparait que lorsqu'une valeur a change.
 */
export const PersonIdentitySection: FC<PersonIdentitySectionProps> = ({
  canUpdate,
  canViewProvenance,
  onChange,
  onReload,
  person,
}) => {
  const [conflict, setConflict] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<PersonIdentityFormValue>(() =>
    toForm(person),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [pendingLocalDiscard, setPendingLocalDiscard] = useState(false);
  const [actionBarSlot, setActionBarSlot] = useState<HTMLElement | null>(null);
  const [version, setVersion] = useState(person.version);
  const isDirty = canUpdate && !isPersonIdentityEqual(person, form);
  const {
    cancelPendingNavigation,
    confirmPendingNavigation,
    pendingNavigationHref,
  } = useUnsavedNavigationGuard(isDirty);

  // La saisie se resynchronise quand la fiche change cote serveur ; pendant la
  // frappe la prop ne bouge pas, donc rien n'ecrase une saisie en cours.
  useEffect(() => {
    setForm(toForm(person));
    setVersion(person.version);
  }, [person]);

  // La barre est rendue hors de la section, dans l'emplacement de la page.
  useEffect(() => {
    setActionBarSlot(document.getElementById('person-record-action-bar'));
  }, []);

  const focusFirstError = (): void => {
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>('#person-identity [aria-invalid="true"]')
        ?.focus();
    });
  };

  const handleSave = async (): Promise<void> => {
    if (!canUpdate) return;
    const payload = {
      birthDate: form.birthDate || null,
      firstName: form.firstName || null,
      lastName: form.lastName || null,
      nickname: form.nickname || null,
      structureStatus: form.structureStatus,
      version,
    };
    const validation = updatePersonSchema.safeParse(payload);
    if (!validation.success) {
      setErrors(zodErrorMap(validation.error));
      focusFirstError();

      return;
    }

    setErrors({});
    setIsSaving(true);
    setConflict(false);
    try {
      const result = await updatePerson(person.id, payload);
      onChange(result.person);
      setForm(toForm(result.person));
      setVersion(result.person.version);
      toast.success('Identité mise à jour');
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.status === 409) {
        setConflict(true);

        return;
      }
      if (caught instanceof ApiClientError && caught.details) {
        setErrors(
          Object.fromEntries(
            Object.entries(caught.details).map(([key, messages]) => [
              key,
              messages[0] ?? 'Valeur invalide',
            ]),
          ),
        );
        focusFirstError();
      }
      toast.error(
        caught instanceof Error
          ? caught.message
          : "Impossible de modifier l'identité",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const discardLocalChanges = (): void => {
    setForm(toForm(person));
    setErrors({});
    setConflict(false);
    setPendingLocalDiscard(false);
  };

  const refreshVersion = (): void => {
    void onReload().then((fresh) => {
      setVersion(fresh.version);
      setConflict(false);
      toast.info('Version actualisée, votre saisie est conservée');
    });
  };

  const provenanceTarget = (
    fieldKey: keyof PersonIdentityFormValue,
    label: string,
    sectionKey: string,
    hasValue: boolean,
  ): PersonFieldProvenanceTarget | undefined =>
    canViewProvenance && hasValue
      ? {
          fieldKey,
          label,
          personId: person.id,
          revision: version,
          sectionKey,
        }
      : undefined;
  const provenances = {
    birthDate: provenanceTarget(
      'birthDate',
      'Date de naissance',
      PERSON_AUDIT_KEYS.sections.identity,
      Boolean(person.birthDate),
    ),
    firstName: provenanceTarget(
      'firstName',
      'Prénom',
      PERSON_AUDIT_KEYS.sections.identity,
      Boolean(person.firstName),
    ),
    lastName: provenanceTarget(
      'lastName',
      'Nom',
      PERSON_AUDIT_KEYS.sections.identity,
      Boolean(person.lastName),
    ),
    nickname: provenanceTarget(
      'nickname',
      'Pseudo principal',
      PERSON_AUDIT_KEYS.sections.identity,
      Boolean(person.nickname),
    ),
    structureStatus: provenanceTarget(
      'structureStatus',
      'Statut dans la structure',
      PERSON_AUDIT_KEYS.sections.structure,
      Boolean(person.structureStatus),
    ),
  };

  return (
    <>
      <section id="person-identity">
        <CardHeader className="p-3.5 sm:p-4">
          <div className="flex min-w-0 items-start gap-3">
            <ServiceIcon className="border-primary/30 bg-primary/10 text-primary-emphasis size-8">
              <UserRound className="size-4" />
            </ServiceIcon>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold">
                Informations personnelles
              </h2>
              <p className="text-muted-foreground mt-1 text-xs">
                Identité civile et informations utiles à la structure.
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5">
          <PersonIdentityFields
            disabled={!canUpdate || isSaving}
            errors={errors}
            idPrefix="person-detail"
            onChange={(key, nextValue) =>
              setForm((current) => ({ ...current, [key]: nextValue }))
            }
            provenances={provenances}
            value={form}
            variant="quiet"
          />
        </CardContent>
      </section>

      {isDirty &&
        actionBarSlot &&
        createPortal(
          <SectionActionBar
            conflict={conflict}
            isSaving={isSaving}
            onCancel={() => setPendingLocalDiscard(true)}
            onResolveConflict={refreshVersion}
            onSave={() => void handleSave()}
          />,
          actionBarSlot,
        )}

      <UnsavedNavigationDialog
        cancelLabel={
          pendingLocalDiscard ? 'Continuer la modification' : 'Rester'
        }
        confirmLabel={
          pendingLocalDiscard
            ? 'Abandonner les modifications'
            : 'Quitter sans enregistrer'
        }
        contentClassName="sm:max-w-lg"
        description={
          pendingLocalDiscard
            ? 'Les modifications de cette information ne sont pas enregistrées.'
            : 'Vous avez des modifications en cours sur cette fiche. Quitter la page les annulera.'
        }
        onCancel={() => {
          setPendingLocalDiscard(false);
          cancelPendingNavigation();
        }}
        onConfirm={() => {
          if (pendingLocalDiscard) discardLocalChanges();
          else confirmPendingNavigation();
        }}
        open={pendingLocalDiscard || pendingNavigationHref !== null}
        title={
          pendingLocalDiscard
            ? 'Annuler les modifications ?'
            : 'Quitter sans enregistrer ?'
        }
      />
    </>
  );
};
