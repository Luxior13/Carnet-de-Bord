'use client';

import { AlertTriangle, Loader2, LogOut, Monitor } from 'lucide-react';
import React, {
  type FC,
  type Ref,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '$ui/alert-dialog';
import { Button } from '$ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '$ui/card';
import { Skeleton } from '$ui/skeleton';
import { ApiClientError } from '$utils/api.utils';
import { securityRequest } from '$utils/security-request.utils';

import {
  getSessionTitle,
  type SessionInfo,
  SessionRow,
} from './AccountSessionRow';
import { focusSecurityHeading, SecurityCardTitle } from './SecurityCardTitle';

/** Lets the security section reload the list after a credential change. */
export type AccountSessionsHandle = { reload: () => Promise<void> };

type AccountSessionsCardProps = {
  /** A new MFA state replaces the sessions; the list is read again. */
  mfaEnabledAt: Date | string | null;
  ref?: Ref<AccountSessionsHandle>;
};

/** Sessions of the signed-in account: list, single and global revocation. */
export const AccountSessionsCard: FC<AccountSessionsCardProps> = ({
  mfaEnabledAt,
  ref,
}) => {
  const lifetimeRef = useRef<AbortController | null>(null);
  const revokingRef = useRef(false);
  const sessionsRequestRef = useRef(0);
  const sessionsFocusRef = useRef(false);
  const sessionMutationRef = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    lifetimeRef.current = controller;
    // A later user action owns the focus, even if an earlier retry finishes.
    const cancelFocus = (): void => {
      sessionsFocusRef.current = false;
    };
    document.addEventListener('pointerdown', cancelFocus, true);
    document.addEventListener('keydown', cancelFocus, true);
    document.addEventListener('wheel', cancelFocus, { passive: true });

    return (): void => {
      controller.abort();
      document.removeEventListener('pointerdown', cancelFocus, true);
      document.removeEventListener('keydown', cancelFocus, true);
      document.removeEventListener('wheel', cancelFocus);
    };
  }, []);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [sessionsNotice, setSessionsNotice] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [sessionToRevoke, setSessionToRevoke] = useState<SessionInfo | null>(
    null,
  );
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);

  const fetchSessions = useCallback(
    async (signal = lifetimeRef.current?.signal): Promise<void> => {
      if (!signal || signal.aborted) return;
      const requestId = ++sessionsRequestRef.current;
      const isCurrent = (): boolean =>
        !signal.aborted && requestId === sessionsRequestRef.current;
      setLoadingSessions(true);
      setSessionsError(null);
      try {
        const data = await securityRequest<{ sessions: SessionInfo[] }>(
          '/api/auth/sessions',
          signal,
          { cache: 'no-store' },
        );
        if (isCurrent()) setSessions(data.sessions);
      } catch (failure) {
        if (isCurrent()) {
          if (
            failure instanceof ApiClientError &&
            [401, 403].includes(failure.status)
          )
            setSessions([]);
          setSessionsError('Impossible de charger les sessions');
        }
      } finally {
        if (isCurrent()) {
          setLoadingSessions(false);
        }
      }
    },
    [],
  );
  useImperativeHandle(
    ref,
    (): AccountSessionsHandle => ({ reload: () => fetchSessions() }),
    [fetchSessions],
  );

  useEffect(() => {
    const controller = new AbortController();

    void fetchSessions(controller.signal);

    return (): void => {
      controller.abort();
    };
  }, [fetchSessions, mfaEnabledAt]);

  useEffect(() => {
    if (!loadingSessions && sessionsFocusRef.current) {
      sessionsFocusRef.current = false;
      focusSecurityHeading('account-sessions-heading');
    }
  }, [loadingSessions, sessionsError]);

  const handleRevokeSession = async (sessionId?: string): Promise<void> => {
    const signal = lifetimeRef.current?.signal;
    if (!signal || signal.aborted || revokingRef.current) return;
    revokingRef.current = true;
    sessionMutationRef.current = true;
    let reload = false;
    try {
      setSessionsNotice(null);
      if (sessionId) setRevokingId(sessionId);
      else setRevokingAll(true);
      await securityRequest<null>(
        sessionId
          ? `/api/auth/sessions?id=${encodeURIComponent(sessionId)}`
          : '/api/auth/sessions',
        signal,
        { method: 'DELETE' },
      );
      if (signal.aborted) return;
      toast.success(
        sessionId
          ? 'Session déconnectée'
          : 'Toutes les autres sessions ont été déconnectées',
      );
      reload = true;
    } catch (failure) {
      if (signal.aborted) return;
      if (
        failure instanceof ApiClientError &&
        [401, 403].includes(failure.status)
      ) {
        setSessions([]);
        setSessionsError(
          'Votre accès aux sessions doit être vérifié. Rechargez la liste avant de continuer.',
        );
      } else if (
        !(failure instanceof ApiClientError) ||
        failure.status >= 500 ||
        failure.code === 'INVALID_RESPONSE'
      ) {
        setSessionsNotice(
          'La réponse n’a pas pu être confirmée. Vérifiez les sessions restantes avant de recommencer.',
        );
        reload = true;
      } else if (failure.status === 404) {
        setSessionsNotice(
          'Cette session n’est plus disponible. Vérifiez les sessions restantes avant de continuer.',
        );
        reload = true;
      } else {
        toast.error(failure.message);
      }
    } finally {
      // A completed mutation must not leave its modal locked on a later GET.
      if (!signal.aborted) {
        setRevokingAll(false);
        setRevokingId(null);
        setShowRevokeDialog(false);
        setSessionToRevoke(null);
      }
      if (!signal.aborted && reload) {
        await fetchSessions();
      }
      revokingRef.current = false;
    }
  };

  const currentSession = sessions.find((session) => session.isCurrent);
  const otherSessions = sessions.filter((session) => !session.isCurrent);

  return (
    <>
      <Card
        aria-busy={loadingSessions}
        aria-labelledby="account-sessions-heading"
        className="min-w-0"
      >
        <CardHeader className="p-4 sm:p-5">
          <SecurityCardTitle
            icon={<Monitor className="size-3.5" />}
            id="account-sessions-heading"
          >
            Sessions actives
          </SecurityCardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-3 sm:p-4">
          {sessionsNotice && (
            <p
              className="border-warning/30 bg-warning/10 text-warning rounded-md border p-3 text-sm leading-6"
              role="status"
            >
              {sessionsNotice}
            </p>
          )}
          {loadingSessions ? (
            <div aria-live="polite" className="space-y-2" role="status">
              <span className="sr-only">Chargement des sessions actives</span>
              <Skeleton className="h-24 rounded-md" />
              <Skeleton className="h-24 rounded-md" />
            </div>
          ) : sessionsError ? (
            <div
              className="border-destructive/35 bg-destructive/10 text-destructive flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-sm"
              role="alert"
            >
              <span>{sessionsError}</span>
              <Button
                onClick={() => {
                  sessionsFocusRef.current = true;
                  void fetchSessions();
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                Réessayer
              </Button>
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Aucune session active n&apos;a été trouvée.
            </p>
          ) : (
            <>
              {currentSession && (
                <div className="space-y-2">
                  <p className="text-muted-foreground text-xs font-medium uppercase">
                    Session actuelle
                  </p>
                  <SessionRow session={currentSession} />
                </div>
              )}
              {otherSessions.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-muted-foreground text-xs font-medium uppercase">
                    Autres sessions
                  </p>
                  <div className="space-y-2">
                    {otherSessions.map((session) => (
                      <SessionRow
                        key={session.id}
                        session={session}
                        isRevoking={revokingId === session.id}
                        disabled={revokingAll || revokingId !== null}
                        onRevoke={setSessionToRevoke}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Aucune autre session active.
                </p>
              )}
            </>
          )}
        </CardContent>
        {!loadingSessions && !sessionsError && otherSessions.length > 0 && (
          <CardFooter className="justify-end p-4 sm:p-5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setShowRevokeDialog(true)}
              disabled={revokingAll || revokingId !== null}
            >
              {revokingAll ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <LogOut className="size-4" />
              )}
              Déconnecter les autres sessions
            </Button>
          </CardFooter>
        )}
      </Card>
      <AlertDialog
        open={sessionToRevoke !== null}
        onOpenChange={(open) => {
          if (!open && !revokingId) setSessionToRevoke(null);
        }}
      >
        <AlertDialogContent
          className="overflow-y-auto p-0"
          onCloseAutoFocus={(event) => {
            if (sessionMutationRef.current) {
              event.preventDefault();
              sessionMutationRef.current = false;
              focusSecurityHeading('account-sessions-heading');
            }
          }}
        >
          <div className="p-6">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground flex items-center gap-2">
                <div className="bg-destructive/10 flex h-8 w-8 items-center justify-center rounded-lg">
                  <AlertTriangle size={16} className="text-destructive" />
                </div>
                Déconnecter cet appareil ?
              </AlertDialogTitle>
              <AlertDialogDescription>
                {sessionToRevoke
                  ? `${getSessionTitle(sessionToRevoke)} ne pourra plus utiliser cette session.`
                  : 'Cette session sera immédiatement déconnectée.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel disabled={!!revokingId}>
                Annuler
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(event) => {
                  event.preventDefault();
                  if (sessionToRevoke) {
                    void handleRevokeSession(sessionToRevoke.id);
                  }
                }}
                disabled={!sessionToRevoke || !!revokingId}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {revokingId && <Loader2 className="size-4 animate-spin" />}
                Déconnecter
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={showRevokeDialog}
        onOpenChange={(open) => {
          if (!revokingRef.current) setShowRevokeDialog(open);
        }}
      >
        <AlertDialogContent
          className="overflow-y-auto p-0"
          onCloseAutoFocus={(event) => {
            if (sessionMutationRef.current) {
              event.preventDefault();
              sessionMutationRef.current = false;
              focusSecurityHeading('account-sessions-heading');
            }
          }}
        >
          <div className="p-6">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground flex items-center gap-2">
                <div className="bg-destructive/10 flex h-8 w-8 items-center justify-center rounded-lg">
                  <AlertTriangle size={16} className="text-destructive" />
                </div>
                Déconnecter les autres sessions ?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Vous serez déconnecté de {otherSessions.length} autre
                {otherSessions.length > 1 ? 's' : ''} appareil
                {otherSessions.length > 1 ? 's' : ''}. Seule cette session
                restera active.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel disabled={revokingAll}>
                Annuler
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(event) => {
                  event.preventDefault();
                  void handleRevokeSession();
                }}
                disabled={revokingAll}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {revokingAll && <Loader2 className="size-4 animate-spin" />}
                Déconnecter
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
