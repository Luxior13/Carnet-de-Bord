'use client';

import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { type FC, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { SectionActionBar } from '$components/layout/SectionActionBar';
import { UnsavedNavigationDialog } from '$components/layout/UnsavedNavigationDialog';
import { personDetailPath } from '$constants/routes.constants';
import { useUnsavedNavigationGuard } from '$hooks/useUnsavedNavigationGuard';
import { Alert, AlertDescription, AlertTitle } from '$ui/alert';
import { Button } from '$ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '$ui/card';
import { Checkbox } from '$ui/checkbox';
import { Label } from '$ui/label';
import { ApiClientError } from '$utils/api.utils';

import { createPerson } from '../person.api';
import { PERSON_DIRECTORY_PATH, zodErrorMap } from '../person.ui';
import { createPersonSchema } from '../schemas/person.schemas';
import {
  PersonIdentityFields,
  type PersonIdentityFormValue,
} from './PersonIdentityFields';

type PersonCreateFormProps = {
  available?: boolean;
  onRetryAvailability?: () => Promise<void>;
  returnHref: string;
};

const INITIAL_FORM: PersonIdentityFormValue = {
  birthDate: '',
  firstName: '',
  lastName: '',
  nickname: '',
  structureStatus: 'OUTSIDE_STRUCTURE',
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- Preserve the schema's discriminated result.
const validateIdentity = (form: PersonIdentityFormValue) =>
  createPersonSchema.safeParse({
    birthDate: null,
    emails: [],
    firstName: form.firstName || null,
    lastName: form.lastName || null,
    nickname: form.nickname || null,
    phones: [],
    socialProfiles: [],
    structureStatus: form.structureStatus,
  });

export const PersonCreateForm: FC<PersonCreateFormProps> = ({
  available = true,
  onRetryAvailability,
  returnHref,
}) => {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<PersonIdentityFormValue>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [retryConfirmed, setRetryConfirmed] = useState(false);
  const [createdHref, setCreatedHref] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const submittedRef = useRef(false);
  const mountedRef = useRef(false);
  const leavingRef = useRef(false);
  const requestRef = useRef<AbortController | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const confirmationRef = useRef<HTMLHeadingElement>(null);
  const isDirty =
    Boolean(
      form.nickname.trim() || form.firstName.trim() || form.lastName.trim(),
    ) || form.structureStatus !== INITIAL_FORM.structureStatus;

  useEffect(() => {
    mountedRef.current = true;

    return (): void => {
      mountedRef.current = false;
      requestRef.current?.abort();
    };
  }, []);

  const {
    cancelPendingNavigation,
    confirmPendingNavigation,
    pendingNavigationHref,
    restoreFocus,
  } = useUnsavedNavigationGuard(isDirty && !createdHref, () => {
    // Stop observing this request; leaving cannot undo a server-side commit.
    leavingRef.current = true;
    requestRef.current?.abort();
  });

  const focusFeedback = (): void => {
    requestAnimationFrame(() => {
      if (!mountedRef.current || leavingRef.current) return;
      const first = formRef.current?.querySelector<HTMLElement>(
        '[aria-invalid="true"]:not(:disabled)',
      );
      (first ?? feedbackRef.current)?.focus();
    });
  };

  const handleChange = <TKey extends keyof PersonIdentityFormValue>(
    key: TKey,
    value: PersonIdentityFormValue[TKey],
  ): void => {
    if (submittedRef.current || uncertain || leavingRef.current) return;
    const next = { ...form, [key]: value };
    setForm(next);
    setSubmitError(null);
    if (Object.keys(errors).length) {
      const validation = validateIdentity(next);
      setErrors(validation.success ? {} : zodErrorMap(validation.error));
    }
  };

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (
      submittedRef.current ||
      !mountedRef.current ||
      leavingRef.current ||
      !available ||
      (uncertain && !retryConfirmed)
    )
      return;

    const validation = validateIdentity(form);
    if (!validation.success) {
      setErrors(zodErrorMap(validation.error));
      setSubmitError('Corrigez les champs signalés.');
      focusFeedback();

      return;
    }

    setErrors({});
    setSubmitError(null);
    setRetryConfirmed(false);
    submittedRef.current = true;
    setIsSubmitting(true);
    const controller = new AbortController();
    requestRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 30_000);
    const canApply = (): boolean =>
      mountedRef.current &&
      !leavingRef.current &&
      requestRef.current === controller;
    let destination: string | null = null;
    try {
      const result = await createPerson(validation.data, controller.signal);
      if (!canApply()) return;
      if (!result.person?.id || typeof result.person.id !== 'string') {
        throw new Error('Incomplete creation response');
      }
      const params = new URLSearchParams({
        returnTo: returnHref,
        section: 'identite',
      });
      destination = personDetailPath(result.person.id) + '?' + params;
      setCreatedHref(destination);
      setUncertain(false);
      toast.success('Fiche créée');
    } catch (caught) {
      if (!canApply()) return;
      submittedRef.current = false;
      if (
        !(caught instanceof ApiClientError) ||
        caught.code === 'INVALID_RESPONSE' ||
        caught.status >= 500
      ) {
        setUncertain(true);
        setSubmitError(
          'Le résultat de la création n’a pas pu être confirmé. La fiche a peut-être été créée. Vérifiez le répertoire avant toute nouvelle tentative.',
        );
      } else {
        // A refused retry says nothing about the first request's outcome.
        if (caught.details) {
          setErrors(
            Object.fromEntries(
              Object.entries(caught.details).map(([key, messages]) => [
                key,
                messages[0] ?? 'Valeur invalide',
              ]),
            ),
          );
        }
        setSubmitError(
          uncertain
            ? `Cette nouvelle tentative a été refusée : ${caught.message} Le résultat de la première demande reste à vérifier.`
            : caught.message,
        );
      }
      focusFeedback();
    } finally {
      clearTimeout(timeout);
      if (canApply()) {
        requestRef.current = null;
        setIsSubmitting(false);
      }
    }

    if (destination && mountedRef.current && !leavingRef.current) {
      // A failed transition must never turn a confirmed creation into a retry.
      requestAnimationFrame(() => confirmationRef.current?.focus());
      try {
        router.replace(destination);
      } catch {
        // The persistent confirmation keeps a normal link to the created fiche.
      }
    }
  };

  const checkAvailability = async (): Promise<void> => {
    if (!onRetryAvailability || isChecking) return;
    setIsChecking(true);
    try {
      await onRetryAvailability();
    } catch {
      // The unavailable state remains visible and the draft stays in place.
    } finally {
      if (mountedRef.current) setIsChecking(false);
    }
  };

  if (createdHref) {
    return (
      <Card>
        <CardHeader>
          <CardTitle ref={confirmationRef} tabIndex={-1}>
            Fiche créée
          </CardTitle>
          <CardDescription>
            Vous pouvez maintenant compléter cette fiche.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href={createdHref}>Ouvrir la fiche</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={returnHref}>Retour au répertoire</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const verificationQuery = (
    form.nickname.trim() ||
    (form.firstName.trim() + ' ' + form.lastName.trim()).trim()
  ).slice(0, 100);
  const verificationHref =
    PERSON_DIRECTORY_PATH + '?' + new URLSearchParams({ q: verificationQuery });

  return (
    <>
      <form
        autoComplete="off"
        aria-busy={isSubmitting || undefined}
        className="space-y-4"
        noValidate
        onSubmit={(event) => void handleSubmit(event)}
        ref={formRef}
      >
        {!available && (
          <Alert>
            <AlertTitle>Répertoire temporairement indisponible</AlertTitle>
            <AlertDescription>
              <p>
                Votre saisie est conservée. La création sera possible lorsque le
                service sera rétabli.
              </p>
              {onRetryAvailability && (
                <Button
                  disabled={isChecking}
                  loading={isChecking}
                  onClick={() => void checkAvailability()}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Revérifier
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}
        {submitError && (
          <Alert
            ref={feedbackRef}
            tabIndex={-1}
            variant={uncertain ? 'default' : 'destructive'}
          >
            <AlertTitle>
              {uncertain ? 'Création à vérifier' : 'Création non effectuée'}
            </AlertTitle>
            <AlertDescription>
              <p>{submitError}</p>
              {uncertain && (
                <div className="mt-2 space-y-3">
                  <Button
                    asChild
                    className="h-auto min-h-10 max-w-full whitespace-normal"
                    size="sm"
                    variant="outline"
                  >
                    <a
                      href={verificationHref}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <ExternalLink aria-hidden="true" className="size-4" />
                      Vérifier le répertoire (nouvel onglet)
                    </a>
                  </Button>
                  <p>
                    La recherche aide à retrouver la fiche ; un même nom ou
                    pseudo peut appartenir à plusieurs personnes.
                  </p>
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={retryConfirmed}
                      disabled={isSubmitting}
                      id="person-create-retry"
                      onCheckedChange={(checked) =>
                        setRetryConfirmed(checked === true)
                      }
                    />
                    <Label
                      className="min-h-6 leading-5"
                      htmlFor="person-create-retry"
                    >
                      J’ai vérifié le répertoire et souhaite relancer la
                      création.
                    </Label>
                  </div>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
        {/* The hero explains the flow and the field states the rule once. */}
        <Card>
          <CardContent className="p-4 sm:p-5">
            <PersonIdentityFields
              disabled={isSubmitting || uncertain}
              errors={errors}
              idPrefix="create-person"
              onChange={handleChange}
              showBirthDate={false}
              value={form}
            />
          </CardContent>
        </Card>
        <SectionActionBar
          cancelHref={returnHref}
          isSaving={isSubmitting}
          label="Création de la fiche"
          saveDisabled={!available || (uncertain && !retryConfirmed)}
          saveLabel={
            uncertain ? 'Relancer la création' : 'Créer et ouvrir la fiche'
          }
          saveType="submit"
          savingLabel="Création…"
          status={
            uncertain
              ? 'Vérifiez le résultat avant de relancer la création.'
              : null
          }
        />
      </form>
      <UnsavedNavigationDialog
        confirmLabel={isSubmitting || uncertain ? 'Quitter la page' : undefined}
        contentClassName="sm:max-w-md"
        description={
          isSubmitting || uncertain
            ? 'Une création a été demandée. Quitter cette page ne l’annule pas. Vérifiez le répertoire avant de créer à nouveau cette fiche.'
            : 'Les informations saisies pour cette nouvelle fiche seront perdues.'
        }
        onCancel={cancelPendingNavigation}
        onCloseAutoFocus={restoreFocus}
        onConfirm={confirmPendingNavigation}
        open={pendingNavigationHref !== null}
        title={isSubmitting || uncertain ? 'Quitter la page ?' : undefined}
      />
    </>
  );
};
