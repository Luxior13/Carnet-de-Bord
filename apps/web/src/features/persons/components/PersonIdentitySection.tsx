'use client';

import { CalendarDays, UserRound } from 'lucide-react';
import React, { type FC, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';

import { RubricCard } from '$components/layout/RubricCard';
import { SectionActionBar } from '$components/layout/SectionActionBar';
import { UnsavedNavigationDialog } from '$components/layout/UnsavedNavigationDialog';
import { useUnsavedNavigationGuard } from '$hooks/useUnsavedNavigationGuard';
import { ApiClientError } from '$utils/api.utils';

import { updatePerson } from '../person.api';
import { isPersonIdentityEqual, zodErrorMap } from '../person.ui';
import { updatePersonSchema } from '../schemas/person.schemas';
import type { PersonDetail } from '../types/person.types';
import {
  PersonIdentityFields,
  type PersonIdentityFormValue,
} from './PersonIdentityFields';

type PersonIdentitySectionProps = {
  available?: boolean;
  canUpdate: boolean;
  onChange: (person: PersonDetail) => void;
  onDirtyChange?: (dirty: boolean) => void;
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
  available = true,
  canUpdate,
  onChange,
  onDirtyChange,
  onReload,
  person,
}) => {
  const [conflict, setConflict] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<PersonIdentityFormValue>(() =>
    toForm(person),
  );
  const [basePerson, setBasePerson] = useState(person);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);
  const [pendingLocalDiscard, setPendingLocalDiscard] = useState(false);
  const [actionBarSlot, setActionBarSlot] = useState<HTMLElement | null>(null);
  const mountedRef = useRef(false);
  const operationRef = useRef(false);
  const requestRef = useRef<AbortController | null>(null);
  const dirtyRef = useRef(false);
  const basePersonRef = useRef(basePerson);
  const latestPersonRef = useRef(person);
  const formRef = useRef<HTMLFormElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const localDiscardRef = useRef(false);
  const discardedRef = useRef(false);
  const version = basePerson.version;
  const isDirty = !isPersonIdentityEqual(basePerson, form);
  const isBusy = isSaving || isRefreshing;
  dirtyRef.current = isDirty;
  basePersonRef.current = basePerson;
  if (person.version >= latestPersonRef.current.version) {
    latestPersonRef.current = person;
  }
  const {
    cancelPendingNavigation,
    confirmPendingNavigation,
    pendingNavigationHref,
    restoreFocus,
  } = useUnsavedNavigationGuard(isDirty, () => {
    mountedRef.current = false;
    requestRef.current?.abort();
  });

  useEffect(() => {
    onDirtyChange?.(isDirty);

    return (): void => onDirtyChange?.(false);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    mountedRef.current = true;

    return (): void => {
      mountedRef.current = false;
      requestRef.current?.abort();
    };
  }, []);

  // Une réponse du parent ne doit pas remplacer un brouillon en cours. La
  // nouvelle version n'est adoptée qu'après une actualisation explicite.
  useEffect(() => {
    if (operationRef.current || person.version < basePersonRef.current.version)
      return;
    if (dirtyRef.current) {
      if (person.version !== basePersonRef.current.version) setConflict(true);

      return;
    }
    setBasePerson(person);
    setForm(toForm(person));
  }, [person]);

  // La barre est rendue hors de la section, dans l'emplacement de la page.
  useEffect(() => {
    setActionBarSlot(document.getElementById('person-record-action-bar'));
  }, []);

  const focusForm = (target: 'error' | 'field' | 'invalid'): void => {
    requestAnimationFrame(() => {
      if (!mountedRef.current) return;
      const field = formRef.current?.querySelector<HTMLElement>(
        target === 'invalid'
          ? '[aria-invalid="true"]:not(:disabled)'
          : 'input:not(:disabled)',
      );
      const destination = target === 'error' ? errorRef.current : field;
      (
        destination ?? formRef.current?.closest('section')?.querySelector('h2')
      )?.focus();
    });
  };

  const handleSave = async (): Promise<void> => {
    if (
      operationRef.current ||
      !mountedRef.current ||
      !canUpdate ||
      !available ||
      conflict ||
      !isDirty
    )
      return;
    const payload = {
      birthDate: form.birthDate || null,
      firstName: form.firstName || null,
      lastName: form.lastName || null,
      nickname: form.nickname || null,
      structureStatus: form.structureStatus,
      version,
    };
    const validation = updatePersonSchema.safeParse(payload);
    setSubmitError(null);
    setRefreshNotice(null);
    if (!validation.success) {
      setErrors(zodErrorMap(validation.error));
      focusForm('invalid');

      return;
    }

    setErrors({});
    operationRef.current = true;
    setIsSaving(true);
    const controller = new AbortController();
    requestRef.current = controller;
    const timer = window.setTimeout(() => controller.abort(), 30_000);
    try {
      const result = await updatePerson(person.id, payload, controller.signal);
      if (!mountedRef.current || result.person.id !== person.id) return;
      if (result.person.version < latestPersonRef.current.version) {
        setConflict(true);
        setSubmitError(
          'La fiche a changé pendant cet enregistrement. Actualisez la version pour vérifier votre saisie.',
        );
        focusForm('error');

        return;
      }
      basePersonRef.current = result.person;
      latestPersonRef.current = result.person;
      dirtyRef.current = false;
      setBasePerson(result.person);
      onChange(result.person);
      setForm(toForm(result.person));
      toast.success('Identité mise à jour');
      focusForm('field');
    } catch (caught) {
      if (!mountedRef.current) return;
      if (caught instanceof ApiClientError && caught.status === 409) {
        setConflict(true);
        setSubmitError(
          'La fiche a changé. Actualisez la version avant de confirmer votre saisie.',
        );
        focusForm('error');

        return;
      }
      if (
        !(caught instanceof ApiClientError) ||
        caught.status >= 500 ||
        caught.code === 'INVALID_RESPONSE'
      ) {
        setConflict(true);
        setSubmitError(
          'Le résultat de l’enregistrement n’a pas pu être confirmé. Actualisez la version pour vérifier la fiche avant de réessayer. Votre saisie est conservée.',
        );
        focusForm('error');

        return;
      }
      if ([401, 403, 404, 410].includes(caught.status)) {
        void onReload().catch(() => {});
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
        focusForm('invalid');
      } else {
        focusForm('error');
      }
      setSubmitError(
        caught instanceof Error
          ? caught.message
          : "Impossible de modifier l'identité",
      );
    } finally {
      window.clearTimeout(timer);
      if (requestRef.current === controller) requestRef.current = null;
      operationRef.current = false;
      if (mountedRef.current) setIsSaving(false);
    }
  };

  const discardLocalChanges = (): void => {
    if (operationRef.current) return;
    const latest = latestPersonRef.current;
    basePersonRef.current = latest;
    dirtyRef.current = false;
    discardedRef.current = true;
    setBasePerson(latest);
    setForm(toForm(latest));
    setErrors({});
    setSubmitError(null);
    setRefreshNotice(null);
    setConflict(false);
    setPendingLocalDiscard(false);
  };

  const refreshVersion = async (): Promise<void> => {
    if (operationRef.current || !mountedRef.current) return;
    operationRef.current = true;
    setIsRefreshing(true);
    setSubmitError(null);
    setRefreshNotice(null);
    const previous = toForm(basePerson);
    try {
      const fresh = await onReload();
      if (!mountedRef.current || fresh.id !== person.id) return;
      const latest = toForm(fresh);
      // Conserver les modifications locales, mais récupérer les changements
      // serveur des champs que l'utilisateur n'a pas touchés.
      setForm({
        birthDate:
          form.birthDate !== previous.birthDate
            ? form.birthDate
            : latest.birthDate,
        firstName:
          form.firstName.trim() !== previous.firstName
            ? form.firstName
            : latest.firstName,
        lastName:
          form.lastName.trim() !== previous.lastName
            ? form.lastName
            : latest.lastName,
        nickname:
          form.nickname.trim() !== previous.nickname
            ? form.nickname
            : latest.nickname,
        structureStatus:
          form.structureStatus !== previous.structureStatus
            ? form.structureStatus
            : latest.structureStatus,
      });
      basePersonRef.current = fresh;
      latestPersonRef.current = fresh;
      setBasePerson(fresh);
      setErrors({});
      setConflict(false);
      setRefreshNotice(
        'Version actualisée. Vos modifications sont conservées ; les autres champs sont à jour. Vérifiez avant d’enregistrer.',
      );
      focusForm('field');
    } catch {
      if (!mountedRef.current) return;
      setSubmitError(
        'Actualisation impossible. Votre saisie est conservée ; réessayez avant d’enregistrer.',
      );
      focusForm('error');
    } finally {
      operationRef.current = false;
      if (mountedRef.current) setIsRefreshing(false);
    }
  };

  return (
    <>
      <section id="person-identity">
        {/* The section link already names the section: no visible title. */}
        <h2 className="sr-only" id="person-identity-title" tabIndex={-1}>
          Identité
        </h2>
        <form
          aria-busy={isBusy || undefined}
          aria-labelledby="person-identity-title"
          autoComplete="off"
          className="space-y-3"
          id="person-identity-form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void handleSave();
          }}
          ref={formRef}
        >
          {submitError && (
            <p
              className="text-destructive text-sm"
              ref={errorRef}
              role="alert"
              tabIndex={-1}
            >
              {submitError}
            </p>
          )}
          {refreshNotice && (
            <p className="text-muted-foreground text-sm" role="status">
              {refreshNotice}
            </p>
          )}
          {/* Two named rubrics (27 October 2026), none repeating the tab. */}
          <RubricCard
            icon={<UserRound />}
            id="person-identity-names-title"
            title="Pseudo et nom"
          >
            <PersonIdentityFields
              disabled={!canUpdate || !available || isBusy}
              errors={errors}
              idPrefix="person-detail"
              onChange={(key, nextValue) =>
                setForm((current) => ({ ...current, [key]: nextValue }))
              }
              value={form}
              variant="quiet"
              part="names"
            />
          </RubricCard>
          <RubricCard
            icon={<CalendarDays />}
            id="person-identity-situation-title"
            title="Naissance et statut"
          >
            <PersonIdentityFields
              disabled={!canUpdate || !available || isBusy}
              errors={errors}
              idPrefix="person-detail"
              onChange={(key, nextValue) =>
                setForm((current) => ({ ...current, [key]: nextValue }))
              }
              value={form}
              variant="quiet"
              part="situation"
            />
          </RubricCard>
        </form>
      </section>

      {(isDirty || conflict) &&
        actionBarSlot &&
        createPortal(
          <SectionActionBar
            conflict={conflict}
            hasChanges={isDirty}
            isResolvingConflict={isRefreshing}
            isSaving={isSaving}
            onCancel={() => {
              if (operationRef.current) return;
              localDiscardRef.current = true;
              setPendingLocalDiscard(true);
            }}
            onResolveConflict={() => void refreshVersion()}
            saveDisabled={!canUpdate || !available}
            saveDisabledReason={
              !canUpdate
                ? 'La modification de cette fiche n’est plus autorisée.'
                : !available
                  ? 'Revérifiez la disponibilité du service avant d’enregistrer.'
                  : undefined
            }
            saveForm="person-identity-form"
            saveType="submit"
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
            : isSaving
              ? 'Quitter la page'
              : 'Quitter sans enregistrer'
        }
        contentClassName="sm:max-w-lg"
        description={
          pendingLocalDiscard
            ? 'Les modifications de cette information ne sont pas enregistrées.'
            : isSaving
              ? 'Un enregistrement est en cours. Quitter la page ne garantit pas son annulation. Vérifiez la fiche à votre retour.'
              : 'Vous avez des modifications non enregistrées sur cette fiche. Quitter la page abandonnera votre saisie locale.'
        }
        onCancel={() => {
          setPendingLocalDiscard(false);
          cancelPendingNavigation();
        }}
        onCloseAutoFocus={(event) => {
          if (discardedRef.current) {
            event.preventDefault();
            discardedRef.current = false;
            focusForm('field');
          } else if (!localDiscardRef.current) {
            restoreFocus(event);
          }
          localDiscardRef.current = false;
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
