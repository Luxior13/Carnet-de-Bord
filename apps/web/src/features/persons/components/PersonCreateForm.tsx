'use client';

import {
  AtSign,
  Loader2,
  Mail,
  Network,
  Phone,
  Plus,
  Save,
  Trash2,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { type FC, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { SectionPanel } from '$components/layout/SectionPanel';
import { UnsavedNavigationDialog } from '$components/layout/UnsavedNavigationDialog';
import { useUnsavedNavigationGuard } from '$hooks/useUnsavedNavigationGuard';
import { Badge } from '$ui/badge';
import { Button } from '$ui/button';
import { Card, CardFooter } from '$ui/card';
import { ApiClientError } from '$utils/api.utils';

import { createPerson } from '../person.api';
import { PERSON_LIMITS } from '../person.constants';
import { zodErrorMap } from '../person.ui';
import { createPersonSchema } from '../schemas/person.schemas';
import {
  type EmailDraft,
  EmailFields,
  type PhoneDraft,
  PhoneFields,
  type SocialDraft,
  SocialFields,
} from './PersonCollectionFields';
import {
  PersonIdentityFields,
  type PersonIdentityFormValue,
} from './PersonIdentityFields';

type ClientRow<T> = T & { clientId: string };

type CreateFormState = PersonIdentityFormValue & {
  emails: Array<ClientRow<EmailDraft>>;
  phones: Array<ClientRow<PhoneDraft>>;
  socialProfiles: Array<ClientRow<SocialDraft>>;
};

const INITIAL_FORM: CreateFormState = {
  birthDate: '',
  emails: [],
  firstName: '',
  lastName: '',
  nickname: '',
  phones: [],
  socialProfiles: [],
  structureStatus: 'OUTSIDE_STRUCTURE',
};

const newEmail = (isPrimary: boolean): ClientRow<EmailDraft> => ({
  clientId: crypto.randomUUID(),
  email: '',
  isPrimary,
  label: 'Personnel',
});

const newPhone = (isPrimary: boolean): ClientRow<PhoneDraft> => ({
  clientId: crypto.randomUUID(),
  countryCode: 'FR',
  isPrimary,
  label: 'Personnel',
  phone: '',
});

const newSocial = (): ClientRow<SocialDraft> => ({
  clientId: crypto.randomUUID(),
  identifier: '',
  isPrimary: true,
  label: 'Personnel',
  networkKey: 'discord',
  profileUrl: '',
});

const normalizeSinglePrimary = <T extends { isPrimary: boolean }>(
  rows: T[],
): T[] => {
  if (rows.length === 0) return rows;
  const selectedIndex = rows.findIndex((row) => row.isPrimary);
  const primaryIndex = selectedIndex >= 0 ? selectedIndex : 0;

  return rows.map((row, index) => ({
    ...row,
    isPrimary: index === primaryIndex,
  }));
};

const normalizeSocialPrimaries = (
  rows: Array<ClientRow<SocialDraft>>,
): Array<ClientRow<SocialDraft>> => {
  const primaryByNetwork = new Map<string, string>();
  for (const row of rows) {
    if (row.isPrimary && !primaryByNetwork.has(row.networkKey)) {
      primaryByNetwork.set(row.networkKey, row.clientId);
    }
  }
  for (const row of rows) {
    if (!primaryByNetwork.has(row.networkKey)) {
      primaryByNetwork.set(row.networkKey, row.clientId);
    }
  }

  return rows.map((row) => ({
    ...row,
    isPrimary: primaryByNetwork.get(row.networkKey) === row.clientId,
  }));
};

const withoutClientId = <T extends object>({
  clientId,
  ...value
}: ClientRow<T>): T => {
  void clientId;

  return value as T;
};

const focusFirstError = (): void => {
  requestAnimationFrame(() => {
    document
      .querySelector<HTMLElement>('[aria-invalid="true"]')
      ?.focus({ preventScroll: false });
  });
};

const RowShell: FC<{
  children: React.ReactNode;
  isPrimary: boolean;
  onRemove: () => void;
  primaryLabel: string;
  primaryName: string;
  setPrimary: () => void;
  title: string;
}> = ({
  children,
  isPrimary,
  onRemove,
  primaryLabel,
  primaryName,
  setPrimary,
  title,
}) => (
  <div className="border-border-default bg-surface rounded-xl border">
    <div className="border-border-divider bg-surface-inset flex flex-wrap items-center justify-between gap-3 border-b px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <p className="truncate text-sm font-medium">{title}</p>
        {isPrimary && <Badge variant="success">Principal</Badge>}
      </div>
      <div className="flex items-center gap-2">
        <label className="text-muted-foreground flex cursor-pointer items-center gap-2 text-xs">
          <input
            checked={isPrimary}
            className="accent-primary size-4"
            name={primaryName}
            onChange={setPrimary}
            type="radio"
          />
          {primaryLabel}
        </label>
        <Button
          aria-label={`Retirer ${title.toLowerCase()}`}
          onClick={onRemove}
          size="icon"
          type="button"
          variant="ghost"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
    <div className="p-3">{children}</div>
  </div>
);

export const PersonCreateForm: FC = () => {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<CreateFormState>(INITIAL_FORM);
  const [isDirty, setIsDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    cancelPendingNavigation,
    confirmPendingNavigation,
    pendingNavigationHref,
  } = useUnsavedNavigationGuard(isDirty);

  const identity = useMemo<PersonIdentityFormValue>(
    () => ({
      birthDate: form.birthDate,
      firstName: form.firstName,
      lastName: form.lastName,
      nickname: form.nickname,
      structureStatus: form.structureStatus,
    }),
    [form],
  );

  const mutate = (next: CreateFormState): void => {
    setForm(next);
    setIsDirty(true);
  };

  const buildPayload = (): Record<string, unknown> => ({
    birthDate: form.birthDate || null,
    emails: normalizeSinglePrimary(form.emails).map(withoutClientId),
    firstName: form.firstName || null,
    lastName: form.lastName || null,
    nickname: form.nickname || null,
    phones: normalizeSinglePrimary(form.phones).map(withoutClientId),
    socialProfiles: normalizeSocialPrimaries(form.socialProfiles).map(
      (item) => {
        const row = withoutClientId(item);

        return {
          ...row,
          identifier: row.identifier || null,
          profileUrl: row.profileUrl || null,
        };
      },
    ),
    structureStatus: form.structureStatus,
  });

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (isSubmitting) return;
    const payload = buildPayload();
    const validation = createPersonSchema.safeParse(payload);
    if (!validation.success) {
      setErrors(zodErrorMap(validation.error));
      toast.error('Corrigez les champs signalés');
      focusFirstError();

      return;
    }

    setErrors({});
    setIsSubmitting(true);
    try {
      const result = await createPerson(payload);
      if (result.duplicateWarning?.duplicateFound) {
        sessionStorage.setItem(
          `person-duplicate-warning:${result.person.id}`,
          JSON.stringify(result.duplicateWarning),
        );
      }
      setIsDirty(false);
      toast.success('Fiche créée');
      router.push(`/vie-interne/repertoire/${result.person.id}`);
    } catch (caught) {
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
          : 'Impossible de créer la fiche',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <form
        className="space-y-5"
        noValidate
        onSubmit={(event) => void handleSubmit(event)}
      >
        <SectionPanel
          description="Un pseudo suffit ; sinon, renseignez ensemble le prénom et le nom."
          icon={<UserRound className="size-4" />}
          title="Identité et statut"
        >
          <PersonIdentityFields
            disabled={isSubmitting}
            errors={errors}
            idPrefix="create-person"
            onChange={(key, value) => mutate({ ...form, [key]: value })}
            value={identity}
          />
        </SectionPanel>

        <SectionPanel
          actions={
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={
                  form.emails.length >= PERSON_LIMITS.emails || isSubmitting
                }
                onClick={() =>
                  mutate({
                    ...form,
                    emails: [
                      ...form.emails,
                      newEmail(form.emails.length === 0),
                    ],
                  })
                }
                size="sm"
                type="button"
                variant="outline"
              >
                <Mail className="size-4" />
                Email
              </Button>
              <Button
                disabled={
                  form.phones.length >= PERSON_LIMITS.phones || isSubmitting
                }
                onClick={() =>
                  mutate({
                    ...form,
                    phones: [
                      ...form.phones,
                      newPhone(form.phones.length === 0),
                    ],
                  })
                }
                size="sm"
                type="button"
                variant="outline"
              >
                <Phone className="size-4" />
                Téléphone
              </Button>
            </div>
          }
          description="Ajoutez uniquement les coordonnées utiles. La première devient principale."
          icon={<AtSign className="size-4" />}
          title="Coordonnées"
        >
          {form.emails.length === 0 && form.phones.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">
              Aucune coordonnée ajoutée.
            </p>
          ) : (
            <div className="space-y-3">
              {form.emails.map((row, index) => (
                <RowShell
                  isPrimary={row.isPrimary}
                  key={row.clientId}
                  onRemove={() =>
                    mutate({
                      ...form,
                      emails: normalizeSinglePrimary(
                        form.emails.filter(
                          (item) => item.clientId !== row.clientId,
                        ),
                      ),
                    })
                  }
                  primaryLabel="Définir comme principal"
                  primaryName="create-email-primary"
                  setPrimary={() =>
                    mutate({
                      ...form,
                      emails: form.emails.map((item) => ({
                        ...item,
                        isPrimary: item.clientId === row.clientId,
                      })),
                    })
                  }
                  title={`Email ${index + 1}`}
                >
                  <EmailFields
                    disabled={isSubmitting}
                    errors={errors}
                    idPrefix={`create-email-${row.clientId}`}
                    keyPrefix={`emails.${index}.`}
                    onChange={(value) =>
                      mutate({
                        ...form,
                        emails: form.emails.map((item) =>
                          item.clientId === row.clientId
                            ? { ...item, ...value }
                            : item,
                        ),
                      })
                    }
                    showPrimarySwitch={false}
                    value={row}
                  />
                </RowShell>
              ))}
              {form.phones.map((row, index) => (
                <RowShell
                  isPrimary={row.isPrimary}
                  key={row.clientId}
                  onRemove={() =>
                    mutate({
                      ...form,
                      phones: normalizeSinglePrimary(
                        form.phones.filter(
                          (item) => item.clientId !== row.clientId,
                        ),
                      ),
                    })
                  }
                  primaryLabel="Définir comme principal"
                  primaryName="create-phone-primary"
                  setPrimary={() =>
                    mutate({
                      ...form,
                      phones: form.phones.map((item) => ({
                        ...item,
                        isPrimary: item.clientId === row.clientId,
                      })),
                    })
                  }
                  title={`Téléphone ${index + 1}`}
                >
                  <PhoneFields
                    disabled={isSubmitting}
                    errors={errors}
                    idPrefix={`create-phone-${row.clientId}`}
                    keyPrefix={`phones.${index}.`}
                    onChange={(value) =>
                      mutate({
                        ...form,
                        phones: form.phones.map((item) =>
                          item.clientId === row.clientId
                            ? { ...item, ...value }
                            : item,
                        ),
                      })
                    }
                    showPrimarySwitch={false}
                    value={row}
                  />
                </RowShell>
              ))}
            </div>
          )}
        </SectionPanel>

        <SectionPanel
          actions={
            <Button
              disabled={
                form.socialProfiles.length >= PERSON_LIMITS.socialProfiles ||
                isSubmitting
              }
              onClick={() =>
                mutate({
                  ...form,
                  socialProfiles: normalizeSocialPrimaries([
                    ...form.socialProfiles,
                    newSocial(),
                  ]),
                })
              }
              size="sm"
              type="button"
              variant="outline"
            >
              <Plus className="size-4" />
              Ajouter
            </Button>
          }
          description="Discord, Instagram, X, TikTok, Twitch, YouTube, Facebook et LinkedIn."
          icon={<Network className="size-4" />}
          title="Réseaux sociaux"
        >
          {form.socialProfiles.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">
              Aucun profil social ajouté.
            </p>
          ) : (
            <div className="space-y-3">
              {form.socialProfiles.map((row, index) => (
                <RowShell
                  isPrimary={row.isPrimary}
                  key={row.clientId}
                  onRemove={() =>
                    mutate({
                      ...form,
                      socialProfiles: normalizeSocialPrimaries(
                        form.socialProfiles.filter(
                          (item) => item.clientId !== row.clientId,
                        ),
                      ),
                    })
                  }
                  primaryLabel="Principal pour ce réseau"
                  primaryName={`create-social-primary-${row.networkKey}`}
                  setPrimary={() =>
                    mutate({
                      ...form,
                      socialProfiles: form.socialProfiles.map((item) =>
                        item.networkKey === row.networkKey
                          ? {
                              ...item,
                              isPrimary: item.clientId === row.clientId,
                            }
                          : item,
                      ),
                    })
                  }
                  title={`Profil ${index + 1}`}
                >
                  <SocialFields
                    disabled={isSubmitting}
                    errors={errors}
                    idPrefix={`create-social-${row.clientId}`}
                    keyPrefix={`socialProfiles.${index}.`}
                    onChange={(value) =>
                      mutate({
                        ...form,
                        socialProfiles: normalizeSocialPrimaries(
                          form.socialProfiles.map((item) =>
                            item.clientId === row.clientId
                              ? { ...item, ...value }
                              : item,
                          ),
                        ),
                      })
                    }
                    showPrimarySwitch={false}
                    value={row}
                  />
                </RowShell>
              ))}
            </div>
          )}
        </SectionPanel>

        <Card>
          <CardFooter className="flex flex-col-reverse justify-end gap-2 border-0 sm:flex-row">
            <Button asChild variant="outline">
              <Link href="/vie-interne/repertoire">Annuler</Link>
            </Button>
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {isSubmitting ? 'Ajout…' : 'Ajouter la fiche'}
            </Button>
          </CardFooter>
        </Card>
      </form>
      <UnsavedNavigationDialog
        contentClassName="sm:max-w-md"
        description="Les informations saisies pour cette nouvelle fiche seront perdues."
        onCancel={cancelPendingNavigation}
        onConfirm={confirmPendingNavigation}
        open={pendingNavigationHref !== null}
      />
    </>
  );
};
