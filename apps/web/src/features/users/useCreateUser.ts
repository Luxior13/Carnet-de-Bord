'use client';

import { type RefObject, useEffect, useRef, useState } from 'react';

import { ErrorCode } from '$types/api.types';
import type { UsersListResponse, UserType } from '$types/auth.types';
import { ApiClientError, apiFetchJson, jsonRequest } from '$utils/api.utils';

import {
  createUserSchema,
  EMPTY_USER_FORM,
  getCreationFieldErrors,
  type NewUserForm,
  type NewUserFormErrors,
} from './create-user.schema';

type CreationRecovery = {
  loginName: string;
  status: 'unchecked' | 'absent' | 'found';
  user?: UserType;
};

const focusAfterRender = (ref: RefObject<HTMLElement | null>): void => {
  requestAnimationFrame(() =>
    requestAnimationFrame(() => ref.current?.focus()),
  );
};

export type CreateUserController = {
  checkCreation: () => Promise<void>;
  confirmationRef: RefObject<HTMLHeadingElement | null>;
  copyMessage: string | null;
  copyTemporaryPassword: () => Promise<void>;
  createdUser: UserType | null;
  errors: NewUserFormErrors;
  feedbackRef: RefObject<HTMLDivElement | null>;
  firstNameRef: RefObject<HTMLInputElement | null>;
  form: NewUserForm;
  formRef: RefObject<HTMLFormElement | null>;
  handleCreateUser: () => Promise<void>;
  hasUnacknowledgedPassword: boolean;
  hasUnsavedChanges: boolean;
  isChecking: boolean;
  isCreating: boolean;
  passwordAcknowledged: boolean;
  recovery: CreationRecovery | null;
  resetForm: () => void;
  setPasswordAcknowledged: (value: boolean) => void;
  setShowAdminCreationStepUp: (value: boolean) => void;
  showAdminCreationStepUp: boolean;
  submissionError: string | null;
  temporaryPassword: string | null;
  updateField: <Field extends keyof NewUserForm>(
    field: Field,
    value: NewUserForm[Field],
  ) => void;
};

export const useCreateUser = (
  canCreateUsers: boolean,
): CreateUserController => {
  const [form, setForm] = useState({ ...EMPTY_USER_FORM });
  const [errors, setErrors] = useState<NewUserFormErrors>({});
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [recovery, setRecovery] = useState<CreationRecovery | null>(null);
  const [createdUser, setCreatedUser] = useState<UserType | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(
    null,
  );
  const [passwordAcknowledged, setPasswordAcknowledged] = useState(false);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [showAdminCreationStepUp, setShowAdminCreationStepUp] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const firstNameRef = useRef<HTMLInputElement>(null);
  const confirmationRef = useRef<HTMLHeadingElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const submissionInFlight = useRef(false);
  const verificationInFlight = useRef(false);
  const mounted = useRef(true);
  const activeRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    mounted.current = true;

    return (): void => {
      mounted.current = false;
      activeRequest.current?.abort();
    };
  }, []);

  const focusErrors = (): void => {
    requestAnimationFrame(() => {
      const first = formRef.current?.querySelector<HTMLElement>(
        '[aria-invalid="true"]:not(:disabled)',
      );
      (first ?? feedbackRef.current)?.focus();
    });
  };

  const resetForm = (): void => {
    if (submissionInFlight.current || verificationInFlight.current) return;
    setForm({ ...EMPTY_USER_FORM });
    setErrors({});
    setSubmissionError(null);
    setRecovery(null);
    setCreatedUser(null);
    setTemporaryPassword(null);
    setPasswordAcknowledged(false);
    setCopyMessage(null);
    setShowAdminCreationStepUp(false);
    focusAfterRender(firstNameRef);
  };

  const updateField = <Field extends keyof NewUserForm>(
    field: Field,
    value: NewUserForm[Field],
  ): void => {
    if (submissionInFlight.current || recovery || verificationInFlight.current)
      return;
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const copyTemporaryPassword = async (): Promise<void> => {
    if (!temporaryPassword) return;
    try {
      await navigator.clipboard.writeText(temporaryPassword);
      if (mounted.current)
        setCopyMessage('Mot de passe copié. Conservez-le pour le transmettre.');
    } catch {
      if (mounted.current)
        setCopyMessage(
          'Copie impossible. Sélectionnez et copiez le mot de passe manuellement.',
        );
    }
  };

  const handleCreateUser = async (): Promise<void> => {
    if (
      submissionInFlight.current ||
      verificationInFlight.current ||
      createdUser ||
      (recovery && recovery.status !== 'absent')
    )
      return;
    if (!canCreateUsers) {
      setSubmissionError('Permission insuffisante pour créer un utilisateur');
      focusAfterRender(feedbackRef);

      return;
    }
    const validation = createUserSchema.safeParse(form);
    if (!validation.success) {
      setErrors(getCreationFieldErrors(validation.error.flatten().fieldErrors));
      setSubmissionError('Corrigez les champs signalés.');
      focusErrors();

      return;
    }

    submissionInFlight.current = true;
    setIsCreating(true);
    setErrors({});
    setSubmissionError(null);
    const controller = new AbortController();
    activeRequest.current = controller;
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      const data = await apiFetchJson<{
        temporaryPassword: string;
        user: UserType;
      }>(
        '/api/users',
        jsonRequest('POST', validation.data, { signal: controller.signal }),
      );
      if (!mounted.current) return;
      if (
        !data.user?.id ||
        typeof data.temporaryPassword !== 'string' ||
        !data.temporaryPassword
      )
        throw new Error('Incomplete creation response');
      setCreatedUser(data.user);
      setTemporaryPassword(data.temporaryPassword);
      setRecovery(null);
      setPasswordAcknowledged(false);
      setCopyMessage(null);
      focusAfterRender(confirmationRef);
    } catch (error) {
      if (!mounted.current) return;
      if (
        error instanceof ApiClientError &&
        error.code === ErrorCode.REAUTHENTICATION_REQUIRED &&
        validation.data.role === 'ADMIN'
      ) {
        setShowAdminCreationStepUp(true);

        return;
      }
      if (
        !(error instanceof ApiClientError) ||
        error.code === 'INVALID_RESPONSE' ||
        error.status >= 500
      ) {
        setRecovery({
          loginName: validation.data.loginName,
          status: 'unchecked',
        });
        setSubmissionError(
          'La réponse du serveur n’a pas pu être confirmée. Le compte a peut-être été créé. Vérifiez avant de réessayer.',
        );
      } else {
        const fieldErrors = getCreationFieldErrors(error.details);
        setErrors(fieldErrors);
        setSubmissionError(error.message);
        // A retry may race the initial request. Keep the verification path available.
        if (recovery) setRecovery({ ...recovery, status: 'unchecked' });
      }
      focusErrors();
    } finally {
      clearTimeout(timeout);
      activeRequest.current = null;
      submissionInFlight.current = false;
      if (mounted.current) setIsCreating(false);
    }
  };

  const checkCreation = async (): Promise<void> => {
    if (!recovery || submissionInFlight.current || verificationInFlight.current)
      return;
    verificationInFlight.current = true;
    setIsChecking(true);
    const controller = new AbortController();
    activeRequest.current = controller;
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const data = await apiFetchJson<UsersListResponse>(
        `/api/users?${new URLSearchParams({ limit: '1', loginName: recovery.loginName })}`,
        { signal: controller.signal },
      );
      if (!mounted.current) return;
      const user = data.users.find(
        (item) => item.loginName === recovery.loginName,
      );
      setRecovery({
        loginName: recovery.loginName,
        status: user ? 'found' : 'absent',
        user,
      });
      setSubmissionError(null);
      focusAfterRender(feedbackRef);
    } catch (error) {
      if (mounted.current) {
        setSubmissionError(
          error instanceof ApiClientError &&
            (error.status === 401 || error.status === 403)
            ? 'Vos droits actuels ne permettent pas de vérifier ce compte. Demandez à un administrateur habilité de rechercher cet identifiant avant toute nouvelle création.'
            : 'Vérification impossible pour le moment. Réessayez la vérification avant de créer à nouveau ce compte.',
        );
        setRecovery({ ...recovery, status: 'unchecked' });
        focusAfterRender(feedbackRef);
      }
    } finally {
      clearTimeout(timeout);
      activeRequest.current = null;
      verificationInFlight.current = false;
      if (mounted.current) setIsChecking(false);
    }
  };

  const hasUnacknowledgedPassword =
    !!temporaryPassword && !passwordAcknowledged;
  const hasUnsavedChanges =
    !createdUser &&
    recovery?.status !== 'found' &&
    (form.contactEmail !== '' ||
      form.firstName !== '' ||
      form.lastName !== '' ||
      form.loginName !== '' ||
      form.role !== 'USER');

  return {
    checkCreation,
    confirmationRef,
    copyMessage,
    copyTemporaryPassword,
    createdUser,
    errors,
    feedbackRef,
    firstNameRef,
    form,
    formRef,
    handleCreateUser,
    hasUnacknowledgedPassword,
    hasUnsavedChanges,
    isChecking,
    isCreating,
    passwordAcknowledged,
    recovery,
    resetForm,
    setPasswordAcknowledged,
    setShowAdminCreationStepUp,
    showAdminCreationStepUp,
    submissionError,
    temporaryPassword,
    updateField,
  };
};
