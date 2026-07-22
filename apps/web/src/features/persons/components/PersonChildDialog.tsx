'use client';

import { Check, Loader2, RotateCcw } from 'lucide-react';
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

type PersonChildKind = 'email' | 'phone' | 'social';
type PersonChildItem =
  PersonEmailItem | PersonPhoneItem | PersonSocialProfileItem;
type ChildDraft = EmailDraft | PhoneDraft | SocialDraft;

type PersonChildDialogProps = {
  defaultPrimary: boolean;
  item: PersonChildItem | null;
  kind: PersonChildKind;
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
  defaultPrimary,
  item,
  kind,
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
  const isDirty = JSON.stringify(draft) !== JSON.stringify(initialDraft);
  const {
    cancelPendingNavigation,
    confirmPendingNavigation,
    pendingNavigationHref,
  } = useUnsavedNavigationGuard(open && !saved && isDirty);

  useEffect(() => {
    if (!open) return;
    setDraft(initialDraft);
    setPersonVersion(person.version);
    setChildVersion(item?.version ?? null);
    setConflict(false);
    setDuplicateWarnings({});
    setErrors({});
    setPendingClose(false);
    setSaved(false);
  }, [initialDraft, item?.version, open, person.version]);

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

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) close();
        }}
      >
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {item ? 'Modifier' : 'Ajouter'} un {config.title}
            </DialogTitle>
            <DialogDescription>
              {item?.isPrimary
                ? "Cette information est principale. Pour la remplacer, définissez d'abord une autre information comme principale."
                : 'Les doublons sur une autre fiche sont signalés sans bloquer les cas légitimes.'}
            </DialogDescription>
          </DialogHeader>
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
              disabled={isSaving || saved}
              errors={errors}
              idPrefix="person-child-email"
              onChange={setDraft}
              showPrimarySwitch={showPrimarySwitch}
              value={draft as EmailDraft}
              warnings={duplicateWarnings}
            />
          )}
          {kind === 'phone' && (
            <PhoneFields
              disabled={isSaving || saved}
              errors={errors}
              idPrefix="person-child-phone"
              onChange={setDraft}
              showPrimarySwitch={showPrimarySwitch}
              value={draft as PhoneDraft}
              warnings={duplicateWarnings}
            />
          )}
          {kind === 'social' && (
            <SocialFields
              disabled={isSaving || saved}
              errors={errors}
              idPrefix="person-child-social"
              onChange={setDraft}
              showPrimarySwitch={showPrimarySwitch}
              value={draft as SocialDraft}
              warnings={duplicateWarnings}
            />
          )}
          <DialogFooter>
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <UnsavedNavigationDialog
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
