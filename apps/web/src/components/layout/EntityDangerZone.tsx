'use client';

import { Loader2, RotateCcw, Trash2 } from 'lucide-react';
import React, { type FC, type ReactNode, useRef, useState } from 'react';
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
  description: ReactNode;
  dialogDescription: ReactNode;
  dialogNotice: ReactNode;
  onDelete: (version: number, idempotencyKey: string) => Promise<void>;
  onDeleted: () => void;
  onReloadVersion: () => Promise<number>;
  triggerLabel?: string;
  version: number;
};

export const EntityDangerZone: FC<EntityDangerZoneProps> = ({
  description,
  dialogDescription,
  dialogNotice,
  onDelete,
  onDeleted,
  onReloadVersion,
  triggerLabel = 'Supprimer la fiche',
  version: initialVersion,
}) => {
  const [conflict, setConflict] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState(initialVersion);
  const idempotencyKeyRef = useRef(crypto.randomUUID());

  const handleDelete = async (): Promise<void> => {
    setIsDeleting(true);
    setConflict(false);
    try {
      await onDelete(version, idempotencyKeyRef.current);
      setOpen(false);
      toast.success('Fiche supprimée');
      onDeleted();
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.status === 409) {
        setConflict(true);
      } else {
        toast.error(
          caught instanceof Error ? caught.message : 'Suppression impossible',
        );
      }
    } finally {
      setIsDeleting(false);
    }
  };

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
            if (isDeleting) return;
            setOpen(nextOpen);
            if (nextOpen) {
              setVersion(initialVersion);
              setConflict(false);
              idempotencyKeyRef.current = crypto.randomUUID();
            }
          }}
          open={open}
        >
          <AlertDialogTrigger asChild>
            <Button className="shrink-0" variant="destructive">
              <Trash2 className="size-4" />
              {triggerLabel}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="sm:max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle>
                Supprimer définitivement cette fiche ?
              </AlertDialogTitle>
              <AlertDialogDescription>
                {dialogDescription}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm">
              {dialogNotice}
            </div>
            {conflict && (
              <ContentState
                action={
                  <Button
                    onClick={() => {
                      void onReloadVersion().then((freshVersion) => {
                        setVersion(freshVersion);
                        setConflict(false);
                        toast.info('Version actualisée');
                      });
                    }}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <RotateCcw className="size-4" />
                    Actualiser
                  </Button>
                }
                description="La fiche a changé depuis son ouverture. Actualisez-la puis confirmez à nouveau."
                kind="warning"
                title="Version périmée"
              />
            )}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>
                Annuler
              </AlertDialogCancel>
              <Button
                disabled={isDeleting}
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
