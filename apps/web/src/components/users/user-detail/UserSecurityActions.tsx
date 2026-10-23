'use client';

import React, { type FC, useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

import type { UserSessionInfo, UserType } from '$types/auth.types';
import { ApiClientError } from '$utils/api.utils';
import { securityRequest } from '$utils/security-request.utils';

import { requestUserDetailMutation } from './user-detail-request';
import { focusSecuritySessionsHeading } from './user-security-focus';
import {
  UserDeleteDialog,
  UserRevokeSessionsDialog,
} from './UserDetailDialogs';
import type { UserDetailSectionId } from './UserDetailNavigation';

type ConfirmForResponse = (
  data: unknown,
  action: {
    description: string;
    execute: () => Promise<void> | void;
    title: string;
  },
) => boolean;

type UserSecurityActionsParams = {
  canRequestDelete: boolean;
  canRevokeSessions: boolean;
  /** Password confirmation, required by the server before a deletion. */
  confirmPassword: ConfirmForResponse;
  /** Recent proof, required by the server before revoking sessions. */
  confirmStepUp: ConfirmForResponse;
  isMounted: () => boolean;
  /** Mutation lifetime of the record, replaced when it changes or unmounts. */
  lifetime: { current: AbortController };
  mutation: {
    finish: () => void;
    report: (section: UserDetailSectionId, message: string) => void;
    start: () => boolean;
  };
  onDeleted: () => void;
  refreshSessions: () => void;
  refreshUser: () => void;
  sessions: {
    setError: (message: string | null) => void;
    setNotice: (message: string | null) => void;
    setSessions: (sessions: UserSessionInfo[]) => void;
  };
  user: UserType | null;
  userId: string;
};

export type UserSecurityActions = {
  clearDeletionUncertainty: () => void;
  deleteConfirmation: string;
  deleteUser: () => Promise<void>;
  deletionUnconfirmed: boolean;
  isDeleting: boolean;
  isPending: boolean;
  isRevokingSessions: boolean;
  reset: () => void;
  revokeSession: (sessionId?: string) => Promise<void>;
  revokingSessionId: string | null;
  sessionsMutationFocusRef: React.MutableRefObject<boolean>;
  sessionsStepUpFocusRef: React.MutableRefObject<boolean>;
  setDeleteConfirmation: (value: string) => void;
  setShowDeleteConfirm: (open: boolean) => void;
  setShowRevokeSessionsConfirm: (open: boolean) => void;
  showDeleteConfirm: boolean;
  showRevokeSessionsConfirm: boolean;
};

/**
 * Session revocation and account deletion of a user record: their pending
 * states, confirmations, uncertain outcomes and focus restoration.
 */
export const useUserSecurityActions = ({
  canRequestDelete,
  canRevokeSessions,
  confirmPassword,
  confirmStepUp,
  isMounted,
  lifetime,
  mutation,
  onDeleted,
  refreshSessions,
  refreshUser,
  sessions,
  user,
  userId,
}: UserSecurityActionsParams): UserSecurityActions => {
  const [showRevokeSessionsConfirm, setShowRevokeSessionsConfirm] =
    useState(false);
  const [isRevokingSessions, setIsRevokingSessions] = useState(false);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(
    null,
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletionUnconfirmed, setDeletionUnconfirmed] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const sessionsMutationFocusRef = useRef(false);
  const sessionsStepUpFocusRef = useRef(false);

  /** Forget every pending action, for a discarded or replaced record. */
  const reset = useCallback((): void => {
    setShowRevokeSessionsConfirm(false);
    setShowDeleteConfirm(false);
    setIsDeleting(false);
    setIsRevokingSessions(false);
    setRevokingSessionId(null);
  }, []);
  /** A fresh read confirms the account still exists. */
  const clearDeletionUncertainty = useCallback((): void => {
    setDeletionUnconfirmed(false);
  }, []);

  const revokeSession = async (sessionId?: string): Promise<void> => {
    if (!isMounted() || !canRevokeSessions || !mutation.start()) return;
    const requestController = lifetime.current;
    sessionsMutationFocusRef.current = !sessionId && showRevokeSessionsConfirm;
    sessions.setNotice(null);
    if (sessionId) setRevokingSessionId(sessionId);
    else setIsRevokingSessions(true);
    try {
      await securityRequest<{ revokedSessions: number }>(
        sessionId
          ? `/api/users/${userId}/sessions?id=${encodeURIComponent(sessionId)}`
          : `/api/users/${userId}/sessions`,
        requestController.signal,
        { method: 'DELETE' },
      );
      if (!isMounted() || requestController.signal.aborted) return;
      toast.success(sessionId ? 'Session révoquée' : 'Sessions révoquées');
      refreshSessions();
      if (!sessionId) refreshUser();
    } catch (failure) {
      if (!isMounted() || requestController.signal.aborted) return;
      if (
        failure instanceof ApiClientError &&
        confirmStepUp(
          { error: { code: failure.code } },
          {
            description: sessionId
              ? 'Cette session de l’utilisateur sera immédiatement fermée.'
              : 'Toutes les sessions actives de l’utilisateur seront immédiatement fermées.',
            execute: () => revokeSession(sessionId),
            title: sessionId
              ? 'Confirmer la révocation de la session'
              : 'Confirmer la révocation des sessions',
          },
        )
      ) {
        sessionsStepUpFocusRef.current = true;

        return;
      }
      if (
        failure instanceof ApiClientError &&
        [401, 403].includes(failure.status)
      ) {
        sessions.setSessions([]);
        sessions.setError(
          'Votre accès aux sessions doit être vérifié. Rechargez la liste avant de continuer.',
        );
      } else if (
        !(failure instanceof ApiClientError) ||
        failure.status >= 500 ||
        failure.code === 'INVALID_RESPONSE'
      ) {
        sessions.setNotice(
          'La réponse n’a pas pu être confirmée. Vérifiez les sessions restantes avant de recommencer.',
        );
        refreshSessions();
        refreshUser();
      } else if ([404, 409].includes(failure.status)) {
        sessions.setNotice(
          'La session ou le compte a changé. Vérifiez les informations actualisées avant de continuer.',
        );
        refreshSessions();
        refreshUser();
      } else {
        sessions.setNotice(failure.message);
      }
    } finally {
      if (requestController === lifetime.current) {
        mutation.finish();
        if (isMounted()) {
          setIsRevokingSessions(false);
          setRevokingSessionId(null);
          setShowRevokeSessionsConfirm(false);
        }
      }
    }
  };

  const deleteUser = async (): Promise<void> => {
    if (!isMounted()) return;
    if (deletionUnconfirmed) return;
    if (!user || deleteConfirmation.trim() !== user.loginName) return;
    if (!canRequestDelete) {
      toast.error(
        'Vous n’avez pas l’autorisation de supprimer cet utilisateur',
      );
      setShowDeleteConfirm(false);

      return;
    }
    if (user.isActive !== false) {
      toast.error('Désactivez d’abord ce compte avant de le supprimer');
      setShowDeleteConfirm(false);

      return;
    }

    if (!mutation.start()) return;
    const requestController = lifetime.current;
    setIsDeleting(true);
    try {
      const { data, response } = await requestUserDetailMutation<{
        user: UserType;
      }>(`/api/users/${userId}`, requestController.signal, {
        method: 'DELETE',
        signal: requestController.signal,
      });
      if (!isMounted() || requestController.signal.aborted) return;

      if (response.ok && data.success) {
        toast.success('Compte supprimé définitivement');
        onDeleted();
      } else {
        if (
          confirmPassword(data, {
            description:
              'Le compte sera supprimé irréversiblement et son identité sera anonymisée.',
            execute: deleteUser,
            title: 'Confirmer la suppression définitive',
          })
        ) {
          return;
        }
        toast.error(data.error?.message || 'Impossible de supprimer ce compte');
      }
    } catch {
      if (!isMounted() || requestController.signal.aborted) return;
      setDeletionUnconfirmed(true);
      mutation.report(
        'security',
        'La suppression n’a pas pu être confirmée. Le compte a peut-être été supprimé. Actualisez la fiche avant toute nouvelle tentative.',
      );
    } finally {
      if (requestController === lifetime.current) {
        mutation.finish();
        if (isMounted()) {
          setIsDeleting(false);
          setShowDeleteConfirm(false);
        }
      }
    }
  };

  return {
    clearDeletionUncertainty,
    deleteConfirmation,
    deleteUser,
    deletionUnconfirmed,
    isDeleting,
    isPending: isDeleting || isRevokingSessions || revokingSessionId !== null,
    isRevokingSessions,
    reset,
    revokeSession,
    revokingSessionId,
    sessionsMutationFocusRef,
    sessionsStepUpFocusRef,
    setDeleteConfirmation,
    setShowDeleteConfirm,
    setShowRevokeSessionsConfirm,
    showDeleteConfirm,
    showRevokeSessionsConfirm,
  };
};

/** Confirmations of the security actions, with their focus restoration. */
export const UserSecurityActionDialogs: FC<{
  actions: UserSecurityActions;
  user: Pick<UserType, 'firstName' | 'lastName' | 'loginName'>;
}> = ({ actions, user }) => (
  <>
    <UserRevokeSessionsDialog
      open={actions.showRevokeSessionsConfirm}
      onOpenChange={(open) => {
        if (!actions.isRevokingSessions)
          actions.setShowRevokeSessionsConfirm(open);
      }}
      isRevoking={actions.isRevokingSessions}
      onConfirm={() => {
        void actions.revokeSession();
      }}
      onCloseAutoFocus={(event) => {
        if (!actions.sessionsMutationFocusRef.current) return;
        actions.sessionsMutationFocusRef.current = false;
        event.preventDefault();
        if (document.querySelector('[role="dialog"][data-state="open"]'))
          return;
        focusSecuritySessionsHeading();
      }}
    />
    <UserDeleteDialog
      open={actions.showDeleteConfirm}
      onOpenChange={(open) => {
        if (actions.isDeleting && !open) return;
        actions.setShowDeleteConfirm(open);
        if (!open) actions.setDeleteConfirmation('');
      }}
      confirmation={actions.deleteConfirmation}
      onConfirmationChange={actions.setDeleteConfirmation}
      firstName={user.firstName}
      lastName={user.lastName}
      loginName={user.loginName}
      isDeleting={actions.isDeleting}
      onConfirm={() => {
        void actions.deleteUser();
      }}
    />
  </>
);
