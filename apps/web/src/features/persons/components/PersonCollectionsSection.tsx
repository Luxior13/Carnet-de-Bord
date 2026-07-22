'use client';

import {
  AlertTriangle,
  AtSign,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Mail,
  Network,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
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
} from '$ui/alert-dialog';
import { Badge } from '$ui/badge';
import { Button } from '$ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '$ui/select';
import { ApiClientError } from '$utils/api.utils';

import { mutatePersonChild } from '../person.api';
import {
  getPersonSocialNetwork,
  PERSON_AUDIT_KEYS,
  PERSON_LIMITS,
} from '../person.constants';
import type {
  PersonDetail,
  PersonDuplicateWarning,
  PersonEmailItem,
  PersonPhoneItem,
  PersonSocialProfileItem,
} from '../types/person.types';
import { PersonChildDialog } from './PersonChildDialog';
import { PersonFieldHistoryPopover } from './PersonFieldHistoryPopover';

type ChildKind = 'email' | 'phone' | 'social';
type ChildItem = PersonEmailItem | PersonPhoneItem | PersonSocialProfileItem;

type EditorState = {
  item: ChildItem | null;
  kind: ChildKind;
} | null;

type DeleteState = {
  item: ChildItem;
  kind: ChildKind;
} | null;

type PersonCollectionsSectionProps = {
  canUpdate: boolean;
  canViewAudit: boolean;
  canViewHistory: boolean;
  duplicateMatches: NonNullable<PersonDuplicateWarning['matches']>;
  onChange: (person: PersonDetail) => void;
  onReload: () => Promise<PersonDetail>;
  person: PersonDetail;
};

const ChildActions: FC<{
  label: string;
  onDelete: () => void;
  onEdit: () => void;
}> = ({ label, onDelete, onEdit }) => (
  <div className="flex shrink-0 items-center gap-1">
    <Button
      aria-label={`Modifier ${label}`}
      onClick={onEdit}
      size="icon"
      type="button"
      variant="ghost"
    >
      <Pencil className="size-3.5" />
    </Button>
    <Button
      aria-label={`Supprimer ${label}`}
      onClick={onDelete}
      size="icon"
      type="button"
      variant="ghost"
    >
      <Trash2 className="size-3.5" />
    </Button>
  </div>
);

const ItemBadges: FC<{ isPrimary: boolean; label: string }> = ({
  isPrimary,
  label,
}) => (
  <div className="flex flex-wrap items-center gap-1.5">
    <Badge variant="outline">{label}</Badge>
    {isPrimary && <Badge variant="success">Principal</Badge>}
  </div>
);

const EmptyCollection: FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-muted-foreground border-border-divider rounded-lg border border-dashed px-3 py-5 text-center text-sm">
    {children}
  </p>
);

const DuplicateFieldWarning: FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <p className="text-warning mt-2 flex items-start gap-1.5 text-xs">
    <AlertTriangle aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
    <span>{children}</span>
  </p>
);

const EmailRow: FC<{
  canUpdate: boolean;
  canViewAudit: boolean;
  canViewHistory: boolean;
  duplicateWarning: boolean;
  item: PersonEmailItem;
  onDelete: () => void;
  onEdit: () => void;
  personId: string;
}> = ({
  canUpdate,
  canViewAudit,
  canViewHistory,
  duplicateWarning,
  item,
  onDelete,
  onEdit,
  personId,
}) => (
  <li className="border-border-divider flex min-w-0 items-center gap-3 border-b py-3 last:border-0">
    <Mail className="text-muted-foreground size-4 shrink-0" />
    <div className="min-w-0 flex-1">
      <div className="flex min-w-0 items-center gap-1">
        <a
          className="hover:text-primary-emphasis truncate text-sm font-medium hover:underline"
          href={`mailto:${item.email}`}
        >
          {item.email}
        </a>
        {canViewHistory && (
          <PersonFieldHistoryPopover
            canViewAudit={canViewAudit}
            fieldKey="email"
            label="Email"
            personId={personId}
            recordId={item.id}
            revision={item.version}
            sectionKey={PERSON_AUDIT_KEYS.sections.contacts}
          />
        )}
      </div>
      <div className="mt-1">
        <ItemBadges isPrimary={item.isPrimary} label={item.label} />
      </div>
      {duplicateWarning && (
        <DuplicateFieldWarning>
          Cet email existe aussi sur une autre fiche.
        </DuplicateFieldWarning>
      )}
    </div>
    {canUpdate && (
      <ChildActions label="cet email" onDelete={onDelete} onEdit={onEdit} />
    )}
  </li>
);

const PhoneRow: FC<{
  canUpdate: boolean;
  canViewAudit: boolean;
  canViewHistory: boolean;
  duplicateWarning: boolean;
  item: PersonPhoneItem;
  onDelete: () => void;
  onEdit: () => void;
  personId: string;
}> = ({
  canUpdate,
  canViewAudit,
  canViewHistory,
  duplicateWarning,
  item,
  onDelete,
  onEdit,
  personId,
}) => (
  <li className="border-border-divider flex min-w-0 items-center gap-3 border-b py-3 last:border-0">
    <Phone className="text-muted-foreground size-4 shrink-0" />
    <div className="min-w-0 flex-1">
      <div className="flex min-w-0 items-center gap-1">
        <a
          className="hover:text-primary-emphasis truncate text-sm font-medium hover:underline"
          href={`tel:${item.phone}`}
        >
          {item.phone}
        </a>
        {canViewHistory && (
          <PersonFieldHistoryPopover
            canViewAudit={canViewAudit}
            fieldKey="phone"
            label="Téléphone"
            personId={personId}
            recordId={item.id}
            revision={item.version}
            sectionKey={PERSON_AUDIT_KEYS.sections.contacts}
          />
        )}
      </div>
      <div className="mt-1">
        <ItemBadges isPrimary={item.isPrimary} label={item.label} />
      </div>
      {duplicateWarning && (
        <DuplicateFieldWarning>
          Ce téléphone existe aussi sur une autre fiche.
        </DuplicateFieldWarning>
      )}
    </div>
    {canUpdate && (
      <ChildActions label="ce téléphone" onDelete={onDelete} onEdit={onEdit} />
    )}
  </li>
);

const SocialRow: FC<{
  canUpdate: boolean;
  canViewAudit: boolean;
  canViewHistory: boolean;
  duplicateFieldKeys: string[];
  item: PersonSocialProfileItem;
  onDelete: () => void;
  onEdit: () => void;
  personId: string;
}> = ({
  canUpdate,
  canViewAudit,
  canViewHistory,
  duplicateFieldKeys,
  item,
  onDelete,
  onEdit,
  personId,
}) => {
  const network = getPersonSocialNetwork(item.networkKey);
  const visibleValue = item.identifier ?? item.profileUrl ?? 'Profil';
  const fieldKey = item.identifier ? 'identifier' : 'profileUrl';

  return (
    <li className="border-border-divider flex min-w-0 items-center gap-3 border-b py-3 last:border-0">
      <Network className="text-muted-foreground size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1">
          {item.profileUrl ? (
            <a
              className="hover:text-primary-emphasis flex min-w-0 items-center gap-1 truncate text-sm font-medium hover:underline"
              href={item.profileUrl}
              rel="noreferrer"
              target="_blank"
            >
              <span className="truncate">{visibleValue}</span>
              <ExternalLink className="size-3 shrink-0" />
            </a>
          ) : (
            <span className="truncate text-sm font-medium">{visibleValue}</span>
          )}
          {canViewHistory && (
            <PersonFieldHistoryPopover
              canViewAudit={canViewAudit}
              fieldKey={fieldKey}
              label={`Profil ${network?.label ?? item.networkKey}`}
              personId={personId}
              recordId={item.id}
              revision={item.version}
              sectionKey={PERSON_AUDIT_KEYS.sections.social}
            />
          )}
        </div>
        <div className="mt-1 flex flex-wrap gap-1.5">
          <Badge>{network?.label ?? item.networkKey}</Badge>
          <ItemBadges isPrimary={item.isPrimary} label={item.label} />
        </div>
        {duplicateFieldKeys.length > 0 && (
          <DuplicateFieldWarning>
            {duplicateFieldKeys.length > 1
              ? "L'identifiant et l'URL existent aussi sur une autre fiche."
              : duplicateFieldKeys[0] === 'identifier'
                ? "L'identifiant existe aussi sur une autre fiche."
                : "L'URL existe aussi sur une autre fiche."}
          </DuplicateFieldWarning>
        )}
      </div>
      {canUpdate && (
        <ChildActions label="ce profil" onDelete={onDelete} onEdit={onEdit} />
      )}
    </li>
  );
};

export const PersonCollectionsSection: FC<PersonCollectionsSectionProps> = ({
  canUpdate,
  canViewAudit,
  canViewHistory,
  duplicateMatches,
  onChange,
  onReload,
  person,
}) => {
  const [conflict, setConflict] = useState(false);
  const [deleteState, setDeleteState] = useState<DeleteState>(null);
  const [editor, setEditor] = useState<EditorState>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [replacementId, setReplacementId] = useState('');
  const [showOtherContacts, setShowOtherContacts] = useState(false);
  const [showOtherSocials, setShowOtherSocials] = useState(false);
  const [version, setVersion] = useState(person.version);
  const addEmailRef = useRef<HTMLButtonElement>(null);
  const addPhoneRef = useRef<HTMLButtonElement>(null);
  const addSocialRef = useRef<HTMLButtonElement>(null);

  const emails = showOtherContacts
    ? person.emails
    : person.emails.filter((item) => item.isPrimary);
  const phones = showOtherContacts
    ? person.phones
    : person.phones.filter((item) => item.isPrimary);
  const socials = showOtherSocials
    ? person.socialProfiles
    : person.socialProfiles.filter((item) => item.isPrimary);
  const secondaryContactCount =
    person.emails.filter((item) => !item.isPrimary).length +
    person.phones.filter((item) => !item.isPrimary).length;
  const secondarySocialCount = person.socialProfiles.filter(
    (item) => !item.isPrimary,
  ).length;

  const alternatives = ((): ChildItem[] => {
    if (!deleteState?.item.isPrimary) return [];
    if (deleteState.kind === 'email') {
      return person.emails.filter((item) => item.id !== deleteState.item.id);
    }
    if (deleteState.kind === 'phone') {
      return person.phones.filter((item) => item.id !== deleteState.item.id);
    }
    const social = deleteState.item as PersonSocialProfileItem;

    return person.socialProfiles.filter(
      (item) => item.id !== social.id && item.networkKey === social.networkKey,
    );
  })();
  const requiresReplacement = Boolean(
    deleteState?.item.isPrimary && alternatives.length > 0,
  );

  const openDelete = (kind: ChildKind, item: ChildItem): void => {
    setDeleteState({ item, kind });
    setReplacementId('');
    setConflict(false);
    setVersion(person.version);
  };

  const handleDelete = async (): Promise<void> => {
    if (!deleteState || (requiresReplacement && !replacementId)) return;
    const deletedKind = deleteState.kind;
    setIsDeleting(true);
    setConflict(false);
    try {
      const kind =
        deleteState.kind === 'email'
          ? 'emails'
          : deleteState.kind === 'phone'
            ? 'telephones'
            : 'reseaux-sociaux';
      const result = await mutatePersonChild({
        childId: deleteState.item.id,
        kind,
        method: 'DELETE',
        payload: {
          personVersion: version,
          replacementPrimaryId: replacementId || null,
          version: deleteState.item.version,
        },
        personId: person.id,
      });
      onChange(result.person);
      setDeleteState(null);
      toast.success('Information supprimée');
      requestAnimationFrame(() => {
        const target =
          deletedKind === 'email'
            ? addEmailRef.current
            : deletedKind === 'phone'
              ? addPhoneRef.current
              : addSocialRef.current;
        target?.focus();
      });
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

  const refreshDeleteVersion = async (): Promise<void> => {
    const fresh = await onReload();
    setVersion(fresh.version);
    setConflict(false);
    toast.info('Version actualisée');
  };

  return (
    <>
      <section className="p-4 sm:p-5">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="border-primary/30 bg-primary/10 text-primary-emphasis flex size-9 items-center justify-center rounded-lg border">
              <AtSign className="size-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold">Coordonnées</h2>
              <p className="text-muted-foreground text-xs">
                Emails et téléphones utiles.
              </p>
            </div>
          </div>
          {canUpdate && (
            <div className="flex flex-wrap gap-2">
              <Button
                ref={addEmailRef}
                disabled={person.emails.length >= PERSON_LIMITS.emails}
                onClick={() => setEditor({ item: null, kind: 'email' })}
                size="sm"
                type="button"
                variant="outline"
              >
                <Plus className="size-4" />
                Email
              </Button>
              <Button
                ref={addPhoneRef}
                disabled={person.phones.length >= PERSON_LIMITS.phones}
                onClick={() => setEditor({ item: null, kind: 'phone' })}
                size="sm"
                type="button"
                variant="outline"
              >
                <Plus className="size-4" />
                Téléphone
              </Button>
            </div>
          )}
        </div>
        {person.emails.length === 0 && person.phones.length === 0 ? (
          <EmptyCollection>Aucune coordonnée renseignée.</EmptyCollection>
        ) : (
          <div className="grid gap-x-6 lg:grid-cols-2">
            <div>
              <h3 className="text-muted-foreground mt-2 text-xs font-semibold uppercase">
                Emails
              </h3>
              {person.emails.length ? (
                <ul>
                  {emails.map((item) => (
                    <EmailRow
                      canUpdate={canUpdate}
                      canViewAudit={canViewAudit}
                      canViewHistory={canViewHistory}
                      duplicateWarning={duplicateMatches.some(
                        (match) =>
                          match.recordId === item.id &&
                          match.fieldKey === 'email',
                      )}
                      item={item}
                      key={item.id}
                      onDelete={() => openDelete('email', item)}
                      onEdit={() => setEditor({ item, kind: 'email' })}
                      personId={person.id}
                    />
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground py-3 text-sm">
                  Aucun email.
                </p>
              )}
            </div>
            <div>
              <h3 className="text-muted-foreground mt-2 text-xs font-semibold uppercase">
                Téléphones
              </h3>
              {person.phones.length ? (
                <ul>
                  {phones.map((item) => (
                    <PhoneRow
                      canUpdate={canUpdate}
                      canViewAudit={canViewAudit}
                      canViewHistory={canViewHistory}
                      duplicateWarning={duplicateMatches.some(
                        (match) =>
                          match.recordId === item.id &&
                          match.fieldKey === 'phone',
                      )}
                      item={item}
                      key={item.id}
                      onDelete={() => openDelete('phone', item)}
                      onEdit={() => setEditor({ item, kind: 'phone' })}
                      personId={person.id}
                    />
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground py-3 text-sm">
                  Aucun téléphone.
                </p>
              )}
            </div>
          </div>
        )}
        {secondaryContactCount > 0 && (
          <Button
            className="mt-3"
            onClick={() => setShowOtherContacts((value) => !value)}
            size="sm"
            type="button"
            variant="ghost"
          >
            {showOtherContacts ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
            {showOtherContacts
              ? 'Masquer les autres'
              : `Voir les autres (${secondaryContactCount})`}
          </Button>
        )}
      </section>

      <section className="border-border-divider border-t p-4 sm:p-5">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="border-primary/30 bg-primary/10 text-primary-emphasis flex size-9 items-center justify-center rounded-lg border">
              <Network className="size-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold">Réseaux sociaux</h2>
              <p className="text-muted-foreground text-xs">
                Profils publics utiles à la structure.
              </p>
            </div>
          </div>
          {canUpdate && (
            <Button
              ref={addSocialRef}
              disabled={
                person.socialProfiles.length >= PERSON_LIMITS.socialProfiles
              }
              onClick={() => setEditor({ item: null, kind: 'social' })}
              size="sm"
              type="button"
              variant="outline"
            >
              <Plus className="size-4" />
              Ajouter
            </Button>
          )}
        </div>
        {person.socialProfiles.length === 0 ? (
          <EmptyCollection>Aucun profil social renseigné.</EmptyCollection>
        ) : (
          <ul>
            {socials.map((item) => (
              <SocialRow
                canUpdate={canUpdate}
                canViewAudit={canViewAudit}
                canViewHistory={canViewHistory}
                duplicateFieldKeys={duplicateMatches
                  .filter(
                    (match) =>
                      match.recordId === item.id &&
                      (match.fieldKey === 'identifier' ||
                        match.fieldKey === 'profileUrl'),
                  )
                  .map((match) => match.fieldKey)}
                item={item}
                key={item.id}
                onDelete={() => openDelete('social', item)}
                onEdit={() => setEditor({ item, kind: 'social' })}
                personId={person.id}
              />
            ))}
          </ul>
        )}
        {secondarySocialCount > 0 && (
          <Button
            className="mt-3"
            onClick={() => setShowOtherSocials((value) => !value)}
            size="sm"
            type="button"
            variant="ghost"
          >
            {showOtherSocials ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
            {showOtherSocials
              ? 'Masquer les autres'
              : `Voir les autres (${secondarySocialCount})`}
          </Button>
        )}
      </section>

      {editor && (
        <PersonChildDialog
          defaultPrimary={
            editor.kind === 'email'
              ? person.emails.length === 0
              : editor.kind === 'phone'
                ? person.phones.length === 0
                : true
          }
          item={editor.item}
          kind={editor.kind}
          onOpenChange={(open) => {
            if (!open) setEditor(null);
          }}
          onPersonChange={onChange}
          onReload={onReload}
          open
          person={person}
        />
      )}

      <AlertDialog
        open={Boolean(deleteState)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeleteState(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette information ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette suppression est immédiate et sera enregistrée dans le
              journal d&apos;activité.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {requiresReplacement && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Choisissez le nouveau principal avant de continuer.
              </p>
              <Select onValueChange={setReplacementId} value={replacementId}>
                <SelectTrigger aria-label="Nouveau principal">
                  <SelectValue placeholder="Sélectionner…" />
                </SelectTrigger>
                <SelectContent>
                  {alternatives.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {'email' in item
                        ? item.email
                        : 'phone' in item
                          ? item.phone
                          : ((item as PersonSocialProfileItem).identifier ??
                            'Profil social')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {conflict && (
            <ContentState
              action={
                <Button
                  onClick={() => void refreshDeleteVersion()}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <RotateCcw className="size-4" />
                  Actualiser
                </Button>
              }
              description="La fiche a changé. Actualisez sa version avant de réessayer."
              kind="warning"
              title="Modification concurrente"
            />
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <Button
              disabled={isDeleting || (requiresReplacement && !replacementId)}
              onClick={() => void handleDelete()}
              type="button"
              variant="destructive"
            >
              Supprimer
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
