'use client';

import { LoaderCircle, Newspaper, Pin } from 'lucide-react';
import React, { type FC, type FormEvent, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '$ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '$ui/dialog';
import { Input } from '$ui/input';
import { Label } from '$ui/label';
import { Switch } from '$ui/switch';
import { Textarea } from '$ui/textarea';

import { publishInternalAnnouncement } from '../internal-news.api';

type PublishAnnouncementDialogProps = {
  onOpenChange: (open: boolean) => void;
  onPublished: () => void;
  open: boolean;
};

export const PublishAnnouncementDialog: FC<PublishAnnouncementDialogProps> = ({
  onOpenChange,
  onPublished,
  open,
}) => {
  const [body, setBody] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState('');

  const reset = (): void => {
    setBody('');
    setIsPinned(false);
    setTitle('');
  };

  const handleOpenChange = (nextOpen: boolean): void => {
    if (isSubmitting) return;
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  };

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!title.trim() || !body.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await publishInternalAnnouncement({
        body: body.trim(),
        isPinned,
        title: title.trim(),
      });
      toast.success('Actualité publiée');
      reset();
      onOpenChange(false);
      onPublished();
    } catch {
      toast.error("Impossible de publier l'actualité");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="mb-1 flex items-center gap-3">
            <span className="border-primary/25 bg-primary/10 text-primary-emphasis flex size-10 items-center justify-center rounded-xl border">
              <Newspaper className="size-5" />
            </span>
            <DialogTitle>Publier une actualité</DialogTitle>
          </div>
          <DialogDescription>
            Cette annonce sera visible par tous les membres ayant accès à la vie
            interne.
          </DialogDescription>
        </DialogHeader>

        <form
          className="mt-3 space-y-4"
          onSubmit={(event) => void submit(event)}
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="internal-news-title">Titre</Label>
              <span className="text-muted-foreground text-xs">
                {title.length}/160
              </span>
            </div>
            <Input
              autoFocus
              id="internal-news-title"
              maxLength={160}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ex. Nouveau partenariat confirmé"
              value={title}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="internal-news-body">Contenu</Label>
              <span className="text-muted-foreground text-xs">
                {body.length}/2 000
              </span>
            </div>
            <Textarea
              className="min-h-36 resize-y"
              id="internal-news-body"
              maxLength={2000}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Partagez les informations utiles à l'équipe…"
              value={body}
            />
          </div>

          <div className="border-border-default bg-surface-inset/65 flex items-center justify-between gap-4 rounded-xl border p-3">
            <div className="flex min-w-0 gap-3">
              <span className="border-border-default bg-surface-panel text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg border">
                <Pin className="size-4" />
              </span>
              <div>
                <Label htmlFor="internal-news-pinned">Épingler l’annonce</Label>
                <p className="text-muted-foreground mt-0.5 text-xs leading-5">
                  Elle restera mise en avant au-dessus du fil.
                </p>
              </div>
            </div>
            <Switch
              checked={isPinned}
              id="internal-news-pinned"
              onCheckedChange={setIsPinned}
            />
          </div>

          <DialogFooter>
            <Button
              disabled={isSubmitting}
              onClick={() => handleOpenChange(false)}
              type="button"
              variant="outline"
            >
              Annuler
            </Button>
            <Button
              disabled={!title.trim() || !body.trim() || isSubmitting}
              type="submit"
            >
              {isSubmitting ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Newspaper className="size-4" />
              )}
              Publier
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
