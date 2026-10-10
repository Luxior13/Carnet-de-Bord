'use client';

import React, {
  type FC,
  type RefObject,
  useCallback,
  useRef,
  useState,
} from 'react';

import { Button } from '$ui/button';

import {
  getProfileFieldErrors,
  type UserDetailForm,
} from './user-detail-draft';
import type { UserDetailSectionId } from './UserDetailNavigation';

type UserMutationController = {
  clear: () => void;
  feedback: {
    conflict: boolean;
    message: string;
    section: UserDetailSectionId;
  } | null;
  feedbackRef: RefObject<HTMLDivElement | null>;
  finish: () => void;
  focus: () => void;
  inFlight: RefObject<boolean>;
  isRefreshing: boolean;
  refresh: (load: () => Promise<boolean>) => Promise<void>;
  report: (
    section: UserDetailSectionId,
    message: string,
    status?: number,
    details?: Record<string, string[]>,
    form?: UserDetailForm,
  ) => void;
  serverValidation: {
    errors: ReturnType<typeof getProfileFieldErrors>;
    form: UserDetailForm;
  } | null;
  start: () => boolean;
};

export const useUserMutationFeedback = (): UserMutationController => {
  const [feedback, setFeedback] = useState<{
    conflict: boolean;
    message: string;
    section: UserDetailSectionId;
  } | null>(null);
  const [serverValidation, setServerValidation] = useState<{
    errors: ReturnType<typeof getProfileFieldErrors>;
    form: UserDetailForm;
  } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);
  const clear = useCallback((): void => {
    setFeedback(null);
    setServerValidation(null);
  }, []);
  const focus = (): void => {
    requestAnimationFrame(() => {
      const field = document.querySelector<HTMLElement>(
        '[data-user-profile-form] [aria-invalid="true"]:not(:disabled)',
      );
      (field ?? feedbackRef.current)?.focus();
    });
  };
  const report = (
    section: UserDetailSectionId,
    message: string,
    status = 0,
    details?: Record<string, string[]>,
    form?: UserDetailForm,
  ): void => {
    const fieldErrors = getProfileFieldErrors(details);
    const hasFieldError = Object.values(fieldErrors).some(Boolean);
    setFeedback({
      conflict: (status === 409 && !hasFieldError) || status === 0,
      message,
      section,
    });
    if (section === 'profile' && form)
      setServerValidation({ errors: fieldErrors, form });
    focus();
  };
  const start = (): boolean => {
    if (inFlight.current || isRefreshing || feedback?.conflict) return false;
    inFlight.current = true;
    setFeedback(null);
    setServerValidation(null);

    return true;
  };
  const refresh = async (load: () => Promise<boolean>): Promise<void> => {
    if (inFlight.current || isRefreshing) return;
    setIsRefreshing(true);
    try {
      if (await load()) {
        setFeedback(null);
        setServerValidation(null);
        requestAnimationFrame(() =>
          document
            .querySelector<HTMLElement>(
              '[data-user-profile-form] input:not(:disabled)',
            )
            ?.focus(),
        );
      } else {
        setFeedback((current) =>
          current
            ? {
                ...current,
                message:
                  'Actualisation impossible. Votre saisie est conservée. Réessayez.',
              }
            : current,
        );
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  return {
    clear,
    feedback,
    feedbackRef,
    finish: (): void => {
      inFlight.current = false;
    },
    focus,
    inFlight,
    isRefreshing,
    refresh,
    report,
    serverValidation,
    start,
  };
};

export const UserMutationFeedback: FC<{
  controller: ReturnType<typeof useUserMutationFeedback>;
  onRefresh: () => Promise<boolean>;
  section: UserDetailSectionId;
}> = ({ controller, onRefresh, section }) => {
  const { feedback, feedbackRef, isRefreshing, refresh } = controller;
  if (!feedback || feedback.section !== section) return null;

  return (
    <div
      className="border-destructive/30 bg-destructive/10 space-y-2 rounded-lg border p-3 text-sm"
      ref={feedbackRef}
      role="alert"
      tabIndex={-1}
    >
      <p>{feedback.message}</p>
      {feedback.conflict && (
        <>
          <p className="text-muted-foreground text-xs">
            Actualisez la fiche pour connaître son état actuel. Votre saisie
            sera conservée : vérifiez-la avant de l’enregistrer à nouveau.
          </p>
          <Button
            disabled={isRefreshing}
            onClick={() => void refresh(onRefresh)}
            size="sm"
            type="button"
            variant="outline"
          >
            {isRefreshing
              ? 'Actualisation…'
              : 'Actualiser et conserver ma saisie'}
          </Button>
        </>
      )}
    </div>
  );
};
