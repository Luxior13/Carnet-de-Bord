'use client';

import { Check, History, Loader2, RotateCcw, Trash2 } from 'lucide-react';
import React, { type FC, useEffect, useMemo, useState } from 'react';
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
import {
  PersonFieldHistoryPanel,
  type PersonFieldHistoryTarget,
} from './PersonFieldHistoryPanel';

type PersonChildKind = 'email' | 'phone' | 'social';
type PersonChildItem =
  PersonEmailItem | PersonPhoneItem | PersonSocialProfileItem;
type ChildDraft = EmailDraft | PhoneDraft | SocialDraft;

type PersonChildDialogProps = {
  canEdit: boolean;
  canViewAudit: boolean;
  canViewHistory: boolean;
  defaultPrimary: boolean;
  item: PersonChildItem | null;
  kind: PersonChildKind;
  onDelete: () => void;
  onOpenChange: (open: boolean) => void;
  onPersonChange: (person: PersonDetail) => void;
  onReload: () => Promise<PersonDetail>;
  open: boolean;
  person: PersonDetail;
};

const getDraft = (
  kind: PersonChildKind,
  item: PersonChildItem | null,
  defaultPrimary: boolean,
): ChildDraft => {
  if (kind === 'email') {
    const email = item as PersonEmailItem | null;

    return {
      email: email?.email ?? '',
      isPrimary: email?.isPrimary ?? defaultPrimary,
      label: email?.label ?? 'Personnel',
    };
  }
  if (kind === 'phone') {
    const phone = item as PersonPhoneItem | null;

    return {
      countryCode: phone?.countryCode ?? 'FR',
      isPrimary: phone?.isPrimary ?? defaultPrimary,
      label: phone?.label ?? 'Personnel',
      phone: phone?.phone ?? '',
    };
  }
  const social = item as PersonSocialProfileItem | null;

  return {
    identifier: social?.identifier ?? '',
    isPrimary: social?.isPrimary ?? defaultPrimary,
    label: social?.label ?? 'Personnel',
    networkKey: social?.networkKey ?? 'discord',
    profileUrl: social?.profileUrl ?? '',
  };
};

type KindConfig = {
  plural: 'emails' | 'reseaux-sociaux' | 'telephones';
  title: string;
};

type ValidationResult = { error: ZodError; success: false } | { success: true };

const getKindConfig = (kind: PersonChildKind): KindConfig => {
  switch (kind) {
    case 'email':
      return { plural: 'emails' as const, title: 'email' };
    case 'phone':
      return { plural: 'telephones' as const, title: 'téléphone' };
    case 'social':
      return { plural: 'reseaux-sociaux' as const, title: 'profil social' };
  }
};

export const PersonChildDialog: FC<PersonChildDialogProps> = ({
  canEdit,
  canViewAudit,
  canViewHistory,
  defaultPrimary,
  item,
  kind,
  onDelete,
  onOpenChange,
  onPersonChange,
  onReload,
  open,
  person,
}) => {
  const initialDraft = useMemo(
    () => getDraft(kind, item, defaultPrimary),
    [defaultPrimary, item, kind],
  );
  const [childVersion, setChildVersion] = useState(item?.version ?? null);
  const [activeHistory, setActiveHistory] =
    useState<PersonFieldHistoryTarget | null>(null);
  const [conflict, setConflict] = useState(false);
  const [draft, setDraft] = useState<ChildDraft>(initialDraft);
  const [duplicateWarnings, setDuplicateWarnings] = useState<
    Record<string, string>
  >({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [pendingClose, setPendingClose] = useState(false);
  const [personVersion, setPersonVersion] = useState(person.version);
  const [saved, setSaved] = useState(false);
  const config = getKindConfig(kind);
  const isDirty =
    canEdit && JSON.stringify(draft) !== JSON.stringify(initialDraft);
  const {
    cancelPendingNavigation,
    confirmPendingNavigation,
    pendingNavigationHref,
  } = useUnsavedNavigationGuard(open && canEdit && !saved && isDirty);

  useEffect(() => {
    if (!open) return;
    setDraft(initialDraft);
    setPersonVersion(person.version);
    setChildVersion(item?.version ?? null);
    setConflict(false);
    setActiveHistory(null);
    setDuplicateWarnings({});
    setErrors({});
    setPendingClose(false);
    setSaved(false);
  }, [initialDraft, item?.version, open, person.version]);

  useEffect(() => {
    setActiveHistory(null);
  }, [canViewAudit, canViewHistory]);

  const close = (): void => {
    if (!saved && isDirty) {
      setPendingClose(true);

      return;
    }
    onOpenChange(false);
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
    if (!canEdit) return;
    if (saved) return close();
    const payload = getPayload();
    const validation = validate(payload);
    if (!validation.success) {
      setErrors(zodErrorMap(validation.error));
      requestAnimationFrame(() => {
        document
          .querySelector<HTMLElement>('[role="dialog"] [aria-invalid="true"]')
          ?.focus();
      });

      return;
    }

    setErrors({});
    setConflict(false);
    setIsSaving(true);
    try {
      const result = await mutatePersonChild({
        ...(item ? { childId: item.id } : {}),
        kind: config.plural,
        method: item ? 'PATCH' : 'POST',
        payload,
        personId: person.id,
      });
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
      } else {
        onOpenChange(false);
      }
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
      }
      toast.error(
        caught instanceof Error ? caught.message : 'Enregistrement impossible',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const refreshVersions = async (): Promise<void> => {
    const fresh = await onReload();
    setPersonVersion(fresh.version);
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
        toast.error(
          'Cette information a été supprimée par un autre utilisateur',
        );
        close();

        return;
      }
      setChildVersion(freshItem.version);
    }
    setConflict(false);
    toast.info('Version actualisée, votre saisie est conservée');
  };

  const showPrimarySwitch = !item?.isPrimary;
  const historyTarget = (
    fieldKey: string,
    label: string,
    sectionKey: string,
  ): PersonFieldHistoryTarget | undefined =>
    canViewHistory && item
      ? {
          canViewAudit,
          fieldKey,
          label,
          personId: person.id,
          recordId: item.id,
          revision: childVersion ?? item.version,
          sectionKey,
        }
      : undefined;
  const histories =
    kind === 'email'
      ? {
          email: historyTarget(
            'email',
            'Adresse email',
            PERSON_AUDIT_KEYS.sections.contacts,
          ),
          isPrimary: historyTarget(
            'isPrimary',
            'Statut principal',
            PERSON_AUDIT_KEYS.sections.contacts,
          ),
          label: historyTarget(
            'label',
            'Libellé',
            PERSON_AUDIT_KEYS.sections.contacts,
          ),
        }
      : kind === 'phone'
        ? {
            isPrimary: historyTarget(
              'isPrimary',
              'Statut principal',
              PERSON_AUDIT_KEYS.sections.contacts,
            ),
            label: historyTarget(
              'label',
              'Libellé',
              PERSON_AUDIT_KEYS.sections.contacts,
            ),
            phone: historyTarget(
              'phone',
              'Numéro de téléphone',
              PERSON_AUDIT_KEYS.sections.contacts,
            ),
          }
        : {
            identifier: historyTarget(
              'identifier',
              'Identifiant visible',
              PERSON_AUDIT_KEYS.sections.social,
            ),
            isPrimary: historyTarget(
              'isPrimary',
              'Statut principal',
              PERSON_AUDIT_KEYS.sections.social,
            ),
            label: historyTarget(
              'label',
              'Libellé',
              PERSON_AUDIT_KEYS.sections.social,
            ),
            networkKey: historyTarget(
              'networkKey',
              'Réseau',
              PERSON_AUDIT_KEYS.sections.social,
            ),
            profileUrl: historyTarget(
              'profileUrl',
              'URL du profil',
              PERSON_AUDIT_KEYS.sections.social,
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
          className={`grid h-[100svh] max-h-[100svh] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-0 ${item ? 'sm:h-[min(42rem,85svh)] sm:max-w-4xl' : 'sm:h-auto sm:max-h-[85svh] sm:max-w-2xl'}`}
          fullscreenOnMobile
        >
          <DialogHeader className="border-border-divider border-b px-4 py-4 pr-14 text-left sm:px-5">
            <DialogTitle>
              {item ? (canEdit ? 'Modifier' : 'Consulter') : 'Ajouter'} un{' '}
              {config.title}
            </DialogTitle>
            <DialogDescription>
              {!canEdit
                ? 'Consultez les informations et leur historique sans modifier la fiche.'
                : item?.isPrimary
                  ? "Cette information est principale. Pour la remplacer, définissez d'abord une autre information comme principale."
                  : 'Les doublons sur une autre fiche sont signalés sans bloquer les cas légitimes.'}
            </DialogDescription>
          </DialogHeader>
          <div
            className={`min-h-0 overflow-y-auto px-4 py-4 sm:px-5 ${item ? 'lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(17rem,0.72fr)] lg:gap-5' : ''}`}
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
                      onClick={() => void refreshVersions()}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <RotateCcw className="size-4" />
                      Actualiser la version
                    </Button>
                  }
                  description="La fiche a changé. Actualisez les versions puis vérifiez votre saisie avant de réessayer."
                  kind="warning"
                  title="Modification concurrente"
                />
              )}
              {kind === 'email' && (
                <EmailFields
                  activeHistoryFieldKey={activeHistory?.fieldKey}
                  disabled={!canEdit || isSaving || saved}
                  errors={errors}
                  histories={histories}
                  idPrefix="person-child-email"
                  layout="stacked"
                  onChange={setDraft}
                  onHistoryOpen={setActiveHistory}
                  showPrimarySwitch={showPrimarySwitch}
                  value={draft as EmailDraft}
                  warnings={duplicateWarnings}
                />
              )}
              {kind === 'phone' && (
                <PhoneFields
                  activeHistoryFieldKey={activeHistory?.fieldKey}
                  disabled={!canEdit || isSaving || saved}
                  errors={errors}
                  histories={histories}
                  idPrefix="person-child-phone"
                  layout="stacked"
                  onChange={setDraft}
                  onHistoryOpen={setActiveHistory}
                  showPrimarySwitch={showPrimarySwitch}
                  value={draft as PhoneDraft}
                  warnings={duplicateWarnings}
                />
              )}
              {kind === 'social' && (
                <SocialFields
                  activeHistoryFieldKey={activeHistory?.fieldKey}
                  disabled={!canEdit || isSaving || saved}
                  errors={errors}
                  histories={histories}
                  idPrefix="person-child-social"
                  layout="stacked"
                  onChange={setDraft}
                  onHistoryOpen={setActiveHistory}
                  showPrimarySwitch={showPrimarySwitch}
                  value={draft as SocialDraft}
                  warnings={duplicateWarnings}
                />
              )}
            </div>
            {activeHistory ? (
              <PersonFieldHistoryPanel
                {...activeHistory}
                onClose={() => setActiveHistory(null)}
              />
            ) : (
              item && (
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
              )
            )}
          </div>
          <DialogFooter
            className={`border-border-divider bg-surface-inset border-t px-4 py-4 sm:justify-between sm:px-5 ${activeHistory ? 'hidden lg:flex' : ''}`}
          >
            {canEdit && item && !saved && (
              <Button
                disabled={isSaving}
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
                      disabled={isSaving}
                      onClick={close}
                      type="button"
                      variant="outline"
                    >
                      Annuler
                    </Button>
                  )}
                  <Button
                    disabled={isSaving}
                    onClick={() => void handleSave()}
                    type="button"
                  >
                    {isSaving ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Check className="size-4" />
                    )}
                    {saved
                      ? 'Terminer'
                      : isSaving
                        ? 'Enregistrement…'
                        : 'Enregistrer'}
                  </Button>
                </>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <UnsavedNavigationDialog
        contentClassName="sm:max-w-md"
        description="Les modifications de cette information ne sont pas enregistrées."
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
