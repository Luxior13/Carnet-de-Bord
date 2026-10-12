'use client';

import { Check, Loader2, RotateCcw, Trash2 } from 'lucide-react';
import React, {
  type FC,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';

import { ContentState } from '$components/layout/ContentState';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '$ui/alert-dialog';
import { Button } from '$ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '$ui/card';
import { ApiClientError } from '$utils/api.utils';

type EntityDangerZoneProps = {
  available?: boolean;
  description: ReactNode;
  dialogDescription: ReactNode;
  dialogNotice: ReactNode;
  onDelete: (
    version: number,
    idempotencyKey: string,
    signal: AbortSignal,
  ) => Promise<void>;
  onDeleted: () => void;
  onDeletedLabel?: string;
  onReloadVersion: () => Promise<number>;
  triggerLabel?: string;
  version: number;
};

export const EntityDangerZone: FC<EntityDangerZoneProps> = ({
  available = true,
  description,
  dialogDescription,
  dialogNotice,
  onDelete,
  onDeleted,
  onDeletedLabel = 'Continuer',
  onReloadVersion,
  triggerLabel = 'Supprimer la fiche',
  version: initialVersion,
}) => {
  const [conflict, setConflict] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const operationRef = useRef(false);
  const requestRef = useRef<AbortController | null>(null);
  const attemptedRef = useRef(false);
  const [deleted, setDeleted] = useState(false);
  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;

    return (): void => {
      mountedRef.current = false;
      requestRef.current?.abort();
    };
  }, []);
  const [pendingOperation, setPendingOperation] = useState<
    'delete' | 'reload' | null
  >(null);
  const isBusy = pendingOperation !== null;
  const isDeleting = pendingOperation === 'delete';
  const isReloading = pendingOperation === 'reload';
  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState(initialVersion);
  const idempotencyKeyRef = useRef(crypto.randomUUID());

  const handleDelete = async (): Promise<void> => {
    if (
      !available ||
      deleted ||
      operationRef.current ||
      !mountedRef.current ||
      conflict
    )
      return;
    operationRef.current = true;
    setError(null);
    setPendingOperation('delete');
    setConflict(false);
    attemptedRef.current = true;
    const controller = new AbortController();
    requestRef.current = controller;
    const timer = window.setTimeout(() => controller.abort(), 30_000);
    try {
      await onDelete(version, idempotencyKeyRef.current, controller.signal);
      if (!mountedRef.current) return;
      setDeleted(true);
      setOpen(false);
      toast.success('Fiche supprimée');
    } catch (caught) {
      if (!mountedRef.current) return;
      if (caught instanceof ApiClientError && caught.status === 409) {
        attemptedRef.current = false;
        setConflict(true);
      } else {
        if (
          caught instanceof ApiClientError &&
          [401, 403, 404, 410].includes(caught.status)
        ) {
          void onReloadVersion().catch(() => {});
        }
        setError(
          caught instanceof ApiClientError && caught.status < 500
            ? caught.message
            : 'Le résultat de la suppression n’a pas pu être confirmé. Réessayez : la même demande sera vérifiée sans supprimer une seconde fois.',
        );
      }
    } finally {
      window.clearTimeout(timer);
      if (requestRef.current === controller) requestRef.current = null;
      operationRef.current = false;
      if (mountedRef.current) setPendingOperation(null);
    }
  };

  useEffect(() => {
    if (!deleted) return;
    try {
      onDeleted();
    } catch {
      // La confirmation reste affichée si la navigation échoue.
    }
  }, [deleted, onDeleted]);

  const refreshVersion = async (): Promise<void> => {
    if (operationRef.current || !mountedRef.current) return;
    operationRef.current = true;
    setPendingOperation('reload');
    setError(null);
    try {
      const freshVersion = await onReloadVersion();
      if (!mountedRef.current) return;
      setVersion(freshVersion);
      attemptedRef.current = false;
      idempotencyKeyRef.current = crypto.randomUUID();
      setConflict(false);
      toast.info('Version actualisée');
    } catch {
      if (mountedRef.current)
        setError('Actualisation impossible. Réessayez avant de supprimer.');
    } finally {
      operationRef.current = false;
      if (mountedRef.current) setPendingOperation(null);
    }
  };

  if (deleted) {
    return (
      <ContentState
        icon={<Check aria-hidden="true" className="size-4" />}
        title="Fiche supprimée"
        description="La suppression a été confirmée. Vous pouvez revenir à la liste."
        action={<Button onClick={onDeleted}>{onDeletedLabel}</Button>}
      />
    );
  }

  return (
    <Card className="border-destructive/35">
      <CardHeader className="bg-destructive/5">
        <CardTitle className="text-destructive text-sm">
          Zone dangereuse
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <p className="text-sm font-medium">
            Supprimer définitivement la fiche
          </p>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
            {description}
          </p>
        </div>
        <AlertDialog
          onOpenChange={(nextOpen) => {
            if (operationRef.current) return;
            setOpen(nextOpen);
            if (nextOpen && !attemptedRef.current) {
              setVersion(initialVersion);
              setConflict(false);
              setError(null);
              idempotencyKeyRef.current = crypto.randomUUID();
            }
          }}
          open={open}
        >
          <AlertDialogTrigger asChild>
            <Button
              className="shrink-0"
              disabled={!available}
              variant="destructive"
            >
              <Trash2 className="size-4" />
              {triggerLabel}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent
            aria-busy={isBusy || undefined}
            className="sm:max-w-lg"
          >
            <AlertDialogHeader>
              <AlertDialogTitle>
                Supprimer définitivement cette fiche ?
              </AlertDialogTitle>
              <AlertDialogDescription>
                {dialogDescription}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {error && (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            )}
            <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm">
              {dialogNotice}
            </div>
            {conflict && (
              <ContentState
                action={
                  <Button
                    disabled={isBusy}
                    onClick={() => void refreshVersion()}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {isReloading ? (
                      <Loader2
                        aria-hidden="true"
                        className="size-4 animate-spin"
                      />
                    ) : (
                      <RotateCcw aria-hidden="true" className="size-4" />
                    )}
                    {isReloading ? 'Actualisation…' : 'Actualiser'}
                  </Button>
                }
                description="La fiche a changé depuis son ouverture. Actualisez-la puis confirmez à nouveau."
                kind="warning"
                title="Version périmée"
              />
            )}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isBusy}>Annuler</AlertDialogCancel>
              <Button
                disabled={!available || isBusy || conflict}
                onClick={() => void handleDelete()}
                type="button"
                variant="destructive"
              >
                {isDeleting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                {isDeleting ? 'Suppression…' : 'Supprimer définitivement'}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};
