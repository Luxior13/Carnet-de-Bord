'use client';

import { ExternalLink, Loader2, RefreshCw, Unlink } from 'lucide-react';
import React, {
  type FC,
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { toast } from 'sonner';

import { PersonAvatar } from '$features/persons/components/PersonAvatar';
import { getPerson } from '$features/persons/person.api';
import type { PersonDetail } from '$features/persons/types/person.types';
import { ErrorCode } from '$types/api.types';
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
import { Checkbox } from '$ui/checkbox';
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
import { ApiClientError } from '$utils/api.utils';

import { getPartner, updatePartnerContact } from '../partner.api';
import { getPartnerTodayCivilDate } from '../partner-timeline.ui';
import type { PartnerContact, PartnerDetail } from '../types/partner.types';
import { PartnerPersonCoordinateSelect } from './PartnerPersonCoordinateSelect';

const CONTACT_LABEL_SUGGESTIONS = [
  'Interlocuteur',
  'Direction',
  'Commercial',
  'Communication',
  'Technique',
] as const;

type DirtyFields = {
  isPrimary: boolean;
  label: boolean;
  selectedEmailId: boolean;
  selectedPhoneId: boolean;
  startedOn: boolean;
};

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;

export const PartnerContactEditDialogs: FC<{
  canUpdatePersons: boolean;
  contact: PartnerContact;
  onChange: (partner: PartnerDetail) => void;
  onClose: () => void;
  partner: PartnerDetail;
}> = ({ canUpdatePersons, contact, onChange, onClose, partner }) => {
  const [editOpen, setEditOpen] = useState(true);
  const [label, setLabel] = useState(contact.label);
  const [isPrimary, setIsPrimary] = useState(contact.isPrimary);
  const [startedOn, setStartedOn] = useState(contact.startedOn ?? '');
  const [selectedEmailId, setSelectedEmailId] = useState(
    contact.selectedEmail?.id ?? '',
  );
  const [selectedPhoneId, setSelectedPhoneId] = useState(
    contact.selectedPhone?.id ?? '',
  );
  const [personDetail, setPersonDetail] = useState<PersonDetail | null>(null);
  const [personLoading, setPersonLoading] = useState(false);
  const [personError, setPersonError] = useState<string | null>(null);
  const [contactVersion, setContactVersion] = useState(contact.version);
  const [partnerVersion, setPartnerVersion] = useState(partner.version);
  const [editing, setEditing] = useState(false);
  const [closingOpen, setClosingOpen] = useState(false);
  const [endedOn, setEndedOn] = useState('');
  const [closing, setClosing] = useState(false);
  const [conflictNotice, setConflictNotice] = useState<string | null>(null);
  const [dirtyFields, setDirtyFields] = useState<DirtyFields>({
    isPrimary: false,
    label: false,
    selectedEmailId: false,
    selectedPhoneId: false,
    startedOn: false,
  });
  const hasChanges = Object.values(dirtyFields).some(Boolean);
  const personId = contact.person?.id ?? null;

  const loadPerson = useCallback(async (): Promise<PersonDetail | null> => {
    if (!personId) return null;
    setPersonLoading(true);
    setPersonError(null);
    try {
      const detail = await getPerson(personId);
      setPersonDetail(detail);
      setSelectedEmailId((current) =>
        detail.emails.some((email) => email.id === current) ? current : '',
      );
      setSelectedPhoneId((current) =>
        detail.phones.some((phone) => phone.id === current) ? current : '',
      );

      return detail;
    } catch (error) {
      setPersonDetail(null);
      setPersonError(
        getErrorMessage(
          error,
          'Les coordonnées de cette fiche ne peuvent pas être chargées.',
        ),
      );

      return null;
    } finally {
      setPersonLoading(false);
    }
  }, [personId]);

  useEffect(() => {
    void loadPerson();
  }, [loadPerson]);

  const refreshPersonAndPartner = async (): Promise<void> => {
    const detail = await loadPerson();
    if (!detail) return;
    try {
      const fresh = await getPartner(partner.id);
      const freshContact = fresh.contacts.find(
        (item) => item.id === contact.id && !item.closedAt && item.person,
      );
      onChange(fresh);
      setPartnerVersion(fresh.version);
      if (!freshContact) {
        toast.error('Cette liaison n’est plus active.');
        onClose();

        return;
      }
      setContactVersion(freshContact.version);
      if (!dirtyFields.selectedEmailId) {
        setSelectedEmailId(freshContact.selectedEmail?.id ?? '');
      }
      if (!dirtyFields.selectedPhoneId) {
        setSelectedPhoneId(freshContact.selectedPhone?.id ?? '');
      }
      toast.success('Coordonnées actualisées');
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          'La fiche partenaire n’a pas pu être actualisée.',
        ),
      );
    }
  };

  const refreshAfterConflict = async (error: ApiClientError): Promise<void> => {
    try {
      const fresh = await getPartner(partner.id);
      const freshContact = fresh.contacts.find(
        (item) => item.id === contact.id && !item.closedAt && item.person,
      );
      onChange(fresh);
      setPartnerVersion(fresh.version);
      if (!freshContact) {
        toast.error(
          `${error.message} La liaison n’est plus modifiable et la fiche a été actualisée.`,
        );
        onClose();

        return;
      }
      setContactVersion(freshContact.version);
      if (!dirtyFields.label) setLabel(freshContact.label);
      if (!dirtyFields.isPrimary) setIsPrimary(freshContact.isPrimary);
      if (!dirtyFields.startedOn) {
        setStartedOn(freshContact.startedOn ?? '');
      }

      let removedSelection = false;
      try {
        const freshPerson = freshContact.person;
        if (!freshPerson) {
          throw new Error('La fiche du Répertoire n’est plus disponible.');
        }
        const detail = await getPerson(freshPerson.id);
        setPersonDetail(detail);
        setPersonError(null);
        if (dirtyFields.selectedEmailId) {
          if (
            selectedEmailId &&
            !detail.emails.some((email) => email.id === selectedEmailId)
          ) {
            setSelectedEmailId('');
            removedSelection = true;
          }
        } else {
          setSelectedEmailId(freshContact.selectedEmail?.id ?? '');
        }
        if (dirtyFields.selectedPhoneId) {
          if (
            selectedPhoneId &&
            !detail.phones.some((phone) => phone.id === selectedPhoneId)
          ) {
            setSelectedPhoneId('');
            removedSelection = true;
          }
        } else {
          setSelectedPhoneId(freshContact.selectedPhone?.id ?? '');
        }
      } catch (personErrorCaught) {
        setPersonDetail(null);
        setPersonError(
          getErrorMessage(
            personErrorCaught,
            'Les coordonnées ne peuvent pas être actualisées.',
          ),
        );
      }
      setConflictNotice(
        removedSelection
          ? 'La fiche a été actualisée. Une coordonnée choisie n’existe plus et a été désélectionnée ; vos autres modifications sont conservées.'
          : 'La fiche a été actualisée. Vos champs modifiés sont conservés ; les autres ont été synchronisés.',
      );
      toast.error(`${error.message} La fiche a été actualisée.`);
    } catch {
      setConflictNotice(
        'La fiche n’a pas pu être actualisée. Réessayez dans un instant.',
      );
      toast.error(`${error.message} Actualisation impossible.`);
    }
  };

  const saveEdit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const normalizedLabel = label.trim();
    if (!normalizedLabel || !hasChanges) return;

    setEditing(true);
    try {
      const updated = await updatePartnerContact(partner.id, contact.id, {
        contactVersion,
        ...(dirtyFields.isPrimary ? { isPrimary } : {}),
        ...(dirtyFields.label ? { label: normalizedLabel } : {}),
        ...(dirtyFields.selectedEmailId
          ? { selectedEmailId: selectedEmailId || null }
          : {}),
        ...(dirtyFields.selectedPhoneId
          ? { selectedPhoneId: selectedPhoneId || null }
          : {}),
        ...(dirtyFields.startedOn ? { startedOn: startedOn || null } : {}),
        version: partnerVersion,
      });
      onChange(updated);
      toast.success('Liaison mise à jour');
      onClose();
    } catch (error) {
      if (
        error instanceof ApiClientError &&
        (error.status === 409 ||
          error.code === ErrorCode.PARTNER_CONTACT_VERSION_CONFLICT ||
          error.code === ErrorCode.PARTNER_VERSION_CONFLICT)
      ) {
        await refreshAfterConflict(error);
      } else {
        toast.error(
          getErrorMessage(error, 'La liaison n’a pas pu être modifiée.'),
        );
      }
    } finally {
      setEditing(false);
    }
  };

  const openClosingConfirmation = (): void => {
    setEndedOn(getPartnerTodayCivilDate());
    setClosingOpen(true);
    setEditOpen(false);
  };

  const closeContact = async (): Promise<void> => {
    setClosing(true);
    try {
      const updated = await updatePartnerContact(partner.id, contact.id, {
        close: true,
        contactVersion,
        endedOn: endedOn || null,
        ...(dirtyFields.label ? { label: label.trim() || contact.label } : {}),
        ...(dirtyFields.startedOn ? { startedOn: startedOn || null } : {}),
        version: partnerVersion,
      });
      onChange(updated);
      toast.success('Liaison terminée');
      onClose();
    } catch (error) {
      if (
        error instanceof ApiClientError &&
        (error.status === 409 ||
          error.code === ErrorCode.PARTNER_CONTACT_VERSION_CONFLICT ||
          error.code === ErrorCode.PARTNER_VERSION_CONFLICT)
      ) {
        await refreshAfterConflict(error);
      } else {
        toast.error(
          getErrorMessage(error, 'La liaison n’a pas pu être terminée.'),
        );
      }
    } finally {
      setClosing(false);
    }
  };

  const directoryHref = contact.person
    ? `/vie-interne/repertoire/${encodeURIComponent(contact.person.id)}?section=coordonnees`
    : '';
  const missingCoordinate =
    personDetail &&
    (personDetail.emails.length === 0 || personDetail.phones.length === 0);

  return (
    <>
      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          if (editing) return;
          setEditOpen(open);
          if (!open && !closingOpen) onClose();
        }}
      >
        <DialogContent
          className="grid h-[100svh] max-h-[100svh] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-0 sm:h-auto sm:max-h-[90svh] sm:max-w-2xl"
          fullscreenOnMobile
        >
          <DialogHeader className="border-border-divider border-b px-4 py-4 pr-14 text-left sm:px-5">
            <DialogTitle>Modifier la liaison</DialogTitle>
            <DialogDescription>
              Ajustez le rôle, les coordonnées à utiliser ou la date de cette
              liaison.
            </DialogDescription>
          </DialogHeader>
          <form className="contents" onSubmit={saveEdit}>
            <div className="min-h-0 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
              {conflictNotice && (
                <p
                  className="border-warning/50 bg-warning/10 rounded-lg border p-3 text-sm"
                  role="status"
                >
                  {conflictNotice}
                </p>
              )}
              {contact.person && (
                <div className="bg-surface-inset flex items-center gap-3 rounded-lg border p-3">
                  <PersonAvatar
                    className="size-10 shrink-0 rounded-full"
                    person={{
                      firstName: null,
                      id: contact.person.id,
                      lastName: contact.person.displayName,
                      nickname: null,
                    }}
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {contact.person.displayName}
                    </p>
                    <p className="text-muted-foreground truncate text-sm">
                      {contact.label}
                    </p>
                  </div>
                </div>
              )}

              {personLoading && (
                <p
                  className="text-muted-foreground flex items-center gap-2 text-sm"
                  role="status"
                >
                  <Loader2 className="size-4 animate-spin" />
                  Chargement des coordonnées…
                </p>
              )}
              {personError && (
                <div className="border-destructive/50 bg-destructive/5 space-y-2 rounded-lg border p-3">
                  <p className="text-destructive text-sm" role="alert">
                    {personError}
                  </p>
                  <Button
                    disabled={personLoading}
                    onClick={() => void loadPerson()}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <RefreshCw className="size-4" />
                    Réessayer
                  </Button>
                </div>
              )}
              {personDetail && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <PartnerPersonCoordinateSelect
                    disabled={editing || personLoading}
                    items={personDetail.emails}
                    kind="email"
                    onChange={(nextId) => {
                      setSelectedEmailId(nextId);
                      setDirtyFields((current) => ({
                        ...current,
                        selectedEmailId:
                          nextId !== (contact.selectedEmail?.id ?? ''),
                      }));
                    }}
                    value={selectedEmailId}
                  />
                  <PartnerPersonCoordinateSelect
                    disabled={editing || personLoading}
                    items={personDetail.phones}
                    kind="phone"
                    onChange={(nextId) => {
                      setSelectedPhoneId(nextId);
                      setDirtyFields((current) => ({
                        ...current,
                        selectedPhoneId:
                          nextId !== (contact.selectedPhone?.id ?? ''),
                      }));
                    }}
                    value={selectedPhoneId}
                  />
                </div>
              )}
              {missingCoordinate && contact.person && (
                <div className="bg-surface-inset flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-muted-foreground text-sm">
                    Les coordonnées absentes se complètent dans le Répertoire.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="outline">
                      <a href={directoryHref} rel="noreferrer" target="_blank">
                        <ExternalLink className="size-4" />
                        {canUpdatePersons
                          ? 'Compléter la fiche'
                          : 'Consulter la fiche'}
                      </a>
                    </Button>
                    <Button
                      disabled={personLoading}
                      onClick={() => void refreshPersonAndPartner()}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <RefreshCw className="size-4" />
                      Actualiser
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="partner-contact-edit-label">
                  Rôle auprès de l’organisation
                </Label>
                <Input
                  autoComplete="off"
                  disabled={editing}
                  id="partner-contact-edit-label"
                  list="partner-contact-edit-label-suggestions"
                  maxLength={80}
                  onChange={(event) => {
                    const nextLabel = event.target.value;
                    setLabel(nextLabel);
                    setDirtyFields((current) => ({
                      ...current,
                      label: nextLabel.trim() !== contact.label,
                    }));
                  }}
                  required
                  value={label}
                />
                <datalist id="partner-contact-edit-label-suggestions">
                  {CONTACT_LABEL_SUGGESTIONS.map((suggestion) => (
                    <option key={suggestion} value={suggestion} />
                  ))}
                </datalist>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="partner-contact-edit-started-on">
                  Date de début (facultative)
                </Label>
                <Input
                  disabled={editing}
                  id="partner-contact-edit-started-on"
                  onChange={(event) => {
                    const nextStartedOn = event.target.value;
                    setStartedOn(nextStartedOn);
                    setDirtyFields((current) => ({
                      ...current,
                      startedOn: (nextStartedOn || null) !== contact.startedOn,
                    }));
                  }}
                  type="date"
                  value={startedOn}
                />
              </div>
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={isPrimary}
                  disabled={editing}
                  id="partner-contact-edit-primary"
                  onCheckedChange={(checked) => {
                    const nextPrimary = checked === true;
                    setIsPrimary(nextPrimary);
                    setDirtyFields((current) => ({
                      ...current,
                      isPrimary: nextPrimary !== contact.isPrimary,
                    }));
                  }}
                />
                <Label
                  className="cursor-pointer"
                  htmlFor="partner-contact-edit-primary"
                >
                  Interlocuteur principal
                </Label>
              </div>
            </div>
            <DialogFooter className="border-border-divider bg-surface-inset border-t px-4 py-4 sm:justify-between sm:px-5">
              <Button
                disabled={editing}
                onClick={openClosingConfirmation}
                type="button"
                variant="ghost"
              >
                <Unlink className="size-4" />
                Terminer la liaison
              </Button>
              <div className="flex flex-col-reverse gap-2 sm:ml-auto sm:flex-row">
                <Button
                  disabled={editing}
                  onClick={onClose}
                  type="button"
                  variant="outline"
                >
                  Annuler
                </Button>
                <Button
                  disabled={editing || !label.trim() || !hasChanges}
                  type="submit"
                >
                  {editing && <Loader2 className="size-4 animate-spin" />}
                  Enregistrer
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={closingOpen}
        onOpenChange={(open) => {
          if (closing) return;
          setClosingOpen(open);
          if (!open) setEditOpen(true);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terminer cette liaison ?</AlertDialogTitle>
            <AlertDialogDescription>
              L’interlocuteur restera dans l’historique sans ses coordonnées.
              Une future reprise créera une nouvelle liaison. Les corrections du
              rôle et de la date de début seront aussi enregistrées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {conflictNotice && (
            <p
              className="border-warning/50 bg-warning/10 rounded-lg border p-3 text-sm"
              role="status"
            >
              {conflictNotice}
            </p>
          )}
          <div className="grid gap-2">
            <Label htmlFor="partner-contact-ended-on">
              Date de fin (facultative)
            </Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                disabled={closing}
                id="partner-contact-ended-on"
                onChange={(event) => setEndedOn(event.target.value)}
                type="date"
                value={endedOn}
              />
              {endedOn && (
                <Button
                  disabled={closing}
                  onClick={() => setEndedOn('')}
                  type="button"
                  variant="ghost"
                >
                  Effacer
                </Button>
              )}
            </div>
            <p className="text-muted-foreground text-xs">
              La date du jour à Paris est proposée par défaut.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={closing}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={closing}
              onClick={(event) => {
                event.preventDefault();
                void closeContact();
              }}
            >
              {closing && <Loader2 className="size-4 animate-spin" />}
              Terminer la liaison
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
