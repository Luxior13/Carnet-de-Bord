'use client';

import { ArrowRight, Loader2, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { type FC, useState } from 'react';
import { toast } from 'sonner';

import { UnsavedNavigationDialog } from '$components/layout/UnsavedNavigationDialog';
import { useUnsavedNavigationGuard } from '$hooks/useUnsavedNavigationGuard';
import { Button } from '$ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '$ui/card';
import { ServiceIcon } from '$ui/service-icon';
import { ApiClientError } from '$utils/api.utils';

import { createPerson } from '../person.api';
import { zodErrorMap } from '../person.ui';
import { createPersonSchema } from '../schemas/person.schemas';
import {
  PersonIdentityFields,
  type PersonIdentityFormValue,
} from './PersonIdentityFields';

type PersonCreateFormProps = {
  returnHref: string;
};

const INITIAL_FORM: PersonIdentityFormValue = {
  birthDate: '',
  firstName: '',
  lastName: '',
  nickname: '',
  structureStatus: 'OUTSIDE_STRUCTURE',
};

const focusFirstError = (): void => {
  requestAnimationFrame(() => {
    document
      .querySelector<HTMLElement>('[aria-invalid="true"]')
      ?.focus({ preventScroll: false });
  });
};

export const PersonCreateForm: FC<PersonCreateFormProps> = ({ returnHref }) => {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<PersonIdentityFormValue>(INITIAL_FORM);
  const [isDirty, setIsDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    cancelPendingNavigation,
    confirmPendingNavigation,
    pendingNavigationHref,
  } = useUnsavedNavigationGuard(isDirty);

  const handleChange = <TKey extends keyof PersonIdentityFormValue>(
    key: TKey,
    value: PersonIdentityFormValue[TKey],
  ): void => {
    setForm((current) => ({ ...current, [key]: value }));
    setIsDirty(true);
  };

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (isSubmitting) return;
    const validation = createPersonSchema.safeParse({
      birthDate: null,
      emails: [],
      firstName: form.firstName || null,
      lastName: form.lastName || null,
      nickname: form.nickname || null,
      phones: [],
      socialProfiles: [],
      structureStatus: form.structureStatus,
    });
    if (!validation.success) {
      setErrors(zodErrorMap(validation.error));
      toast.error('Corrigez les champs signalés');
      focusFirstError();

      return;
    }

    setErrors({});
    setIsSubmitting(true);
    try {
      const result = await createPerson(validation.data);
      if (result.duplicateWarning?.duplicateFound) {
        sessionStorage.setItem(
          `person-duplicate-warning:${result.person.id}`,
          JSON.stringify(result.duplicateWarning),
        );
      }
      setIsDirty(false);
      toast.success('Fiche créée');
      const params = new URLSearchParams({
        returnTo: returnHref,
        section: 'identite',
      });
      router.push(
        `/vie-interne/repertoire/${encodeURIComponent(result.person.id)}?${params}`,
      );
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
      <form noValidate onSubmit={(event) => void handleSubmit(event)}>
        <Card>
          <CardHeader className="p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <ServiceIcon className="size-9 rounded-lg">
                <UserPlus className="size-4" />
              </ServiceIcon>
              <div className="min-w-0">
                <CardTitle className="text-base">
                  Informations essentielles
                </CardTitle>
                <CardDescription className="mt-1">
                  Un pseudo suffit. Sans pseudo, le prénom et le nom sont
                  nécessaires.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="border-border-divider border-t p-4 sm:p-5">
            <PersonIdentityFields
              disabled={isSubmitting}
              errors={errors}
              idPrefix="create-person"
              onChange={handleChange}
              showBirthDate={false}
              value={form}
            />
          </CardContent>
          <CardFooter className="border-border-divider flex flex-col-reverse justify-end gap-2 border-t p-4 sm:flex-row">
            <Button asChild variant="outline">
              <Link href={returnHref}>Annuler</Link>
            </Button>
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ArrowRight className="size-4" />
              )}
              {isSubmitting ? 'Création…' : 'Créer et ouvrir la fiche'}
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
