'use client';

import { Check, Loader2, Pencil, RotateCcw, UserRound, X } from 'lucide-react';
import React, { type FC, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { ContentState } from '$components/layout/ContentState';
import { UnsavedNavigationDialog } from '$components/layout/UnsavedNavigationDialog';
import { useUnsavedNavigationGuard } from '$hooks/useUnsavedNavigationGuard';
import { Button } from '$ui/button';
import { ApiClientError } from '$utils/api.utils';

import { updatePerson } from '../person.api';
import { PERSON_AUDIT_KEYS } from '../person.constants';
import {
  formatPersonBirthDate,
  getAgeDescription,
  isPersonIdentityEqual,
  zodErrorMap,
} from '../person.ui';
import { updatePersonSchema } from '../schemas/person.schemas';
import type { PersonDetail } from '../types/person.types';
import { PersonFieldHistoryPopover } from './PersonFieldHistoryPopover';
import {
  PersonIdentityFields,
  type PersonIdentityFormValue,
} from './PersonIdentityFields';
import { PersonStatusBadge } from './PersonStatusBadge';

type PersonIdentitySectionProps = {
  canUpdate: boolean;
  canViewAudit: boolean;
  canViewHistory: boolean;
  onChange: (person: PersonDetail) => void;
  onReload: () => Promise<PersonDetail>;
  person: PersonDetail;
};

type DisplayFieldProps = {
  canViewAudit: boolean;
  canViewHistory: boolean;
  fieldKey: string;
  label: string;
  personId: string;
  revision: number;
  value: React.ReactNode;
};

const DisplayField: FC<DisplayFieldProps> = ({
  canViewAudit,
  canViewHistory,
  fieldKey,
  label,
  personId,
  revision,
  value,
}) => (
  <div className="border-border-divider min-w-0 border-b py-3 last:border-0">
    <div className="flex min-w-0 items-start justify-between gap-3">
      <div className="min-w-0">
        <dt className="text-muted-foreground text-xs font-medium">{label}</dt>
        <dd className="mt-1 min-h-5 text-sm break-words">
          {value || (
            <span className="text-muted-foreground">Non renseigné</span>
          )}
        </dd>
      </div>
      {canViewHistory && (
        <PersonFieldHistoryPopover
          canViewAudit={canViewAudit}
          fieldKey={fieldKey}
          label={label}
          personId={personId}
          revision={revision}
          sectionKey={
            fieldKey === 'structureStatus'
              ? PERSON_AUDIT_KEYS.sections.structure
              : PERSON_AUDIT_KEYS.sections.identity
          }
        />
      )}
    </div>
  </div>
);

const toForm = (person: PersonDetail): PersonIdentityFormValue => ({
  birthDate: person.birthDate ?? '',
  firstName: person.firstName ?? '',
  lastName: person.lastName ?? '',
  nickname: person.nickname ?? '',
  structureStatus: person.structureStatus,
});

export const PersonIdentitySection: FC<PersonIdentitySectionProps> = ({
  canUpdate,
  canViewAudit,
  canViewHistory,
  onChange,
  onReload,
  person,
}) => {
  const [conflict, setConflict] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<PersonIdentityFormValue>(() =>
    toForm(person),
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingLocalDiscard, setPendingLocalDiscard] = useState(false);
  const [version, setVersion] = useState(person.version);
  const isDirty = isEditing && !isPersonIdentityEqual(person, form);
  const {
    cancelPendingNavigation,
    confirmPendingNavigation,
    pendingNavigationHref,
  } = useUnsavedNavigationGuard(isDirty);

  useEffect(() => {
    if (!isEditing) {
      setForm(toForm(person));
      setVersion(person.version);
    }
  }, [isEditing, person]);

  const focusFirstError = (): void => {
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>('#person-identity [aria-invalid="true"]')
        ?.focus();
    });
  };

  const handleSave = async (): Promise<void> => {
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
      setIsEditing(false);
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
    setIsEditing(false);
    setPendingLocalDiscard(false);
  };

  const cancel = (): void => {
    if (isDirty) {
      setPendingLocalDiscard(true);

      return;
    }
    discardLocalChanges();
  };

  return (
    <>
      <section className="p-4 sm:p-5" id="person-identity">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="border-primary/30 bg-primary/10 text-primary-emphasis flex size-9 items-center justify-center rounded-lg border">
              <UserRound className="size-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold">Identité</h2>
              <p className="text-muted-foreground text-xs">
                Informations civiles et statut courant.
              </p>
            </div>
          </div>
          {canUpdate && !isEditing && (
            <Button
              onClick={() => setIsEditing(true)}
              size="sm"
              type="button"
              variant="outline"
            >
              <Pencil className="size-4" />
              Modifier
            </Button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-4">
            {conflict && (
              <ContentState
                action={
                  <Button
                    onClick={() => {
                      void onReload().then((fresh) => {
                        setVersion(fresh.version);
                        setConflict(false);
                        toast.info(
                          'Version actualisée, votre saisie est conservée',
                        );
                      });
                    }}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <RotateCcw className="size-4" />
                    Actualiser la version
                  </Button>
                }
                description="La fiche a changé depuis son ouverture. Actualisez sa version puis vérifiez votre saisie avant de réessayer."
                kind="warning"
                title="Modification concurrente"
              />
            )}
            <PersonIdentityFields
              disabled={isSaving}
              errors={errors}
              idPrefix="person-detail"
              onChange={(key, value) =>
                setForm((current) => ({ ...current, [key]: value }))
              }
              value={form}
            />
            <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
              <Button
                disabled={isSaving}
                onClick={cancel}
                type="button"
                variant="outline"
              >
                <X className="size-4" />
                Annuler
              </Button>
              <Button
                disabled={isSaving || !isDirty}
                onClick={() => void handleSave()}
                type="button"
              >
                {isSaving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                {isSaving ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </div>
          </div>
        ) : (
          <dl className="grid gap-x-6 sm:grid-cols-2">
            <DisplayField
              canViewAudit={canViewAudit}
              canViewHistory={canViewHistory}
              fieldKey="nickname"
              label="Pseudo principal"
              personId={person.id}
              revision={person.version}
              value={person.nickname}
            />
            <DisplayField
              canViewAudit={canViewAudit}
              canViewHistory={canViewHistory}
              fieldKey="firstName"
              label="Prénom"
              personId={person.id}
              revision={person.version}
              value={person.firstName}
            />
            <DisplayField
              canViewAudit={canViewAudit}
              canViewHistory={canViewHistory}
              fieldKey="lastName"
              label="Nom"
              personId={person.id}
              revision={person.version}
              value={person.lastName}
            />
            <DisplayField
              canViewAudit={canViewAudit}
              canViewHistory={canViewHistory}
              fieldKey="birthDate"
              label="Date de naissance"
              personId={person.id}
              revision={person.version}
              value={
                person.birthDate ? (
                  <span>
                    {formatPersonBirthDate(person.birthDate)}{' '}
                    <span className="text-muted-foreground">
                      ({getAgeDescription(person.birthDate)})
                    </span>
                  </span>
                ) : null
              }
            />
            <DisplayField
              canViewAudit={canViewAudit}
              canViewHistory={canViewHistory}
              fieldKey="structureStatus"
              label="Statut dans la structure"
              personId={person.id}
              revision={person.version}
              value={<PersonStatusBadge status={person.structureStatus} />}
            />
          </dl>
        )}
      </section>
      <UnsavedNavigationDialog
        description="Les modifications de l'identité et du statut seront perdues."
        onCancel={cancelPendingNavigation}
        onConfirm={confirmPendingNavigation}
        open={pendingNavigationHref !== null}
      />
      <UnsavedNavigationDialog
        cancelLabel="Continuer la modification"
        confirmLabel="Abandonner les modifications"
        description="La saisie actuelle de l'identité et du statut sera réinitialisée."
        onCancel={() => setPendingLocalDiscard(false)}
        onConfirm={discardLocalChanges}
        open={pendingLocalDiscard}
        title="Annuler les modifications ?"
      />
    </>
  );
};
