'use client';

import {
  Check,
  History,
  Loader2,
  Pencil,
  RotateCcw,
  UserRound,
  X,
} from 'lucide-react';
import React, { type FC, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { ContentState } from '$components/layout/ContentState';
import { UnsavedNavigationDialog } from '$components/layout/UnsavedNavigationDialog';
import { useUnsavedNavigationGuard } from '$hooks/useUnsavedNavigationGuard';
import { Button } from '$ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '$ui/dialog';
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
import {
  PersonFieldHistoryPanel,
  type PersonFieldHistoryTarget,
} from './PersonFieldHistoryPanel';
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
  className?: string;
  label: string;
  prominent?: boolean;
  value: React.ReactNode;
};

const DisplayField: FC<DisplayFieldProps> = ({
  className = '',
  label,
  prominent = false,
  value,
}) => (
  <div
    className={`border-border-divider min-w-0 border-b py-3 last:border-0 ${className}`}
  >
    <dt className="text-muted-foreground text-xs font-medium">{label}</dt>
    <dd
      className={`mt-1 min-h-5 break-words ${prominent ? 'text-base font-semibold' : 'text-sm'}`}
    >
      {value || <span className="text-muted-foreground">Non renseigné</span>}
    </dd>
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
  const [activeHistory, setActiveHistory] =
    useState<PersonFieldHistoryTarget | null>(null);
  const [conflict, setConflict] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<PersonIdentityFormValue>(() =>
    toForm(person),
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingLocalDiscard, setPendingLocalDiscard] = useState(false);
  const [version, setVersion] = useState(person.version);
  const isDirty =
    canUpdate && isEditing && !isPersonIdentityEqual(person, form);
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

  useEffect(() => {
    setActiveHistory(null);
  }, [canViewAudit, canViewHistory, isEditing]);

  const focusFirstError = (): void => {
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>(
          '#person-identity-dialog [aria-invalid="true"]',
        )
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
    setActiveHistory(null);
    setIsEditing(false);
    setPendingLocalDiscard(false);
  };

  const closeEditor = (): void => {
    if (isDirty) {
      setPendingLocalDiscard(true);

      return;
    }
    discardLocalChanges();
  };

  const openEditor = (): void => {
    setForm(toForm(person));
    setVersion(person.version);
    setConflict(false);
    setErrors({});
    setActiveHistory(null);
    setIsEditing(true);
  };

  const historyTarget = (
    fieldKey: keyof PersonIdentityFormValue,
    label: string,
    sectionKey: string,
  ): PersonFieldHistoryTarget | undefined =>
    canViewHistory
      ? {
          canViewAudit,
          fieldKey,
          label,
          personId: person.id,
          revision: version,
          sectionKey,
        }
      : undefined;
  const histories = {
    birthDate: historyTarget(
      'birthDate',
      'Date de naissance',
      PERSON_AUDIT_KEYS.sections.identity,
    ),
    firstName: historyTarget(
      'firstName',
      'Prénom',
      PERSON_AUDIT_KEYS.sections.identity,
    ),
    lastName: historyTarget(
      'lastName',
      'Nom',
      PERSON_AUDIT_KEYS.sections.identity,
    ),
    nickname: historyTarget(
      'nickname',
      'Pseudo principal',
      PERSON_AUDIT_KEYS.sections.identity,
    ),
    structureStatus: historyTarget(
      'structureStatus',
      'Statut dans la structure',
      PERSON_AUDIT_KEYS.sections.structure,
    ),
  };

  return (
    <>
      <section className="p-4 sm:p-5" id="person-identity">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="border-primary/30 bg-primary/10 text-primary-emphasis flex size-9 shrink-0 items-center justify-center rounded-lg border">
              <UserRound className="size-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold">
                Informations personnelles
              </h2>
              <p className="text-muted-foreground text-xs">
                Identité civile et informations utiles à la structure.
              </p>
            </div>
          </div>
          {(canUpdate || canViewHistory) && (
            <Button
              onClick={openEditor}
              size="sm"
              type="button"
              variant="outline"
            >
              {canUpdate ? (
                <Pencil className="size-4" />
              ) : (
                <History className="size-4" />
              )}
              {canUpdate ? 'Modifier' : 'Consulter'}
            </Button>
          )}
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
          <dl className="grid gap-x-6 sm:grid-cols-2">
            <DisplayField
              className="sm:col-span-2"
              label="Pseudo principal"
              prominent
              value={person.nickname}
            />
            <DisplayField label="Prénom" value={person.firstName} />
            <DisplayField label="Nom" value={person.lastName} />
            <DisplayField
              className="sm:col-span-2"
              label="Date de naissance"
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
          </dl>

          <div className="border-border-divider border-t pt-4 xl:border-t-0 xl:border-l xl:pt-3 xl:pl-6">
            <p className="text-muted-foreground text-xs font-medium">
              Dans la structure
            </p>
            <div className="mt-2">
              <PersonStatusBadge status={person.structureStatus} />
            </div>
            <p className="text-muted-foreground mt-2 text-xs leading-5">
              Indique si cette fiche correspond actuellement à un membre de la
              structure.
            </p>
          </div>
        </div>
      </section>

      <Dialog
        open={isEditing}
        onOpenChange={(open) => {
          if (!open) closeEditor();
        }}
      >
        <DialogContent
          className={`grid h-[100svh] max-h-[100svh] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-0 sm:h-[min(42rem,85svh)] ${canViewHistory ? 'sm:max-w-4xl' : 'sm:max-w-2xl'}`}
          fullscreenOnMobile
          id="person-identity-dialog"
        >
          <DialogHeader className="border-border-divider border-b px-4 py-4 pr-14 text-left sm:px-5">
            <DialogTitle>
              {canUpdate ? "Modifier l'identité" : "Consulter l'identité"}
            </DialogTitle>
            <DialogDescription>
              {canUpdate
                ? 'Mettez à jour les informations principales et le statut dans la structure.'
                : 'Consultez les informations et leur historique sans modifier la fiche.'}
            </DialogDescription>
          </DialogHeader>

          <div
            className={`min-h-0 overflow-y-auto px-4 py-4 sm:px-5 ${canViewHistory ? 'lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(17rem,0.72fr)] lg:gap-5' : ''}`}
          >
            <div
              className={
                activeHistory ? 'hidden space-y-4 lg:block' : 'space-y-4'
              }
            >
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
                activeHistoryFieldKey={activeHistory?.fieldKey}
                disabled={!canUpdate || isSaving}
                errors={errors}
                histories={histories}
                idPrefix="person-detail"
                onChange={(key, value) =>
                  setForm((current) => ({ ...current, [key]: value }))
                }
                onHistoryOpen={setActiveHistory}
                value={form}
              />
            </div>

            {canViewHistory &&
              (activeHistory ? (
                <PersonFieldHistoryPanel
                  {...activeHistory}
                  onClose={() => setActiveHistory(null)}
                />
              ) : (
                <aside className="border-border-divider hidden min-w-0 items-center justify-center border-l px-6 text-center lg:flex">
                  <div className="max-w-56">
                    <span className="bg-surface-inset text-muted-foreground mx-auto flex size-9 items-center justify-center rounded-lg">
                      <History className="size-4" />
                    </span>
                    <p className="mt-3 text-sm font-medium">
                      Historique des champs
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs leading-5">
                      Sélectionnez l&apos;icône d&apos;historique près d&apos;un
                      champ pour afficher ses deux derniers changements.
                    </p>
                  </div>
                </aside>
              ))}
          </div>

          <DialogFooter
            className={`border-border-divider bg-surface-inset border-t px-4 py-4 sm:px-5 ${activeHistory ? 'hidden lg:flex' : ''}`}
          >
            {!canUpdate ? (
              <Button onClick={closeEditor} type="button">
                Fermer
              </Button>
            ) : (
              <>
                <Button
                  disabled={isSaving}
                  onClick={closeEditor}
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
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UnsavedNavigationDialog
        cancelLabel="Continuer la modification"
        confirmLabel="Abandonner les modifications"
        contentClassName="sm:max-w-md"
        description="Les modifications de cette information ne sont pas enregistrées."
        onCancel={() => {
          setPendingLocalDiscard(false);
          cancelPendingNavigation();
        }}
        onConfirm={() => {
          if (pendingLocalDiscard) discardLocalChanges();
          else confirmPendingNavigation();
        }}
        open={pendingLocalDiscard || pendingNavigationHref !== null}
        title="Annuler les modifications ?"
      />
    </>
  );
};
