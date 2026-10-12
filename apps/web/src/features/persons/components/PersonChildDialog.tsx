'use client';

import { Check, RotateCcw, Trash2 } from 'lucide-react';
import React, { type FC, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { ZodError } from 'zod';

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

import { mutatePersonChild } from '../person.api';
import { PERSON_AUDIT_KEYS } from '../person.constants';
import { zodErrorMap } from '../person.ui';
import {
  type ChildDraft,
  comparableValue,
  getDraft,
  getKindConfig,
  mergeDraft,
  type PersonChildItem,
  type PersonChildKind,
  sameDraft,
} from '../person-child-draft';
import {
  createPersonEmailSchema,
  createPersonPhoneSchema,
  createPersonSocialProfileSchema,
  updatePersonEmailSchema,
  updatePersonPhoneSchema,
  updatePersonSocialProfileSchema,
} from '../schemas/person.schemas';
import type {
  PersonDetail,
  PersonEmailItem,
  PersonPhoneItem,
  PersonSocialProfileItem,
} from '../types/person.types';
import {
  type EmailDraft,
  EmailFields,
  type PhoneDraft,
  PhoneFields,
  type SocialDraft,
  SocialFields,
} from './PersonCollectionFields';
import type { PersonFieldProvenanceTarget } from './PersonFieldProvenanceHint';

type PersonChildDialogProps = {
  available?: boolean;
  canEdit: boolean;
  canViewProvenance: boolean;
  defaultPrimary: boolean;
  item: PersonChildItem | null;
  kind: PersonChildKind;
  onCloseAutoFocus?: (event: Event) => void;
  onDelete: () => void;
  onOpenChange: (open: boolean) => void;
  onPersonChange: (person: PersonDetail) => void;
  onReload: () => Promise<PersonDetail>;
  open: boolean;
  person: PersonDetail;
};

type ValidationResult =
  | { error: ZodError; success: false }
  | { data: Record<string, unknown>; success: true };

const PersonChildDialogContent: FC<PersonChildDialogProps> = ({
  available = true,
  canEdit,
  canViewProvenance,
  defaultPrimary,
  item,
  kind,
  onCloseAutoFocus,
  onDelete,
  onOpenChange,
  onPersonChange,
  onReload,
  open,
  person,
}) => {
  const [baseDraft, setBaseDraft] = useState(() =>
    getDraft(kind, item, defaultPrimary),
  );
  const [baseItem, setBaseItem] = useState(item);
  const operationRef = useRef(false);
  const mountedRef = useRef(false);
  const requestRef = useRef<AbortController | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const closeTriggerRef = useRef<HTMLElement | null>(null);
  const latestVersionRef = useRef(person.version);
  latestVersionRef.current = Math.max(latestVersionRef.current, person.version);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [childVersion, setChildVersion] = useState(item?.version ?? null);
  const [conflict, setConflict] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [draft, setDraft] = useState<ChildDraft>(baseDraft);
  const [duplicateWarnings, setDuplicateWarnings] = useState<
    Record<string, string>
  >({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const busy = isSaving || isRefreshing;
  const [pendingClose, setPendingClose] = useState(false);
  const [personVersion, setPersonVersion] = useState(person.version);
  const [saved, setSaved] = useState(false);
  const config = getKindConfig(kind);
  const isDirty = canEdit && !sameDraft(draft, baseDraft);
  const {
    cancelPendingNavigation,
    confirmPendingNavigation,
    pendingNavigationHref,
    restoreFocus,
  } = useUnsavedNavigationGuard(open && canEdit && !saved && isDirty, () => {
    mountedRef.current = false;
    requestRef.current?.abort();
  });

  useEffect(() => {
    mountedRef.current = true;

    return (): void => {
      mountedRef.current = false;
      requestRef.current?.abort();
    };
  }, []);

  const close = (): void => {
    if (operationRef.current) return;
    if (!saved && isDirty) {
      closeTriggerRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      setPendingClose(true);

      return;
    }
    onOpenChange(false);
  };

  const focusContent = (target: 'feedback' | 'field' | 'invalid'): void => {
    requestAnimationFrame(() => {
      if (!mountedRef.current) return;
      const field = formRef.current?.querySelector<HTMLElement>(
        target === 'invalid'
          ? '[aria-invalid="true"]:not(:disabled)'
          : 'input:not(:disabled):not([type="hidden"])',
      );
      (target === 'feedback'
        ? feedbackRef.current
        : (field ?? feedbackRef.current)
      )?.focus();
    });
  };

  const changeDraft = (next: ChildDraft): void => {
    if (operationRef.current || saved) return;
    setDraft(next);
    setSaveError(null);
    setErrors({});
  };

  const forceClose = (): void => {
    setPendingClose(false);
    cancelPendingNavigation();
    onOpenChange(false);
  };

  const getPayload = (): Record<string, unknown> => {
    const common = {
      ...draft,
      personVersion,
      ...(item && childVersion ? { version: childVersion } : {}),
    };
    if (kind === 'social') {
      const social = common as SocialDraft & Record<string, unknown>;

      return {
        ...common,
        identifier: social.identifier || null,
        profileUrl: social.profileUrl || null,
      };
    }

    return common;
  };

  const validate = (payload: Record<string, unknown>): ValidationResult => {
    if (kind === 'email') {
      return item
        ? updatePersonEmailSchema.safeParse(payload)
        : createPersonEmailSchema.safeParse(payload);
    }
    if (kind === 'phone') {
      return item
        ? updatePersonPhoneSchema.safeParse(payload)
        : createPersonPhoneSchema.safeParse(payload);
    }

    return item
      ? updatePersonSocialProfileSchema.safeParse(payload)
      : createPersonSocialProfileSchema.safeParse(payload);
  };

  const handleSave = async (): Promise<void> => {
    if (!canEdit || operationRef.current || !mountedRef.current) return;
    if (saved) return close();
    if (!available || conflict) return;
    if (item && !isDirty) return;
    const payload = getPayload();
    const validation = validate(payload);
    if (!validation.success) {
      setErrors(zodErrorMap(validation.error));
      focusContent('invalid');

      return;
    }

    operationRef.current = true;
    setSaveError(null);
    setErrors({});
    setConflict(false);
    setIsSaving(true);
    const controller = new AbortController();
    requestRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      const result = await mutatePersonChild({
        ...(item ? { childId: item.id } : {}),
        kind: config.plural,
        method: item ? 'PATCH' : 'POST',
        payload,
        personId: person.id,
        signal: controller.signal,
      });
      if (!mountedRef.current) return;
      if (
        result.person.id !== person.id ||
        result.person.version < latestVersionRef.current
      ) {
        setConflict(true);
        setSaveError(
          'La fiche a changé pendant cette demande. Actualisez la version avant de poursuivre.',
        );
        focusContent('feedback');

        return;
      }
      onPersonChange(result.person);
      toast.success(item ? 'Information mise à jour' : 'Information ajoutée');
      if (result.duplicateWarning?.duplicateFound) {
        const fallbackFields =
          kind === 'email'
            ? ['email']
            : kind === 'phone'
              ? ['phone']
              : [
                  ...((draft as SocialDraft).identifier ? ['identifier'] : []),
                  ...((draft as SocialDraft).profileUrl ? ['profileUrl'] : []),
                ];
        const returnedFields = result.duplicateWarning.fields ?? [];
        const duplicateFields =
          returnedFields.length > 0 ? returnedFields : fallbackFields;
        setDuplicateWarnings(
          Object.fromEntries(
            duplicateFields.map((field) => [
              field,
              'Cette valeur existe aussi sur une autre fiche. Elle a bien été enregistrée ici.',
            ]),
          ),
        );
        setSaved(true);
        focusContent('feedback');
      } else {
        onOpenChange(false);
      }
    } catch (caught) {
      if (!mountedRef.current) return;
      if (caught instanceof ApiClientError && caught.status === 409) {
        setConflict(true);
        focusContent('feedback');

        return;
      }
      if (
        caught instanceof ApiClientError &&
        [401, 403].includes(caught.status)
      ) {
        await onReload().catch(() => undefined);
        if (!mountedRef.current) return;
      }
      if (
        !(caught instanceof ApiClientError) ||
        caught.code === 'INVALID_RESPONSE' ||
        caught.status >= 500
      ) {
        setConflict(true);
        setUncertain(true);
        setSaveError(
          'Le résultat de l’enregistrement n’a pas pu être confirmé. Actualisez la fiche et vérifiez les valeurs avant toute nouvelle tentative.',
        );
        focusContent('feedback');

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
      }
      setSaveError(
        caught instanceof Error ? caught.message : 'Enregistrement impossible',
      );
      focusContent(
        caught instanceof ApiClientError && caught.details
          ? 'invalid'
          : 'feedback',
      );
    } finally {
      clearTimeout(timeout);
      if (requestRef.current === controller) requestRef.current = null;
      operationRef.current = false;
      if (mountedRef.current) setIsSaving(false);
    }
  };

  const refreshVersions = async (): Promise<void> => {
    if (operationRef.current || !mountedRef.current) return;
    operationRef.current = true;
    setIsRefreshing(true);
    setSaveError(null);
    try {
      const fresh = await onReload();
      if (!mountedRef.current) return;
      if (
        fresh.id !== person.id ||
        fresh.version < Math.max(personVersion, latestVersionRef.current)
      ) {
        throw new Error('Réponse de relecture périmée');
      }
      if (item) {
        const collection =
          kind === 'email'
            ? fresh.emails
            : kind === 'phone'
              ? fresh.phones
              : fresh.socialProfiles;
        const freshItem = collection.find(
          (candidate) => candidate.id === item.id,
        );
        if (!freshItem) {
          setSaveError(
            'Cette information a été supprimée par un autre utilisateur',
          );
          focusContent('feedback');

          return;
        }
        if (childVersion !== null && freshItem.version < childVersion) {
          throw new Error('Version de coordonnée périmée');
        }
        const freshDraft = getDraft(kind, freshItem, defaultPrimary);
        setDraft((current) => mergeDraft(baseDraft, current, freshDraft));
        setBaseDraft(freshDraft);
        setBaseItem(freshItem);
        setChildVersion(freshItem.version);
      } else if (uncertain) {
        const collection =
          kind === 'email'
            ? fresh.emails
            : kind === 'phone'
              ? fresh.phones
              : fresh.socialProfiles;
        const validation = validate(getPayload());
        const matching = validation.success
          ? collection.find((candidate) =>
              Object.entries(getDraft(kind, candidate, defaultPrimary)).every(
                ([key, value]) =>
                  comparableValue(value) ===
                  comparableValue(
                    Object.entries(validation.data).find(
                      ([entry]) => entry === key,
                    )?.[1],
                  ),
              ),
            )
          : undefined;
        if (matching) {
          setBaseItem(matching);
          setBaseDraft(getDraft(kind, matching, defaultPrimary));
          setChildVersion(matching.version);
          setSaved(true);
          setSaveError(
            'Cette information est présente dans la fiche actualisée. Aucun nouvel ajout n’a été envoyé.',
          );
        }
      }
      setPersonVersion(fresh.version);
      setConflict(false);
      setUncertain(false);
      setErrors({});
      toast.info(
        'Version actualisée. Vos modifications sont conservées ; les autres champs sont à jour.',
      );
      focusContent('field');
    } catch {
      if (mountedRef.current) {
        setSaveError(
          'Actualisation impossible. Votre saisie est conservée ; réessayez.',
        );
        focusContent('feedback');
      }
    } finally {
      operationRef.current = false;
      if (mountedRef.current) setIsRefreshing(false);
    }
  };

  const showPrimarySwitch = !baseItem?.isPrimary;
  const provenanceTarget = (
    fieldKey: string,
    label: string,
    sectionKey: string,
    hasValue: boolean,
  ): PersonFieldProvenanceTarget | undefined => {
    return canViewProvenance && baseItem && hasValue
      ? {
          fieldKey,
          label,
          personId: person.id,
          recordId: baseItem.id,
          revision: childVersion ?? baseItem.version,
          sectionKey,
        }
      : undefined;
  };
  const emailItem =
    kind === 'email' ? (baseItem as PersonEmailItem | null) : null;
  const phoneItem =
    kind === 'phone' ? (baseItem as PersonPhoneItem | null) : null;
  const socialItem =
    kind === 'social' ? (baseItem as PersonSocialProfileItem | null) : null;
  const provenances =
    kind === 'email'
      ? {
          email: provenanceTarget(
            'email',
            'Adresse email',
            PERSON_AUDIT_KEYS.sections.contacts,
            Boolean(emailItem?.email),
          ),
          isPrimary: provenanceTarget(
            'isPrimary',
            'Statut principal',
            PERSON_AUDIT_KEYS.sections.contacts,
            Boolean(emailItem),
          ),
          label: provenanceTarget(
            'label',
            'Libellé',
            PERSON_AUDIT_KEYS.sections.contacts,
            Boolean(emailItem?.label),
          ),
        }
      : kind === 'phone'
        ? {
            isPrimary: provenanceTarget(
              'isPrimary',
              'Statut principal',
              PERSON_AUDIT_KEYS.sections.contacts,
              Boolean(phoneItem),
            ),
            label: provenanceTarget(
              'label',
              'Libellé',
              PERSON_AUDIT_KEYS.sections.contacts,
              Boolean(phoneItem?.label),
            ),
            phone: provenanceTarget(
              'phone',
              'Numéro de téléphone',
              PERSON_AUDIT_KEYS.sections.contacts,
              Boolean(phoneItem?.phone),
            ),
          }
        : {
            identifier: provenanceTarget(
              'identifier',
              'Identifiant visible',
              PERSON_AUDIT_KEYS.sections.social,
              Boolean(socialItem?.identifier),
            ),
            isPrimary: provenanceTarget(
              'isPrimary',
              'Statut principal',
              PERSON_AUDIT_KEYS.sections.social,
              Boolean(socialItem),
            ),
            label: provenanceTarget(
              'label',
              'Libellé',
              PERSON_AUDIT_KEYS.sections.social,
              Boolean(socialItem?.label),
            ),
            networkKey: provenanceTarget(
              'networkKey',
              'Réseau',
              PERSON_AUDIT_KEYS.sections.social,
              Boolean(socialItem?.networkKey),
            ),
            profileUrl: provenanceTarget(
              'profileUrl',
              'URL du profil',
              PERSON_AUDIT_KEYS.sections.social,
              Boolean(socialItem?.profileUrl),
            ),
          };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) close();
        }}
      >
        <DialogContent
          aria-busy={busy || undefined}
          className="flex h-[100svh] max-h-[100svh] flex-col overflow-hidden p-0 sm:h-auto sm:max-h-[85svh] sm:max-w-2xl"
          fullscreenOnMobile
          onCloseAutoFocus={onCloseAutoFocus}
          onOpenAutoFocus={(event) => {
            if (canEdit) {
              event.preventDefault();
              focusContent('field');
            }
          }}
        >
          <form
            autoComplete="off"
            className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)_auto]"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              void handleSave();
            }}
            ref={formRef}
          >
            <DialogHeader className="bg-surface-panel-header border-border-divider border-b px-4 py-4 pr-14 text-left sm:px-5">
              <DialogTitle>
                {item ? (canEdit ? 'Modifier' : 'Consulter') : 'Ajouter'} un{' '}
                {config.title}
              </DialogTitle>
              <DialogDescription>
                {!canEdit
                  ? 'Consultez les informations sans modifier la fiche.'
                  : baseItem?.isPrimary
                    ? "Cette information est principale. Pour la remplacer, définissez d'abord une autre information comme principale."
                    : 'Les doublons sur une autre fiche sont signalés sans bloquer les cas légitimes.'}
              </DialogDescription>
            </DialogHeader>
            <div className="min-h-0 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
              {!available && (
                <p role="status" className="text-warning text-sm">
                  Le répertoire est temporairement indisponible. Votre saisie
                  est conservée ; l’enregistrement reprendra après son
                  rétablissement.
                </p>
              )}
              {(saveError || conflict || saved) && (
                <div
                  ref={feedbackRef}
                  tabIndex={-1}
                  role="group"
                  aria-label="Résultat de l’enregistrement"
                  className="space-y-3"
                >
                  {saveError && (
                    <p
                      role="alert"
                      className={
                        saved
                          ? 'text-muted-foreground text-sm'
                          : 'text-destructive text-sm'
                      }
                    >
                      {saveError}
                    </p>
                  )}
                  {conflict && (
                    <ContentState
                      action={
                        <Button
                          disabled={busy || !available}
                          loading={isRefreshing}
                          onClick={() => void refreshVersions()}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <RotateCcw className="size-4" />
                          {isRefreshing
                            ? 'Actualisation…'
                            : 'Actualiser la version'}
                        </Button>
                      }
                      description={
                        uncertain
                          ? 'La demande a peut-être été enregistrée. Actualisez puis vérifiez les valeurs avant une nouvelle tentative.'
                          : 'La fiche a changé. Actualisez les versions puis vérifiez votre saisie avant de réessayer.'
                      }
                      kind="warning"
                      title={
                        uncertain
                          ? 'Enregistrement à vérifier'
                          : 'Modification concurrente'
                      }
                    />
                  )}
                  {saved && (
                    <p role="status" className="text-sm">
                      Information enregistrée. Vous pouvez fermer cette fenêtre.
                    </p>
                  )}
                </div>
              )}
              {kind === 'email' && (
                <EmailFields
                  disabled={!canEdit || busy || saved}
                  errors={errors}
                  idPrefix="person-child-email"
                  layout="stacked"
                  onChange={changeDraft}
                  provenances={provenances}
                  showPrimarySwitch={showPrimarySwitch}
                  value={draft as EmailDraft}
                  warnings={duplicateWarnings}
                />
              )}
              {kind === 'phone' && (
                <PhoneFields
                  disabled={!canEdit || busy || saved}
                  errors={errors}
                  idPrefix="person-child-phone"
                  layout="stacked"
                  onChange={changeDraft}
                  provenances={provenances}
                  showPrimarySwitch={showPrimarySwitch}
                  value={draft as PhoneDraft}
                  warnings={duplicateWarnings}
                />
              )}
              {kind === 'social' && (
                <SocialFields
                  disabled={!canEdit || busy || saved}
                  errors={errors}
                  idPrefix="person-child-social"
                  layout="stacked"
                  onChange={changeDraft}
                  provenances={provenances}
                  showPrimarySwitch={showPrimarySwitch}
                  value={draft as SocialDraft}
                  warnings={duplicateWarnings}
                />
              )}
            </div>
            <DialogFooter className="border-border-divider bg-surface-inset border-t px-4 py-4 sm:justify-between sm:px-5">
              {canEdit && item && !saved && (
                <Button
                  disabled={busy || !available}
                  onClick={onDelete}
                  type="button"
                  variant="destructive"
                >
                  <Trash2 className="size-4" />
                  Supprimer
                </Button>
              )}
              <div className="flex flex-col-reverse gap-2 sm:ml-auto sm:flex-row">
                {!canEdit ? (
                  <Button onClick={close} type="button">
                    Fermer
                  </Button>
                ) : (
                  <>
                    {!saved && (
                      <Button
                        disabled={busy}
                        onClick={close}
                        type="button"
                        variant="outline"
                      >
                        Annuler
                      </Button>
                    )}
                    <Button
                      disabled={
                        busy ||
                        (!saved &&
                          (!available || conflict || Boolean(item && !isDirty)))
                      }
                      loading={busy}
                      type="submit"
                    >
                      {!busy && <Check className="size-4" />}
                      {saved
                        ? 'Terminer'
                        : busy
                          ? isRefreshing
                            ? 'Actualisation…'
                            : 'Enregistrement…'
                          : 'Enregistrer'}
                    </Button>
                  </>
                )}
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <UnsavedNavigationDialog
        contentClassName="sm:max-w-md"
        description={
          uncertain || isSaving
            ? 'Une demande a été envoyée. Quitter cette page ne l’annule pas ; vérifiez la fiche avant toute nouvelle tentative.'
            : 'Les modifications de cette information ne sont pas enregistrées.'
        }
        onCloseAutoFocus={(event) => {
          const trigger = closeTriggerRef.current;
          if (trigger?.isConnected && !trigger.hasAttribute('disabled')) {
            event.preventDefault();
            trigger.focus();
            closeTriggerRef.current = null;
          } else restoreFocus(event);
        }}
        onCancel={() => {
          setPendingClose(false);
          cancelPendingNavigation();
        }}
        onConfirm={() => {
          if (pendingClose) forceClose();
          else confirmPendingNavigation();
        }}
        open={pendingClose || pendingNavigationHref !== null}
      />
    </>
  );
};

export const PersonChildDialog: FC<PersonChildDialogProps> = (props) =>
  props.open ? (
    <PersonChildDialogContent
      key={`${props.person.id}:${props.kind}:${props.item?.id ?? 'new'}:${props.canEdit}`}
      {...props}
    />
  ) : null;
