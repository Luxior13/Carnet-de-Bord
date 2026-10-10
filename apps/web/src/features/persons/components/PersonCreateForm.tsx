'use client';

import { ArrowRight, Loader2, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { type FC, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { UnsavedNavigationDialog } from '$components/layout/UnsavedNavigationDialog';
import { personDetailPath } from '$constants/routes.constants';
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
  const isDirty = Object.entries(form).some(
    ([key, value]) =>
      value !==
      Object.entries(INITIAL_FORM).find(
        ([initialKey]) => initialKey === key,
      )?.[1],
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submittedRef = useRef(false);
  const mountedRef = useRef(false);
  const [created, setCreated] = useState(false);
  useEffect(() => {
    mountedRef.current = true;

    return (): void => {
      mountedRef.current = false;
    };
  }, []);
  const {
    cancelPendingNavigation,
    confirmPendingNavigation,
    pendingNavigationHref,
    restoreFocus,
  } = useUnsavedNavigationGuard(isDirty && !created);

  const handleChange = <TKey extends keyof PersonIdentityFormValue>(
    key: TKey,
    value: PersonIdentityFormValue[TKey],
  ): void => {
    setForm((current) => ({ ...current, [key]: value }));
    setSubmitError(null);
  };

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (submittedRef.current || !mountedRef.current) return;
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
    setSubmitError(null);
    submittedRef.current = true;
    setIsSubmitting(true);
    try {
      const result = await createPerson(validation.data);
      if (!mountedRef.current) return;
      if (result.duplicateWarning?.duplicateFound) {
        try {
          sessionStorage.setItem(
            `person-duplicate-warning:${result.person.id}`,
            JSON.stringify(result.duplicateWarning),
          );
        } catch {
          // Storage is optional; the person has already been created.
          toast.warning(
            'Fiche créée ; un doublon possible a été détecté. Vérifiez le répertoire.',
          );
        }
      }
      setCreated(true);
      toast.success('Fiche créée');
      const params = new URLSearchParams({
        returnTo: returnHref,
        section: 'identite',
      });
      router.push(`${personDetailPath(result.person.id)}?${params}`);
    } catch (caught) {
      if (!mountedRef.current) return;
      submittedRef.current = false;
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
      setSubmitError(
        caught instanceof Error
          ? caught.message
          : 'Impossible de créer la fiche',
      );
    } finally {
      if (mountedRef.current) setIsSubmitting(false);
    }
  };

  return (
    <>
      <form
        aria-busy={isSubmitting || undefined}
        noValidate
        onSubmit={(event) => void handleSubmit(event)}
      >
        <Card>
          <CardHeader className="p-3.5 sm:p-4">
            <div className="flex items-start gap-3">
              <ServiceIcon className="border-primary/30 bg-primary/10 text-primary-emphasis size-8">
                <UserPlus className="size-4" />
              </ServiceIcon>
              <div className="min-w-0">
                <CardTitle>Informations essentielles</CardTitle>
                <CardDescription className="mt-1 text-xs leading-5">
                  Un pseudo suffit. Sans pseudo, le prénom et le nom sont
                  nécessaires.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5">
            {submitError && (
              <p className="text-destructive mb-4 text-sm" role="alert">
                {submitError}
              </p>
            )}
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
            <Button disabled={isSubmitting || created} type="submit">
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
        onCloseAutoFocus={restoreFocus}
        onConfirm={confirmPendingNavigation}
        open={pendingNavigationHref !== null}
      />
    </>
  );
};
