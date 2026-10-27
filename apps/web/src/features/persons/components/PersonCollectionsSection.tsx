'use client';

import { parsePhoneNumberFromString } from 'libphonenumber-js';
import {
  Copy,
  ExternalLink,
  Mail,
  Network,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
} from 'lucide-react';
import React, { type FC, useEffect, useRef, useState } from 'react';
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
import { ServiceIcon } from '$ui/service-icon';
import { ApiClientError } from '$utils/api.utils';

import { mutatePersonChild } from '../person.api';
import { getPersonSocialNetwork, PERSON_LIMITS } from '../person.constants';
import type {
  PersonDetail,
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
  available?: boolean;
  canUpdate: boolean;
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

const ItemMetadata: FC<{ isPrimary: boolean; parts: string[] }> = ({
  isPrimary,
  parts,
}) => (
  <p className="text-muted-foreground mt-0.5 text-xs break-words">
    {parts.join(' · ')}
    {isPrimary && (
      <>
        <span aria-hidden="true"> · </span>
        <span className="text-success">Principal</span>
      </>
    )}
  </p>
);

/** One contact collection (27 October 2026): title, count and add action. */
const CollectionCard: FC<{
  addAction?: React.ReactNode;
  children: React.ReactNode;
  count: number;
  icon: React.ReactNode;
  title: string;
}> = ({ addAction, children, count, icon, title }) => (
  <Card>
    <CardHeader className="flex-row items-center justify-between gap-3 p-3.5 sm:p-4">
      <div className="flex min-w-0 items-center gap-2">
        <ServiceIcon className="border-primary/30 bg-primary/10 text-primary-emphasis size-7 [&_svg]:size-3.5">
          {icon}
        </ServiceIcon>
        <h2 className="text-sm font-semibold">{title}</h2>
        <Badge variant="outline">{count}</Badge>
      </div>
      {addAction}
    </CardHeader>
    <CardContent className="p-3 sm:p-4">{children}</CardContent>
  </Card>
);

/** « +33 6 12 34 56 78 »: readable number, the stored value is unchanged. */
const formatPhoneForDisplay = (phone: string): string =>
  parsePhoneNumberFromString(phone)?.formatInternational() ?? phone;

/** The value a person reads for an item: address, number or profile. */
const getChildItemDisplay = (item: ChildItem): string =>
  'email' in item
    ? item.email
    : 'phone' in item
      ? formatPhoneForDisplay(item.phone)
      : ((item as PersonSocialProfileItem).identifier ??
        (item as PersonSocialProfileItem).profileUrl ??
        'Profil');

const RowTypeIcon: FC<{ children: React.ReactNode }> = ({ children }) => (
  <span
    aria-hidden="true"
    className="text-muted-foreground shrink-0 [&_svg]:size-4"
  >
    {children}
  </span>
);

const EmptyCollection: FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-muted-foreground border-border-divider rounded-lg border border-dashed px-3 py-4 text-center text-sm">
    {children}
  </p>
);

const EmailRow: FC<{
  canUpdate: boolean;
  item: PersonEmailItem;
  onEdit: () => void;
}> = ({ canUpdate, item, onEdit }) => (
  <li className="border-border-divider flex min-w-0 items-center gap-2 border-b py-2.5 last:border-0">
    <RowTypeIcon>
      <Mail />
    </RowTypeIcon>
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
    </div>
    <div className="flex shrink-0 items-center gap-1">
      {canUpdate && <EditAction label="cet email" onEdit={onEdit} />}
      <CopyAction label="Email" value={item.email} />
    </div>
  </li>
);

const PhoneRow: FC<{
  canUpdate: boolean;
  item: PersonPhoneItem;
  onEdit: () => void;
}> = ({ canUpdate, item, onEdit }) => (
  <li className="border-border-divider flex min-w-0 items-center gap-2 border-b py-2.5 last:border-0">
    <RowTypeIcon>
      <Phone />
    </RowTypeIcon>
    <div className="min-w-0 flex-1">
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <a
          className="hover:text-primary-emphasis max-w-full truncate text-sm font-medium tabular-nums hover:underline"
          href={`tel:${item.phone}`}
        >
          {formatPhoneForDisplay(item.phone)}
        </a>
      </div>
      <ItemMetadata isPrimary={item.isPrimary} parts={[item.label]} />
    </div>
    <div className="flex shrink-0 items-center gap-1">
      {canUpdate && <EditAction label="ce téléphone" onEdit={onEdit} />}
      <CopyAction label="Numéro" value={item.phone} />
    </div>
  </li>
);

const SocialRow: FC<{
  canUpdate: boolean;
  item: PersonSocialProfileItem;
  onEdit: () => void;
}> = ({ canUpdate, item, onEdit }) => {
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
      </div>
      <div className="flex shrink-0 items-center gap-1">
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

const PersonCollectionsContent: FC<PersonCollectionsSectionProps> = ({
  available = true,
  canUpdate,
  onChange,
  onReload,
  person,
}) => {
  const [conflict, setConflict] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const operationRef = useRef(false);
  const requestRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;

    return (): void => {
      mountedRef.current = false;
      requestRef.current?.abort();
    };
  }, []);
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
    setDeleteError(null);
    setDeleteState({ item, kind });
    setReplacementId('');
    setConflict(false);
    setVersion(person.version);
  };

  const handleDelete = async (): Promise<void> => {
    if (
      !available ||
      !canUpdate ||
      operationRef.current ||
      !mountedRef.current ||
      conflict
    )
      return;
    if (!deleteState || (requiresReplacement && !replacementId)) return;
    operationRef.current = true;
    setDeleteError(null);
    const deletedKind = deleteState.kind;
    setIsDeleting(true);
    setConflict(false);
    const controller = new AbortController();
    requestRef.current = controller;
    const timer = window.setTimeout(() => controller.abort(), 30_000);
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
        signal: controller.signal,
      });
      if (!mountedRef.current) return;
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
      if (!mountedRef.current) return;
      if (caught instanceof ApiClientError && caught.status === 409) {
        setConflict(true);
      } else if (
        !(caught instanceof ApiClientError) ||
        caught.status >= 500 ||
        caught.code === 'INVALID_RESPONSE'
      ) {
        setConflict(true);
        setDeleteError(
          'Le résultat de la suppression n’a pas pu être confirmé. Actualisez la fiche pour vérifier cette information avant de réessayer.',
        );
      } else {
        if ([401, 403, 404, 410].includes(caught.status))
          void onReload().catch(() => {});
        setDeleteError(
          caught instanceof Error ? caught.message : 'Suppression impossible',
        );
      }
    } finally {
      window.clearTimeout(timer);
      if (requestRef.current === controller) requestRef.current = null;
      operationRef.current = false;
      if (mountedRef.current) setIsDeleting(false);
    }
  };

  const refreshDeleteVersion = async (): Promise<void> => {
    if (!deleteState || operationRef.current || !mountedRef.current) return;
    operationRef.current = true;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const fresh = await onReload();
      if (!mountedRef.current) return;
      const collection =
        deleteState.kind === 'email'
          ? fresh.emails
          : deleteState.kind === 'phone'
            ? fresh.phones
            : fresh.socialProfiles;
      const freshItem = collection.find(
        (item) => item.id === deleteState.item.id,
      );
      if (!freshItem) {
        setDeleteState(null);
        setEditor(null);
        toast.info('Cette information a déjà été supprimée');

        return;
      }
      setDeleteState({ item: freshItem, kind: deleteState.kind });
      setReplacementId('');
      setVersion(fresh.version);
      setConflict(false);
      toast.info(
        'Version actualisée ; vérifiez le remplacement avant de confirmer',
      );
    } catch {
      if (mountedRef.current)
        setDeleteError(
          'Actualisation impossible. Réessayez avant de supprimer.',
        );
    } finally {
      operationRef.current = false;
      if (mountedRef.current) setIsDeleting(false);
    }
  };

  return (
    <>
      {/* One column, like the other record tabs (27 October 2026). */}
      <div className="space-y-3">
        <CollectionCard
          addAction={
            canUpdate ? (
              <Button
                ref={addEmailRef}
                aria-label="Ajouter un email"
                disabled={
                  !available || person.emails.length >= PERSON_LIMITS.emails
                }
                onClick={() => setEditor({ item: null, kind: 'email' })}
                size="sm"
                type="button"
                variant="outline"
              >
                <Plus className="size-4" />
                Ajouter
              </Button>
            ) : undefined
          }
          count={person.emails.length}
          icon={<Mail />}
          title="Emails"
        >
          {person.emails.length === 0 ? (
            <EmptyCollection>Aucun email renseigné.</EmptyCollection>
          ) : (
            <ul>
              {person.emails.map((item) => (
                <EmailRow
                  canUpdate={canUpdate}
                  item={item}
                  key={item.id}
                  onEdit={() => setEditor({ item, kind: 'email' })}
                />
              ))}
            </ul>
          )}
        </CollectionCard>

        <CollectionCard
          addAction={
            canUpdate ? (
              <Button
                ref={addPhoneRef}
                aria-label="Ajouter un téléphone"
                disabled={
                  !available || person.phones.length >= PERSON_LIMITS.phones
                }
                onClick={() => setEditor({ item: null, kind: 'phone' })}
                size="sm"
                type="button"
                variant="outline"
              >
                <Plus className="size-4" />
                Ajouter
              </Button>
            ) : undefined
          }
          count={person.phones.length}
          icon={<Phone />}
          title="Téléphones"
        >
          {person.phones.length === 0 ? (
            <EmptyCollection>Aucun téléphone renseigné.</EmptyCollection>
          ) : (
            <ul>
              {person.phones.map((item) => (
                <PhoneRow
                  canUpdate={canUpdate}
                  item={item}
                  key={item.id}
                  onEdit={() => setEditor({ item, kind: 'phone' })}
                />
              ))}
            </ul>
          )}
        </CollectionCard>

        <CollectionCard
          addAction={
            canUpdate ? (
              <Button
                ref={addSocialRef}
                aria-label="Ajouter un profil social"
                disabled={
                  !available ||
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
            ) : undefined
          }
          count={person.socialProfiles.length}
          icon={<Network />}
          title="Réseaux sociaux"
        >
          {person.socialProfiles.length === 0 ? (
            <EmptyCollection>Aucun profil social renseigné.</EmptyCollection>
          ) : (
            <ul>
              {person.socialProfiles.map((item) => (
                <SocialRow
                  canUpdate={canUpdate}
                  item={item}
                  key={item.id}
                  onEdit={() => setEditor({ item, kind: 'social' })}
                />
              ))}
            </ul>
          )}
        </CollectionCard>
      </div>

      {editor && (
        <PersonChildDialog
          available={available}
          canEdit={canUpdate}
          defaultPrimary={
            editor.kind === 'email'
              ? person.emails.length === 0
              : editor.kind === 'phone'
                ? person.phones.length === 0
                : !person.socialProfiles.some(
                    (profile) => profile.networkKey === 'discord',
                  )
          }
          item={editor.item}
          kind={editor.kind}
          onDelete={() => {
            if (!editor.item) return;
            const collection =
              editor.kind === 'email'
                ? person.emails
                : editor.kind === 'phone'
                  ? person.phones
                  : person.socialProfiles;
            const current = collection.find(
              (item) => item.id === editor.item?.id,
            );
            if (current) openDelete(editor.kind, current);
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
          if (!open && !operationRef.current) setDeleteState(null);
        }}
      >
        <AlertDialogContent
          aria-busy={isDeleting || undefined}
          className={requiresReplacement ? 'sm:max-w-lg' : 'sm:max-w-md'}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="break-words">
              {deleteState
                ? `Supprimer ${getChildItemDisplay(deleteState.item)} ?`
                : 'Supprimer ?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cette suppression est immédiate et sera enregistrée dans le
              journal d&apos;activité.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p role="alert" className="text-destructive text-sm">
              {deleteError}
            </p>
          )}
          {requiresReplacement && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Choisissez le nouveau principal avant de continuer.
              </p>
              <Select
                disabled={isDeleting}
                onValueChange={setReplacementId}
                value={replacementId}
              >
                <SelectTrigger
                  aria-label="Nouveau principal"
                  className="w-full min-w-0"
                >
                  <SelectValue placeholder="Sélectionner…" />
                </SelectTrigger>
                <SelectContent>
                  {alternatives.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {getChildItemDisplay(item)}
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
                  disabled={isDeleting}
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
              disabled={
                !available ||
                isDeleting ||
                conflict ||
                (requiresReplacement && !replacementId)
              }
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

export const PersonCollectionsSection: FC<PersonCollectionsSectionProps> = (
  props,
) => (
  <PersonCollectionsContent
    key={`${props.person.id}:${props.canUpdate}`}
    {...props}
  />
);
