'use client';

import {
  AlertTriangle,
  Copy,
  ExternalLink,
  History,
  Mail,
  Network,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
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
import { Card, CardContent, CardHeader } from '$ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '$ui/select';
import { ApiClientError } from '$utils/api.utils';

import { mutatePersonChild } from '../person.api';
import { getPersonSocialNetwork, PERSON_LIMITS } from '../person.constants';
import type {
  PersonDetail,
  PersonDuplicateWarning,
  PersonEmailItem,
  PersonPhoneItem,
  PersonSocialProfileItem,
} from '../types/person.types';
import { PersonChildDialog } from './PersonChildDialog';
import { PersonSocialNetworkIcon } from './PersonSocialNetworkIcon';

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

const EditAction: FC<{
  label: string;
  onEdit: () => void;
}> = ({ label, onEdit }) => (
  <Button
    aria-label={`Modifier ${label}`}
    onClick={onEdit}
    size="icon"
    type="button"
    variant="ghost"
  >
    <Pencil className="size-3.5" />
  </Button>
);

const CopyAction: FC<{ label: string; value: string }> = ({ label, value }) => {
  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copié`);
    } catch {
      toast.error('Copie impossible');
    }
  };

  return (
    <Button
      aria-label={`Copier ${label.toLowerCase()}`}
      onClick={() => void handleCopy()}
      size="icon"
      type="button"
      variant="ghost"
    >
      <Copy className="size-3.5" />
    </Button>
  );
};

const HistoryOnlyAction: FC<{ label: string; onOpen: () => void }> = ({
  label,
  onOpen,
}) => (
  <Button
    aria-label={`Consulter ${label} et son historique`}
    onClick={onOpen}
    size="icon"
    type="button"
    variant="ghost"
  >
    <History className="size-3.5" />
  </Button>
);

const ItemMetadata: FC<{ isPrimary: boolean; parts: string[] }> = ({
  isPrimary,
  parts,
}) => (
  <p className="text-muted-foreground mt-0.5 truncate text-xs">
    {parts.join(' · ')}
    {isPrimary && (
      <>
        <span aria-hidden="true"> · </span>
        <span className="text-success">Principal</span>
      </>
    )}
  </p>
);

const EmptyCollection: FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-muted-foreground border-border-divider rounded-lg border border-dashed px-3 py-4 text-center text-sm">
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
  canViewHistory: boolean;
  duplicateWarning: boolean;
  item: PersonEmailItem;
  onEdit: () => void;
}> = ({ canUpdate, canViewHistory, duplicateWarning, item, onEdit }) => (
  <li className="border-border-divider flex min-w-0 items-center gap-2 border-b py-2.5 last:border-0">
    <div className="min-w-0 flex-1">
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <a
          className="hover:text-primary-emphasis max-w-full truncate text-sm font-medium hover:underline"
          href={`mailto:${item.email}`}
        >
          {item.email}
        </a>
      </div>
      <ItemMetadata isPrimary={item.isPrimary} parts={[item.label]} />
      {duplicateWarning && (
        <DuplicateFieldWarning>
          Cet email existe aussi sur une autre fiche.
        </DuplicateFieldWarning>
      )}
    </div>
    <div className="flex shrink-0 items-center gap-1">
      {canViewHistory && !canUpdate && (
        <HistoryOnlyAction label="cet email" onOpen={onEdit} />
      )}
      {canUpdate && <EditAction label="cet email" onEdit={onEdit} />}
      <CopyAction label="Email" value={item.email} />
    </div>
  </li>
);

const PhoneRow: FC<{
  canUpdate: boolean;
  canViewHistory: boolean;
  duplicateWarning: boolean;
  item: PersonPhoneItem;
  onEdit: () => void;
}> = ({ canUpdate, canViewHistory, duplicateWarning, item, onEdit }) => (
  <li className="border-border-divider flex min-w-0 items-center gap-2 border-b py-2.5 last:border-0">
    <div className="min-w-0 flex-1">
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <a
          className="hover:text-primary-emphasis max-w-full truncate text-sm font-medium hover:underline"
          href={`tel:${item.phone}`}
        >
          {item.phone}
        </a>
      </div>
      <ItemMetadata isPrimary={item.isPrimary} parts={[item.label]} />
      {duplicateWarning && (
        <DuplicateFieldWarning>
          Ce téléphone existe aussi sur une autre fiche.
        </DuplicateFieldWarning>
      )}
    </div>
    <div className="flex shrink-0 items-center gap-1">
      {canViewHistory && !canUpdate && (
        <HistoryOnlyAction label="ce téléphone" onOpen={onEdit} />
      )}
      {canUpdate && <EditAction label="ce téléphone" onEdit={onEdit} />}
      <CopyAction label="Numéro" value={item.phone} />
    </div>
  </li>
);

const SocialRow: FC<{
  canUpdate: boolean;
  canViewHistory: boolean;
  duplicateFieldKeys: string[];
  item: PersonSocialProfileItem;
  onEdit: () => void;
}> = ({ canUpdate, canViewHistory, duplicateFieldKeys, item, onEdit }) => {
  const network = getPersonSocialNetwork(item.networkKey);
  const visibleValue = item.identifier ?? item.profileUrl ?? 'Profil';
  const copyValue = item.profileUrl ?? item.identifier;

  return (
    <li className="border-border-divider flex min-w-0 items-center gap-2 border-b py-2.5 last:border-0">
      <PersonSocialNetworkIcon
        className="text-muted-foreground size-4 shrink-0"
        networkKey={item.networkKey}
      />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
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
        </div>
        <ItemMetadata
          isPrimary={item.isPrimary}
          parts={[network?.label ?? item.networkKey, item.label]}
        />
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
      <div className="flex shrink-0 items-center gap-1">
        {canViewHistory && !canUpdate && (
          <HistoryOnlyAction label="ce profil" onOpen={onEdit} />
        )}
        {canUpdate && <EditAction label="ce profil" onEdit={onEdit} />}
        {copyValue && (
          <CopyAction
            label={item.profileUrl ? 'Lien du profil' : 'Identifiant'}
            value={copyValue}
          />
        )}
      </div>
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
  const [version, setVersion] = useState(person.version);
  const addEmailRef = useRef<HTMLButtonElement>(null);
  const addPhoneRef = useRef<HTMLButtonElement>(null);
  const addSocialRef = useRef<HTMLButtonElement>(null);

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
      setEditor(null);
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
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
        <div className="space-y-4">
          <Card>
            <CardHeader className="p-3.5 sm:p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="border-primary/30 bg-primary/10 text-primary-emphasis flex size-8 shrink-0 items-center justify-center rounded-lg border">
                    <Mail className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-semibold">Emails</h2>
                      <Badge variant="outline">{person.emails.length}</Badge>
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Adresses utiles et adresse principale.
                    </p>
                  </div>
                </div>
                {canUpdate && (
                  <Button
                    ref={addEmailRef}
                    aria-label="Ajouter un email"
                    disabled={person.emails.length >= PERSON_LIMITS.emails}
                    onClick={() => setEditor({ item: null, kind: 'email' })}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <Plus className="size-4" />
                    Ajouter
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
              {person.emails.length === 0 ? (
                <EmptyCollection>Aucun email renseigné.</EmptyCollection>
              ) : (
                <ul>
                  {person.emails.map((item) => (
                    <EmailRow
                      canUpdate={canUpdate}
                      canViewHistory={canViewHistory}
                      duplicateWarning={duplicateMatches.some(
                        (match) =>
                          match.recordId === item.id &&
                          match.fieldKey === 'email',
                      )}
                      item={item}
                      key={item.id}
                      onEdit={() => setEditor({ item, kind: 'email' })}
                    />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-3.5 sm:p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="border-primary/30 bg-primary/10 text-primary-emphasis flex size-8 shrink-0 items-center justify-center rounded-lg border">
                    <Phone className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-semibold">Téléphones</h2>
                      <Badge variant="outline">{person.phones.length}</Badge>
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Numéros utiles et numéro principal.
                    </p>
                  </div>
                </div>
                {canUpdate && (
                  <Button
                    ref={addPhoneRef}
                    aria-label="Ajouter un téléphone"
                    disabled={person.phones.length >= PERSON_LIMITS.phones}
                    onClick={() => setEditor({ item: null, kind: 'phone' })}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <Plus className="size-4" />
                    Ajouter
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
              {person.phones.length === 0 ? (
                <EmptyCollection>Aucun téléphone renseigné.</EmptyCollection>
              ) : (
                <ul>
                  {person.phones.map((item) => (
                    <PhoneRow
                      canUpdate={canUpdate}
                      canViewHistory={canViewHistory}
                      duplicateWarning={duplicateMatches.some(
                        (match) =>
                          match.recordId === item.id &&
                          match.fieldKey === 'phone',
                      )}
                      item={item}
                      key={item.id}
                      onEdit={() => setEditor({ item, kind: 'phone' })}
                    />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="p-3.5 sm:p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="border-primary/30 bg-primary/10 text-primary-emphasis flex size-8 shrink-0 items-center justify-center rounded-lg border">
                  <Network className="size-4" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold">Réseaux sociaux</h2>
                    <Badge variant="outline">
                      {person.socialProfiles.length}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Profils publics utiles à la structure.
                  </p>
                </div>
              </div>
              {canUpdate && (
                <Button
                  ref={addSocialRef}
                  aria-label="Ajouter un profil social"
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
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            {person.socialProfiles.length === 0 ? (
              <EmptyCollection>Aucun profil social renseigné.</EmptyCollection>
            ) : (
              <ul>
                {person.socialProfiles.map((item) => (
                  <SocialRow
                    canUpdate={canUpdate}
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
                    onEdit={() => setEditor({ item, kind: 'social' })}
                  />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {editor && (
        <PersonChildDialog
          canEdit={canUpdate}
          canViewAudit={canViewAudit}
          canViewHistory={canViewHistory}
          defaultPrimary={
            editor.kind === 'email'
              ? person.emails.length === 0
              : editor.kind === 'phone'
                ? person.phones.length === 0
                : true
          }
          item={editor.item}
          kind={editor.kind}
          onDelete={() => {
            if (!editor.item) return;
            openDelete(editor.kind, editor.item);
          }}
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
        <AlertDialogContent
          className={requiresReplacement ? 'sm:max-w-lg' : 'sm:max-w-md'}
        >
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
