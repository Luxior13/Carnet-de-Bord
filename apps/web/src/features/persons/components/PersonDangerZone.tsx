'use client';

import { Loader2, RotateCcw, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { type FC, useRef, useState } from 'react';
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

import { deletePerson } from '../person.api';
import type { PersonDetail } from '../types/person.types';

type PersonDangerZoneProps = {
  onReload: () => Promise<PersonDetail>;
  person: PersonDetail;
};

export const PersonDangerZone: FC<PersonDangerZoneProps> = ({
  onReload,
  person,
}) => {
  const router = useRouter();
  const [conflict, setConflict] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState(person.version);
  const idempotencyKeyRef = useRef(crypto.randomUUID());

  const handleDelete = async (): Promise<void> => {
    setIsDeleting(true);
    setConflict(false);
    try {
      await deletePerson({
        idempotencyKey: idempotencyKeyRef.current,
        personId: person.id,
        version,
      });
      setOpen(false);
      toast.success('Fiche supprimée');
      router.replace('/vie-interne/repertoire');
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
            L&apos;identité, les coordonnées et les profils sociaux seront
            supprimés sans possibilité de restauration.
          </p>
        </div>
        <AlertDialog
          open={open}
          onOpenChange={(nextOpen) => {
            if (isDeleting) return;
            setOpen(nextOpen);
            if (nextOpen) {
              setVersion(person.version);
              setConflict(false);
              idempotencyKeyRef.current = crypto.randomUUID();
            }
          }}
        >
          <AlertDialogTrigger asChild>
            <Button className="shrink-0" variant="destructive">
              <Trash2 className="size-4" />
              Supprimer la fiche
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="sm:max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle>
                Supprimer définitivement cette fiche ?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible. Aucun mot de passe ni code de
                double authentification n&apos;est demandé : vérifiez
                attentivement avant de confirmer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm">
              La fiche et ses données personnelles seront effacées immédiatement
              et définitivement.
            </div>
            {conflict && (
              <ContentState
                action={
                  <Button
                    onClick={() => {
                      void onReload().then((fresh) => {
                        setVersion(fresh.version);
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
