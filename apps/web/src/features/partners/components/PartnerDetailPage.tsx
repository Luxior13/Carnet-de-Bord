'use client';

import {
  Activity,
  Building2,
  Check,
  CirclePlus,
  Handshake,
  History,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Trash2,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';
import React, {
  type FC,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { toast } from 'sonner';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { ContentState } from '$components/layout/ContentState';
import { PageBackButton } from '$components/layout/PageBackNavigation';
import { PageHero } from '$components/layout/PageHero';
import { AccessDeniedState, PageState } from '$components/layout/PageState';
import type { UserDetailSection } from '$components/users/user-detail/UserDetailNavigation';
import { UserDetailSectionRail } from '$components/users/user-detail/UserDetailSectionRail';
import { FEATURES } from '$constants/feature-registry.constants';
import { useFeatureAvailability } from '$context/FeatureAvailabilityContext';
import { useUser } from '$context/UserContext';
import { listPersons } from '$features/persons/person.api';
import { getPersonDisplayName } from '$features/persons/person.ui';
import type { PersonSummary } from '$features/persons/types/person.types';
import { Badge } from '$ui/badge';
import { Button } from '$ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '$ui/card';
import { Checkbox } from '$ui/checkbox';
import { Input } from '$ui/input';
import { Label } from '$ui/label';
import { PageCanvas, PageShell } from '$ui/page-shell';
import { Skeleton } from '$ui/skeleton';
import { Tabs, TabsContent } from '$ui/tabs';
import { Textarea } from '$ui/textarea';
import { ApiClientError } from '$utils/api.utils';

import {
  addPartnerContact,
  addPartnerFollowUp,
  deletePartner,
  getPartner,
  getPartnerActivity,
  setPartnerActionCompleted,
  updatePartner,
  updatePartnerContact,
} from '../partner.api';
import {
  PARTNER_CATEGORY_LABELS,
  PARTNER_STATUS_LABELS,
} from '../partner.constants';
import { getPartnerCapabilities } from '../partner.permissions';
import type {
  PartnerActivityItem,
  PartnerCategory,
  PartnerChannel,
  PartnerDetail,
  PartnerStatus,
} from '../types/partner.types';
import { PartnerStatusBadge } from './PartnerStatusBadge';

export type PartnerDetailSection =
  'activite' | 'contacts' | 'information' | 'suivi';

const SECTIONS: readonly UserDetailSection<PartnerDetailSection>[] = [
  {
    icon: <Building2 className="size-4" />,
    id: 'information',
    label: 'Informations',
  },
  {
    icon: <UserRound className="size-4" />,
    id: 'contacts',
    label: 'Contacts',
  },
  {
    icon: <MessageSquareText className="size-4" />,
    id: 'suivi',
    label: 'Suivi',
  },
  {
    icon: <History className="size-4" />,
    id: 'activite',
    label: 'Activité',
  },
];

const STATUS_TRANSITIONS: Record<PartnerStatus, PartnerStatus[]> = {
  ACTIVE: ['ACTIVE', 'ENDED'],
  CLOSED: ['CLOSED', 'DISCUSSION'],
  DISCUSSION: ['DISCUSSION', 'ACTIVE', 'CLOSED'],
  ENDED: ['ENDED', 'DISCUSSION'],
  PROSPECT: ['PROSPECT', 'DISCUSSION', 'CLOSED'],
};

const formatDateTime = (value: string): string =>
  new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

const DetailSkeleton: FC = () => (
  <PageShell className="py-0">
    <PageCanvas>
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="mt-3 h-[30rem] rounded-xl" />
    </PageCanvas>
  </PageShell>
);

type ChannelDraft = Pick<
  PartnerChannel,
  'isPrimary' | 'label' | 'type' | 'value'
>;

const InformationSection: FC<{
  canDelete: boolean;
  canManage: boolean;
  onChange: (partner: PartnerDetail) => void;
  partner: PartnerDetail;
  returnHref: string;
}> = ({ canDelete, canManage, onChange, partner, returnHref }) => {
  const [name, setName] = useState(partner.name);
  const [description, setDescription] = useState(partner.description ?? '');
  const [website, setWebsite] = useState(partner.website ?? '');
  const [situation, setSituation] = useState(partner.currentSituation ?? '');
  const [status, setStatus] = useState(partner.status);
  const [categories, setCategories] = useState<PartnerCategory[]>(
    partner.categories,
  );
  const [channels, setChannels] = useState<ChannelDraft[]>(
    partner.channels.map(({ isPrimary, label, type, value }) => ({
      isPrimary,
      label,
      type,
      value,
    })),
  );
  const activePeriod = partner.periods.find((period) => !period.closedAt);
  const [startedOn, setStartedOn] = useState(activePeriod?.startedOn ?? '');
  const [endedOn, setEndedOn] = useState('');
  const [closingNote, setClosingNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(partner.name);
    setDescription(partner.description ?? '');
    setWebsite(partner.website ?? '');
    setSituation(partner.currentSituation ?? '');
    setStatus(partner.status);
    setCategories(partner.categories);
    setChannels(
      partner.channels.map(({ isPrimary, label, type, value }) => ({
        isPrimary,
        label,
        type,
        value,
      })),
    );
  }, [partner]);

  const saveInformation = async (): Promise<void> => {
    if (!categories.length) {
      toast.error('Sélectionnez au moins une catégorie');

      return;
    }
    setSaving(true);
    try {
      const updated = await updatePartner(partner.id, {
        categories,
        channels: channels.map((channel) => ({
          ...channel,
          countryCode: 'FR',
        })),
        closingNote: closingNote || null,
        currentSituation: situation || null,
        description: description || null,
        endedOn: endedOn || null,
        name,
        startedOn: startedOn || null,
        status,
        version: partner.version,
        website: website || null,
      });
      onChange(updated);
      toast.success(
        partner.status === status
          ? 'Informations enregistrées'
          : 'Statut mis à jour',
      );
    } catch (error) {
      toast.error(
        error instanceof ApiClientError
          ? error.message
          : 'La modification a échoué',
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (category: PartnerCategory): void =>
    setCategories((items) =>
      items.includes(category)
        ? items.filter((item) => item !== category)
        : [...items, category],
    );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <h2 className="font-semibold">Informations générales</h2>
          <p className="text-muted-foreground text-sm">
            Identité de l’organisation et état actuel de la relation.
          </p>
        </CardHeader>
        <form
          autoComplete="off"
          onSubmit={(event) => {
            event.preventDefault();
            void saveInformation();
          }}
        >
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="partner-detail-name">Nom</Label>
              <Input
                autoComplete="off"
                disabled={!canManage}
                id="partner-detail-name"
                maxLength={200}
                onChange={(event) => setName(event.target.value)}
                required
                value={name}
              />
            </div>
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Catégories</legend>
              <div className="flex flex-wrap gap-5">
                {(['SPONSOR', 'PARTNER'] as const).map((category) => (
                  <Label className="flex items-center gap-2" key={category}>
                    <Checkbox
                      checked={categories.includes(category)}
                      disabled={!canManage}
                      onCheckedChange={() => toggleCategory(category)}
                    />
                    {PARTNER_CATEGORY_LABELS[category]}
                  </Label>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="partner-detail-status">Statut</Label>
                <select
                  className="border-input bg-surface h-10 rounded-md border px-3 text-sm"
                  disabled={!canManage}
                  id="partner-detail-status"
                  onChange={(event) =>
                    setStatus(event.target.value as PartnerStatus)
                  }
                  value={status}
                >
                  {STATUS_TRANSITIONS[partner.status].map((item) => (
                    <option key={item} value={item}>
                      {PARTNER_STATUS_LABELS[item]}
                    </option>
                  ))}
                </select>
              </div>
              {(status === 'ACTIVE' || status === 'ENDED') && (
                <div className="grid gap-2">
                  <Label htmlFor="partner-detail-start">Début de période</Label>
                  <Input
                    disabled={!canManage}
                    id="partner-detail-start"
                    onChange={(event) => setStartedOn(event.target.value)}
                    type="date"
                    value={startedOn}
                  />
                </div>
              )}
              {status === 'ENDED' && partner.status !== 'ENDED' && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="partner-detail-end">Fin de période</Label>
                    <Input
                      disabled={!canManage}
                      id="partner-detail-end"
                      onChange={(event) => setEndedOn(event.target.value)}
                      type="date"
                      value={endedOn}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="partner-detail-closing">
                      Motif ou précision
                    </Label>
                    <Input
                      autoComplete="off"
                      disabled={!canManage}
                      id="partner-detail-closing"
                      maxLength={300}
                      onChange={(event) => setClosingNote(event.target.value)}
                      value={closingNote}
                    />
                  </div>
                </>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="partner-detail-description">
                Description courte
              </Label>
              <Textarea
                disabled={!canManage}
                id="partner-detail-description"
                maxLength={500}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                value={description}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="partner-detail-situation">
                Situation actuelle
              </Label>
              <Textarea
                disabled={!canManage}
                id="partner-detail-situation"
                maxLength={1000}
                onChange={(event) => setSituation(event.target.value)}
                placeholder="Résumé court permettant de comprendre immédiatement où en est la relation."
                rows={3}
                value={situation}
              />
              {partner.situationUpdatedAt && (
                <p className="text-muted-foreground text-xs">
                  Mise à jour le {formatDateTime(partner.situationUpdatedAt)}
                  {partner.situationUpdatedBy
                    ? ` par ${partner.situationUpdatedBy.displayName}`
                    : ''}
                  .
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="partner-detail-website">Site internet</Label>
              <Input
                autoComplete="off"
                disabled={!canManage}
                id="partner-detail-website"
                onChange={(event) => setWebsite(event.target.value)}
                type="url"
                value={website}
              />
            </div>
          </CardContent>
          {canManage && (
            <CardFooter className="justify-end">
              <Button disabled={saving} type="submit">
                {saving && <Loader2 className="size-4 animate-spin" />}
                Enregistrer
              </Button>
            </CardFooter>
          )}
        </form>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <h2 className="font-semibold">Coordonnées générales</h2>
            <p className="text-muted-foreground text-sm">
              Emails et téléphones propres à l’organisation.
            </p>
          </div>
          {canManage && (
            <Button
              onClick={() =>
                setChannels((items) => [
                  ...items,
                  {
                    isPrimary: !items.some((item) => item.type === 'EMAIL'),
                    label: 'Général',
                    type: 'EMAIL',
                    value: '',
                  },
                ])
              }
              size="sm"
              type="button"
              variant="outline"
            >
              <CirclePlus className="size-4" />
              Ajouter
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {!channels.length && (
            <p className="text-muted-foreground text-sm">
              Aucune coordonnée générale.
            </p>
          )}
          {channels.map((channel, index) => (
            <div
              className="grid gap-2 rounded-lg border p-3 md:grid-cols-[8rem_8rem_minmax(12rem,1fr)_auto_auto]"
              key={`${channel.type}-${index}`}
            >
              <select
                aria-label="Type de coordonnée"
                className="border-input bg-surface h-10 rounded-md border px-2 text-sm"
                disabled={!canManage}
                onChange={(event) =>
                  setChannels((items) =>
                    items.map((item, itemIndex) =>
                      itemIndex === index
                        ? {
                            ...item,
                            type: event.target.value as 'EMAIL' | 'PHONE',
                          }
                        : item,
                    ),
                  )
                }
                value={channel.type}
              >
                <option value="EMAIL">Email</option>
                <option value="PHONE">Téléphone</option>
              </select>
              <Input
                aria-label="Libellé"
                autoComplete="off"
                disabled={!canManage}
                maxLength={40}
                onChange={(event) =>
                  setChannels((items) =>
                    items.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, label: event.target.value }
                        : item,
                    ),
                  )
                }
                value={channel.label}
              />
              <Input
                aria-label="Coordonnée"
                autoComplete="off"
                disabled={!canManage}
                onChange={(event) =>
                  setChannels((items) =>
                    items.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, value: event.target.value }
                        : item,
                    ),
                  )
                }
                type={channel.type === 'EMAIL' ? 'email' : 'tel'}
                value={channel.value}
              />
              <Label className="flex items-center gap-2 whitespace-nowrap">
                <Checkbox
                  checked={channel.isPrimary}
                  disabled={!canManage}
                  onCheckedChange={() =>
                    setChannels((items) =>
                      items.map((item, itemIndex) => ({
                        ...item,
                        isPrimary:
                          item.type === channel.type
                            ? itemIndex === index
                            : item.isPrimary,
                      })),
                    )
                  }
                />
                Principal
              </Label>
              {canManage && (
                <Button
                  aria-label="Retirer la coordonnée"
                  onClick={() =>
                    setChannels((items) =>
                      items.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          ))}
          {canManage && (
            <div className="flex justify-end">
              <Button
                disabled={saving}
                onClick={() => void saveInformation()}
                type="button"
              >
                {saving && <Loader2 className="size-4 animate-spin" />}
                Enregistrer les coordonnées
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Périodes de relation</h2>
          <p className="text-muted-foreground text-sm">
            Une reprise crée une nouvelle période sans effacer les précédentes.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {!partner.periods.length && (
            <p className="text-muted-foreground text-sm">
              Aucune relation active n’a encore été enregistrée.
            </p>
          )}
          {partner.periods.map((period) => (
            <div
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
              key={period.id}
            >
              <span>
                {period.startedOn ?? 'Début inconnu'} →{' '}
                {period.closedAt
                  ? (period.endedOn ?? 'Fin inconnue')
                  : 'En cours'}
              </span>
              <Badge variant={period.closedAt ? 'outline' : 'secondary'}>
                {period.closedAt ? 'Terminée' : 'Active'}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {canDelete && (
        <Card className="border-destructive/30">
          <CardHeader>
            <h2 className="text-destructive font-semibold">Zone dangereuse</h2>
            <p className="text-muted-foreground text-sm">
              Seule une fiche sans période, contact ni suivi peut être
              supprimée.
            </p>
          </CardHeader>
          <CardFooter>
            <Button
              onClick={() => {
                const confirmed = window.confirm(
                  `Supprimer définitivement la fiche « ${partner.name} » ?`,
                );
                if (!confirmed) return;
                void deletePartner(partner.id, partner.version)
                  .then(() => {
                    toast.success('Fiche supprimée');
                    window.location.assign(returnHref);
                  })
                  .catch((error) =>
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : 'Suppression impossible',
                    ),
                  );
              }}
              variant="destructive"
            >
              <Trash2 className="size-4" />
              Supprimer la fiche vide
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
};

const ContactsSection: FC<{
  canManage: boolean;
  canViewContacts: boolean;
  onChange: (partner: PartnerDetail) => void;
  partner: PartnerDetail;
}> = ({ canManage, canViewContacts, onChange, partner }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PersonSummary[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!canViewContacts || query.trim().length < 2) {
      setResults([]);

      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSearching(true);
      void listPersons({
        limit: 8,
        q: query,
        signal: controller.signal,
      })
        .then((response) => setResults(response.items))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [canViewContacts, query]);

  if (!canViewContacts) {
    return (
      <ContentState
        description="La permission de consulter le Répertoire est nécessaire pour afficher ou associer des contacts."
        title="Contacts restreints"
      />
    );
  }

  const add = async (person: PersonSummary): Promise<void> => {
    try {
      const updated = await addPartnerContact(partner.id, {
        isPrimary: !partner.contacts.some(
          (contact) => !contact.closedAt && contact.isPrimary,
        ),
        label: 'Contact',
        personId: person.id,
        startedOn: null,
        version: partner.version,
      });
      onChange(updated);
      setQuery('');
      setResults([]);
      toast.success('Contact ajouté');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ajout impossible');
    }
  };

  return (
    <Card>
      <CardHeader>
        <h2 className="font-semibold">Contacts liés au Répertoire</h2>
        <p className="text-muted-foreground text-sm">
          Une liaison n’effectue aucune copie des coordonnées personnelles.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {canManage && (
          <div className="relative">
            <Input
              autoComplete="off"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher une fiche du Répertoire…"
              value={query}
            />
            {(searching || results.length > 0) && (
              <div className="border-border-default bg-surface absolute z-20 mt-1 w-full rounded-lg border p-1 shadow-lg">
                {searching ? (
                  <p className="text-muted-foreground p-3 text-sm">
                    Recherche…
                  </p>
                ) : (
                  results.map((person) => (
                    <button
                      className="hover:bg-surface-tile-hover w-full rounded-md px-3 py-2 text-left text-sm"
                      key={person.id}
                      onClick={() => void add(person)}
                      type="button"
                    >
                      {getPersonDisplayName(person)}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}
        {!partner.contacts.length && (
          <p className="text-muted-foreground text-sm">
            Aucun contact n’est encore lié.
          </p>
        )}
        <div className="space-y-2">
          {partner.contacts.map((contact) => (
            <div
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
              key={contact.id}
            >
              <div className="min-w-0">
                {contact.person ? (
                  <Link
                    className="font-medium hover:underline"
                    href={`/vie-interne/repertoire/${encodeURIComponent(contact.person.id)}`}
                  >
                    {contact.person.displayName}
                  </Link>
                ) : (
                  <p className="text-muted-foreground font-medium">
                    Contact supprimé ou restreint
                  </p>
                )}
                <p className="text-muted-foreground text-xs">
                  {contact.label}
                  {contact.isPrimary ? ' · Principal' : ''}
                  {contact.closedAt ? ' · Ancien contact' : ''}
                </p>
              </div>
              {canManage && (
                <div className="flex gap-2">
                  {!contact.closedAt && !contact.isPrimary && (
                    <Button
                      onClick={() =>
                        void updatePartnerContact(partner.id, contact.id, {
                          isPrimary: true,
                          version: partner.version,
                        }).then((updated) => {
                          onChange(updated);
                          toast.success('Contact principal mis à jour');
                        })
                      }
                      size="sm"
                      variant="outline"
                    >
                      Principal
                    </Button>
                  )}
                  <Button
                    onClick={() =>
                      void updatePartnerContact(partner.id, contact.id, {
                        close: !contact.closedAt,
                        endedOn: null,
                        version: partner.version,
                      })
                        .then((updated) => {
                          onChange(updated);
                          toast.success(
                            contact.closedAt
                              ? 'Contact réactivé'
                              : 'Liaison terminée',
                          );
                        })
                        .catch((error) =>
                          toast.error(
                            error instanceof Error
                              ? error.message
                              : 'Modification impossible',
                          ),
                        )
                    }
                    size="sm"
                    variant="ghost"
                  >
                    {contact.closedAt ? 'Réactiver' : 'Terminer'}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const FollowUpSection: FC<{
  canManage: boolean;
  onChange: (partner: PartnerDetail) => void;
  partner: PartnerDetail;
}> = ({ canManage, onChange, partner }) => {
  const [text, setText] = useState('');
  const [hasAction, setHasAction] = useState(false);
  const [actionDescription, setActionDescription] = useState('');
  const [dueOn, setDueOn] = useState('');
  const [saving, setSaving] = useState(false);
  const openActions = useMemo(
    () =>
      partner.followUps.filter(
        (entry) => entry.action && !entry.action.completedAt,
      ),
    [partner.followUps],
  );

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setSaving(true);
    try {
      const updated = await addPartnerFollowUp(partner.id, {
        action: hasAction
          ? { description: actionDescription, dueOn: dueOn || null }
          : null,
        partnerContactId: null,
        text,
        version: partner.version,
      });
      onChange(updated);
      setText('');
      setHasAction(false);
      setActionDescription('');
      setDueOn('');
      toast.success('Suivi ajouté');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Ajout du suivi impossible',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {openActions.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Actions à prévoir</h2>
          </CardHeader>
          <CardContent className="space-y-2">
            {openActions.map((entry) => (
              <div
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                key={entry.id}
              >
                <div>
                  <p className="text-sm font-medium">
                    {entry.action?.description}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {entry.action?.dueOn
                      ? `À prévoir pour le ${entry.action.dueOn}`
                      : 'Sans date cible'}
                  </p>
                </div>
                {canManage && entry.action && (
                  <Button
                    onClick={() =>
                      void setPartnerActionCompleted(
                        partner.id,
                        entry.id,
                        true,
                        partner.version,
                      ).then((updated) => {
                        onChange(updated);
                        toast.success('Action terminée');
                      })
                    }
                    size="sm"
                  >
                    <Check className="size-4" />
                    Terminer
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {canManage && (
        <Card>
          <form onSubmit={(event) => void submit(event)}>
            <CardHeader>
              <h2 className="font-semibold">Ajouter un suivi</h2>
              <p className="text-muted-foreground text-sm">
                Notez ce qui a été fait, demandé ou appris.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                maxLength={4000}
                onChange={(event) => setText(event.target.value)}
                placeholder="Ajouter un suivi…"
                required
                rows={4}
                value={text}
              />
              <Label className="flex items-center gap-2">
                <Checkbox
                  checked={hasAction}
                  onCheckedChange={(value) => setHasAction(value === true)}
                />
                Prévoir une action
              </Label>
              {hasAction && (
                <div className="grid gap-3 md:grid-cols-[1fr_12rem]">
                  <Input
                    autoComplete="off"
                    maxLength={300}
                    onChange={(event) =>
                      setActionDescription(event.target.value)
                    }
                    placeholder="Action à réaliser"
                    required
                    value={actionDescription}
                  />
                  <Input
                    aria-label="Date cible"
                    onChange={(event) => setDueOn(event.target.value)}
                    type="date"
                    value={dueOn}
                  />
                </div>
              )}
            </CardContent>
            <CardFooter className="justify-end">
              <Button disabled={saving} type="submit">
                {saving && <Loader2 className="size-4 animate-spin" />}
                Ajouter le suivi
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Historique du suivi</h2>
        </CardHeader>
        <CardContent className="space-y-3">
          {!partner.followUps.length && (
            <p className="text-muted-foreground text-sm">
              Aucun suivi n’a encore été ajouté.
            </p>
          )}
          {partner.followUps.map((entry) => (
            <article className="rounded-lg border p-4" key={entry.id}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  {entry.author.displayName}
                </p>
                <time className="text-muted-foreground text-xs">
                  {formatDateTime(entry.occurredAt)}
                </time>
              </div>
              <p className="text-sm leading-6 whitespace-pre-wrap">
                {entry.text}
              </p>
              {entry.action && (
                <div className="bg-surface-muted mt-3 rounded-md p-3 text-sm">
                  <p className="font-medium">{entry.action.description}</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {entry.action.completedAt
                      ? `Terminée le ${formatDateTime(entry.action.completedAt)}`
                      : entry.action.dueOn
                        ? `À prévoir pour le ${entry.action.dueOn}`
                        : 'À prévoir sans date cible'}
                  </p>
                  {canManage && entry.action.completedAt && (
                    <Button
                      className="mt-2"
                      onClick={() =>
                        void setPartnerActionCompleted(
                          partner.id,
                          entry.id,
                          false,
                          partner.version,
                        ).then((updated) => {
                          onChange(updated);
                          toast.success('Action réouverte');
                        })
                      }
                      size="sm"
                      variant="outline"
                    >
                      Réouvrir
                    </Button>
                  )}
                </div>
              )}
            </article>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

const ActivitySection: FC<{ partnerId: string }> = ({ partnerId }) => {
  const [items, setItems] = useState<PartnerActivityItem[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    void getPartnerActivity(partnerId)
      .then(setItems)
      .catch((caught) =>
        setError(caught instanceof Error ? caught : new Error('Erreur')),
      );
  }, [partnerId]);

  if (error) {
    return (
      <ContentState
        description={error.message}
        kind="error"
        title="Activité indisponible"
      />
    );
  }
  if (!items) return <Skeleton className="h-72 rounded-xl" />;

  return (
    <Card>
      <CardHeader>
        <h2 className="font-semibold">Journal d’activité</h2>
        <p className="text-muted-foreground text-sm">
          Modifications réalisées sur cette organisation.
        </p>
      </CardHeader>
      <CardContent className="space-y-1">
        {!items.length && (
          <p className="text-muted-foreground text-sm">
            Aucun événement disponible.
          </p>
        )}
        {items.map((item) => (
          <div
            className="grid gap-2 border-b py-3 last:border-0 md:grid-cols-[1fr_14rem]"
            key={item.id}
          >
            <div className="flex gap-3">
              <span className="bg-surface-muted flex size-8 shrink-0 items-center justify-center rounded-md">
                <Activity className="size-4" />
              </span>
              <div>
                <p className="text-sm font-medium">{item.description}</p>
                <p className="text-muted-foreground text-xs">
                  {item.actor.displayName}
                </p>
              </div>
            </div>
            <time className="text-muted-foreground text-xs md:text-right">
              {formatDateTime(item.at)}
            </time>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

const DetailContent: FC<{
  activeSection: PartnerDetailSection;
  partnerId: string;
  returnHref: string;
}> = ({ activeSection, partnerId, returnHref }) => {
  const { userData } = useUser();
  const {
    featureAvailabilityLoaded,
    operationalFeatureIds,
    refreshFeatureAvailability,
  } = useFeatureAvailability();
  const capabilities = getPartnerCapabilities(userData);
  const [partner, setPartner] = useState<PartnerDetail | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPartner(await getPartner(partnerId));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error('Erreur'));
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    if (
      capabilities.canView &&
      featureAvailabilityLoaded &&
      operationalFeatureIds.has(FEATURES.partners.id)
    ) {
      void load();
    } else {
      setLoading(false);
    }
  }, [
    capabilities.canView,
    featureAvailabilityLoaded,
    load,
    operationalFeatureIds,
  ]);

  useEffect(() => {
    const duplicates = sessionStorage.getItem(`partner-duplicate:${partnerId}`);
    if (!duplicates) return;
    sessionStorage.removeItem(`partner-duplicate:${partnerId}`);
    toast.warning(`Doublon possible : ${duplicates}`);
  }, [partnerId]);

  if (!capabilities.canView) {
    return (
      <AccessDeniedState
        actionHref={returnHref}
        actionLabel="Retour aux partenaires"
        description="Vous n’avez pas la permission de consulter cette fiche."
      />
    );
  }
  if (!featureAvailabilityLoaded || loading) return <DetailSkeleton />;
  if (!operationalFeatureIds.has(FEATURES.partners.id)) {
    return (
      <PageState
        actionLabel="Revérifier"
        description="La migration du module n’est pas disponible."
        onAction={() => void refreshFeatureAvailability()}
        title="Module temporairement indisponible"
      />
    );
  }
  if (error || !partner) {
    return (
      <PageState
        actionLabel="Réessayer"
        description={error?.message ?? 'La fiche ne peut pas être chargée.'}
        icon={<RefreshCw className="size-5" />}
        onAction={() => void load()}
        title={
          error instanceof ApiClientError && error.status === 404
            ? 'Fiche introuvable'
            : 'Chargement impossible'
        }
        tone="destructive"
      />
    );
  }

  const sectionHref = (section: PartnerDetailSection): string =>
    `${FEATURES.partners.href}/${encodeURIComponent(partner.id)}?${new URLSearchParams({ returnTo: returnHref, section })}`;

  return (
    <PageShell className="py-0">
      <PageCanvas contentClassName="relative space-y-3">
        <div className="private-left-rail">
          <div className="sticky top-4 space-y-2">
            <PageBackButton
              fullWidth
              href={returnHref}
              label="Retour aux partenaires"
            />
            <UserDetailSectionRail
              activeSection={activeSection}
              ariaLabel="Navigation de la fiche partenaire"
              className="!block"
              dirtySections={[]}
              getSectionHref={sectionHref}
              replace
              sections={SECTIONS}
            />
          </div>
        </div>
        <div className="2xl:hidden">
          <PageBackButton href={returnHref} label="Retour aux partenaires" />
        </div>
        <PageHero
          compact
          icon={<Handshake className="size-5" />}
          meta={
            <>
              <PartnerStatusBadge status={partner.status} />
              {partner.categories.map((category) => (
                <Badge key={category} variant="outline">
                  {PARTNER_CATEGORY_LABELS[category]}
                </Badge>
              ))}
            </>
          }
          title={partner.name}
          tone="legal"
        />
        <UserDetailSectionRail
          activeSection={activeSection}
          ariaLabel="Navigation de la fiche partenaire"
          dirtySections={[]}
          getSectionHref={sectionHref}
          layout="mobile"
          replace
          sections={SECTIONS}
        />
        <Tabs value={activeSection}>
          <TabsContent value="information">
            <InformationSection
              canDelete={capabilities.canDelete}
              canManage={capabilities.canManage}
              onChange={setPartner}
              partner={partner}
              returnHref={returnHref}
            />
          </TabsContent>
          <TabsContent value="contacts">
            <ContactsSection
              canManage={capabilities.canManage}
              canViewContacts={capabilities.canViewContacts}
              onChange={setPartner}
              partner={partner}
            />
          </TabsContent>
          <TabsContent value="suivi">
            <FollowUpSection
              canManage={capabilities.canManage}
              onChange={setPartner}
              partner={partner}
            />
          </TabsContent>
          <TabsContent value="activite">
            <ActivitySection partnerId={partner.id} />
          </TabsContent>
        </Tabs>
        <p className="text-muted-foreground px-1 text-xs">
          Créée le {formatDateTime(partner.createdAt)}
          {partner.createdBy ? ` par ${partner.createdBy.displayName}` : ''} ·
          dernière modification le {formatDateTime(partner.updatedAt)}
          {partner.updatedBy ? ` par ${partner.updatedBy.displayName}` : ''}.
        </p>
      </PageCanvas>
    </PageShell>
  );
};

export const PartnerDetailPage: FC<{
  activeSection: PartnerDetailSection;
  partnerId: string;
  returnHref: string;
}> = (props) => (
  <AuthenticatedLayout
    breadcrumbs={[
      { label: FEATURES.partners.audit.poleLabel },
      { href: FEATURES.partners.href, label: FEATURES.partners.label },
      { label: 'Fiche' },
    ]}
  >
    <DetailContent {...props} />
  </AuthenticatedLayout>
);
