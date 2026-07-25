'use client';

import {
  ChevronDown,
  Copy,
  Mail,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';
import React, { type FC, useState } from 'react';
import { toast } from 'sonner';

import { ContentState } from '$components/layout/ContentState';
import { PersonAvatar } from '$features/persons/components/PersonAvatar';
import { Badge } from '$ui/badge';
import { Button } from '$ui/button';
import { Card, CardContent, CardHeader } from '$ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '$ui/collapsible';

import { PARTNER_LIMITS } from '../partner.constants';
import { formatPartnerCivilDate } from '../partner-timeline.ui';
import type {
  PartnerContact,
  PartnerContactPerson,
  PartnerDetail,
} from '../types/partner.types';
import { PartnerContactEditDialogs } from './PartnerContactEditDialogs';
import { PartnerInterlocutorCreateDialog } from './PartnerInterlocutorCreateDialog';

type LinkedPersonAvatar = {
  firstName: null;
  id: string;
  lastName: string;
  nickname: null;
};

const getLinkedPersonAvatar = (
  person: PartnerContactPerson,
): LinkedPersonAvatar => ({
  firstName: null,
  id: person.id,
  lastName: person.displayName,
  nickname: null,
});

const getContactDatesLabel = (contact: PartnerContact): string => {
  if (contact.closedAt) {
    if (contact.startedOn && contact.endedOn) {
      return `Du ${formatPartnerCivilDate(contact.startedOn)} au ${formatPartnerCivilDate(contact.endedOn)}`;
    }
    if (contact.startedOn) {
      return `Début le ${formatPartnerCivilDate(contact.startedOn)} · date de fin non renseignée`;
    }
    if (contact.endedOn) {
      return `Début non renseigné · fin le ${formatPartnerCivilDate(contact.endedOn)}`;
    }

    return 'Dates de la liaison non renseignées';
  }

  return contact.startedOn
    ? `Lié depuis le ${formatPartnerCivilDate(contact.startedOn)}`
    : 'Date de début non renseignée';
};

const copyValue = async (label: string, value: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copié`);
  } catch {
    toast.error('Copie impossible');
  }
};

const ContactIdentity: FC<{ contact: PartnerContact }> = ({ contact }) => {
  if (!contact.person) {
    return (
      <div className="flex min-w-0 items-center gap-3">
        <span className="bg-surface-inset text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-full">
          <UserRound className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-muted-foreground truncate font-medium">
            Interlocuteur supprimé
          </p>
          <p className="text-muted-foreground truncate text-sm">
            Liaison anonymisée
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-3">
      <PersonAvatar
        className="size-10 shrink-0 rounded-full"
        person={getLinkedPersonAvatar(contact.person)}
      />
      <div className="min-w-0">
        <Link
          className="block truncate font-medium hover:underline"
          href={`/vie-interne/repertoire/${encodeURIComponent(contact.person.id)}`}
          rel="noreferrer"
          target="_blank"
        >
          {contact.person.displayName}
        </Link>
        <p className="text-muted-foreground truncate text-sm">
          {contact.label}
        </p>
      </div>
    </div>
  );
};

const PreferredCoordinate: FC<{
  href: string;
  icon: typeof Mail;
  label: string;
  metadata: string;
  value: string;
}> = ({ href, icon: Icon, label, metadata, value }) => (
  <div className="flex min-w-0 items-center gap-2">
    <Icon
      aria-hidden="true"
      className="text-muted-foreground size-3.5 shrink-0"
    />
    <div className="min-w-0 flex-1">
      <a
        className="hover:text-primary-emphasis block truncate text-sm hover:underline"
        href={href}
      >
        {value}
      </a>
      <p className="text-muted-foreground truncate text-xs">{metadata}</p>
    </div>
    <Button
      aria-label={`Copier ${label.toLowerCase()}`}
      onClick={() => void copyValue(label, value)}
      size="icon"
      type="button"
      variant="ghost"
    >
      <Copy className="size-3.5" />
    </Button>
  </div>
);

const ActiveInterlocutor: FC<{
  canManage: boolean;
  contact: PartnerContact;
  onEdit: () => void;
}> = ({ canManage, contact, onEdit }) => (
  <div className="rounded-lg border p-3">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-2">
        <ContactIdentity contact={contact} />
        <div className="flex flex-wrap items-center gap-2 sm:pl-13">
          {contact.isPrimary && <Badge variant="success">Principal</Badge>}
          <span className="text-muted-foreground text-xs">
            {getContactDatesLabel(contact)}
          </span>
        </div>
      </div>
      {canManage && contact.person && (
        <Button
          aria-label={`Modifier la liaison de ${contact.person.displayName}`}
          onClick={onEdit}
          size="sm"
          type="button"
          variant="outline"
        >
          <Pencil className="size-3.5" />
          Modifier
        </Button>
      )}
    </div>
    {contact.person && (
      <div className="border-border-divider mt-3 grid gap-2 border-t pt-3 sm:ml-13 sm:grid-cols-2">
        {contact.selectedEmail && (
          <PreferredCoordinate
            href={`mailto:${contact.selectedEmail.email}`}
            icon={Mail}
            label="Email"
            metadata={`${contact.selectedEmail.label} · Email à utiliser`}
            value={contact.selectedEmail.email}
          />
        )}
        {contact.selectedPhone && (
          <PreferredCoordinate
            href={`tel:${contact.selectedPhone.phone}`}
            icon={Phone}
            label="Numéro"
            metadata={`${contact.selectedPhone.label} · Téléphone à utiliser`}
            value={contact.selectedPhone.phone}
          />
        )}
        {!contact.selectedEmail && !contact.selectedPhone && (
          <p className="text-muted-foreground text-sm sm:col-span-2">
            Aucune coordonnée privilégiée.
          </p>
        )}
      </div>
    )}
  </div>
);

export const PartnerInterlocutorsSection: FC<{
  canManage: boolean;
  canUpdatePersons: boolean;
  canViewInterlocutors: boolean;
  onChange: (partner: PartnerDetail) => void;
  partner: PartnerDetail;
}> = ({
  canManage,
  canUpdatePersons,
  canViewInterlocutors,
  onChange,
  partner,
}) => {
  const activeContacts = partner.contacts.filter(
    (contact) => !contact.closedAt,
  );
  const formerContacts = partner.contacts.filter((contact) => contact.closedAt);
  const activePersonIds = new Set(
    activeContacts.flatMap((contact) =>
      contact.person ? [contact.person.id] : [],
    ),
  );
  const contactLimitReached = activeContacts.length >= PARTNER_LIMITS.contacts;
  const [createContext, setCreateContext] = useState<{
    initialPerson: PartnerContactPerson | null;
    mode: 'add' | 'relink';
  } | null>(null);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const editingContact = editingContactId
    ? (activeContacts.find(
        (contact) => contact.id === editingContactId && contact.person,
      ) ?? null)
    : null;

  if (!canViewInterlocutors) {
    return (
      <Card>
        <CardHeader>
          <h2 className="font-semibold">Interlocuteurs</h2>
          <p className="text-muted-foreground text-sm">
            Personnes du Répertoire liées à cette organisation.
          </p>
        </CardHeader>
        <CardContent>
          <ContentState
            description="La permission de consulter le Répertoire est nécessaire pour afficher ou associer des interlocuteurs."
            title="Répertoire non accessible"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold">Interlocuteurs</h2>
              <Badge variant="secondary">
                {activeContacts.length} actif
                {activeContacts.length === 1 ? '' : 's'}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              Personnes du Répertoire à contacter pour cette organisation.
            </p>
          </div>
          {canManage && (
            <Button
              aria-label={
                contactLimitReached
                  ? `Limite de ${PARTNER_LIMITS.contacts} interlocuteurs actifs atteinte`
                  : undefined
              }
              disabled={contactLimitReached}
              onClick={() =>
                setCreateContext({ initialPerson: null, mode: 'add' })
              }
              size="sm"
              title={
                contactLimitReached
                  ? `Limite de ${PARTNER_LIMITS.contacts} interlocuteurs actifs atteinte`
                  : undefined
              }
              type="button"
            >
              <Plus className="size-4" />
              {contactLimitReached
                ? 'Limite atteinte'
                : 'Lier un interlocuteur'}
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {activeContacts.length === 0 ? (
            <div className="border-border-default rounded-lg border border-dashed p-4 text-sm">
              <p className="font-medium">Aucun interlocuteur actif</p>
              <p className="text-muted-foreground mt-1">
                Liez une fiche du Répertoire pour identifier une personne à
                contacter.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeContacts.map((contact) => (
                <ActiveInterlocutor
                  canManage={canManage}
                  contact={contact}
                  key={contact.id}
                  onEdit={() => setEditingContactId(contact.id)}
                />
              ))}
            </div>
          )}

          {formerContacts.length > 0 && (
            <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  aria-expanded={historyOpen}
                  className="w-full justify-between"
                  type="button"
                  variant="ghost"
                >
                  <span>Anciens interlocuteurs ({formerContacts.length})</span>
                  <ChevronDown
                    className={`size-4 transition-transform ${historyOpen ? 'rotate-180' : ''}`}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pt-2">
                {formerContacts.map((contact) => {
                  const linkedPerson = contact.person;
                  const alreadyActive = linkedPerson
                    ? activePersonIds.has(linkedPerson.id)
                    : false;

                  return (
                    <div
                      className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                      key={contact.id}
                    >
                      <div className="min-w-0 space-y-2">
                        <ContactIdentity contact={contact} />
                        <p className="text-muted-foreground text-xs sm:pl-13">
                          {getContactDatesLabel(contact)}
                        </p>
                      </div>
                      {canManage && linkedPerson && (
                        <Button
                          aria-label={
                            alreadyActive
                              ? `${linkedPerson.displayName} possède déjà une liaison active`
                              : contactLimitReached
                                ? `Impossible de relier ${linkedPerson.displayName} : limite atteinte`
                                : `Relier de nouveau ${linkedPerson.displayName}`
                          }
                          disabled={alreadyActive || contactLimitReached}
                          onClick={() =>
                            setCreateContext({
                              initialPerson: linkedPerson,
                              mode: 'relink',
                            })
                          }
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <RotateCcw className="size-3.5" />
                          {alreadyActive
                            ? 'Déjà lié'
                            : contactLimitReached
                              ? 'Limite atteinte'
                              : 'Relier de nouveau'}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>

      {createContext && (
        <PartnerInterlocutorCreateDialog
          activePersonIds={activePersonIds}
          canUpdatePersons={canUpdatePersons}
          contactLimitReached={contactLimitReached}
          initialPerson={createContext.initialPerson}
          key={`${createContext.mode}-${createContext.initialPerson?.id ?? 'new'}`}
          mode={createContext.mode}
          onChange={onChange}
          onClose={() => setCreateContext(null)}
          partner={partner}
        />
      )}

      {editingContact && (
        <PartnerContactEditDialogs
          canUpdatePersons={canUpdatePersons}
          contact={editingContact}
          key={editingContact.id}
          onChange={onChange}
          onClose={() => setEditingContactId(null)}
          partner={partner}
        />
      )}
    </>
  );
};
