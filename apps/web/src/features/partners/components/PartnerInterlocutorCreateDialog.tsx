'use client';

import { CircleAlert, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import React, {
  type FC,
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';

import { PersonAvatar } from '$features/persons/components/PersonAvatar';
import { getPerson, listPersons } from '$features/persons/person.api';
import { getPersonDisplayName } from '$features/persons/person.ui';
import type {
  PersonDetail,
  PersonSummary,
} from '$features/persons/types/person.types';
import { ErrorCode } from '$types/api.types';
import { Badge } from '$ui/badge';
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

import { addPartnerContact, getPartner } from '../partner.api';
import { PARTNER_LIMITS } from '../partner.constants';
import type {
  PartnerContactPerson,
  PartnerDetail,
} from '../types/partner.types';
import { PartnerPersonCoordinateSelect } from './PartnerPersonCoordinateSelect';

const CONTACT_LABEL_SUGGESTIONS = [
  'Interlocuteur',
  'Direction',
  'Commercial',
  'Communication',
  'Technique',
] as const;

type AvatarPerson = Pick<
  PersonSummary,
  'firstName' | 'id' | 'lastName' | 'nickname'
>;

type SelectedPerson = {
  avatar: AvatarPerson;
  displayName: string;
  id: string;
};

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;

const getSelectedPerson = (person: PersonSummary): SelectedPerson => ({
  avatar: person,
  displayName: getPersonDisplayName(person),
  id: person.id,
});

const getInitialPerson = (
  person: PartnerContactPerson | null,
): SelectedPerson | null =>
  person
    ? {
        avatar: {
          firstName: null,
          id: person.id,
          lastName: person.displayName,
          nickname: null,
        },
        displayName: person.displayName,
        id: person.id,
      }
    : null;

const preferredItemId = <T extends { id: string; isPrimary: boolean }>(
  items: T[],
): string => items.find((item) => item.isPrimary)?.id ?? items[0]?.id ?? '';

export const PartnerInterlocutorCreateDialog: FC<{
  activePersonIds: Set<string>;
  canUpdatePersons: boolean;
  contactLimitReached: boolean;
  initialPerson: PartnerContactPerson | null;
  mode: 'add' | 'relink';
  onChange: (partner: PartnerDetail) => void;
  onClose: () => void;
  partner: PartnerDetail;
}> = ({
  activePersonIds,
  canUpdatePersons,
  contactLimitReached,
  initialPerson,
  mode,
  onChange,
  onClose,
  partner,
}) => {
  const [selectedPerson, setSelectedPerson] = useState<SelectedPerson | null>(
    getInitialPerson(initialPerson),
  );
  const [personDetail, setPersonDetail] = useState<PersonDetail | null>(null);
  const [personLoading, setPersonLoading] = useState(false);
  const [personError, setPersonError] = useState<string | null>(null);
  const [selectedEmailId, setSelectedEmailId] = useState('');
  const [selectedPhoneId, setSelectedPhoneId] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PersonSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchAttempt, setSearchAttempt] = useState(0);
  const [activeResultIndex, setActiveResultIndex] = useState(-1);
  const [label, setLabel] = useState('Interlocuteur');
  const [startedOn, setStartedOn] = useState('');
  const [isPrimary, setIsPrimary] = useState(
    !partner.contacts.some((contact) => !contact.closedAt && contact.isPrimary),
  );
  const [partnerVersion, setPartnerVersion] = useState(partner.version);
  const [creating, setCreating] = useState(false);
  const [conflictNotice, setConflictNotice] = useState<string | null>(null);
  const personLoadSequence = useRef(0);
  const selectedPersonAlreadyActive = selectedPerson
    ? activePersonIds.has(selectedPerson.id)
    : false;

  const loadPerson = useCallback(
    async (personId: string, preserveSelection: boolean): Promise<void> => {
      const sequence = ++personLoadSequence.current;
      setPersonLoading(true);
      setPersonError(null);
      try {
        const detail = await getPerson(personId);
        if (sequence !== personLoadSequence.current) return;
        setPersonDetail(detail);
        setSelectedEmailId((current) =>
          preserveSelection
            ? detail.emails.some((email) => email.id === current)
              ? current
              : ''
            : preferredItemId(detail.emails),
        );
        setSelectedPhoneId((current) =>
          preserveSelection
            ? detail.phones.some((phone) => phone.id === current)
              ? current
              : ''
            : preferredItemId(detail.phones),
        );
      } catch (error) {
        if (sequence !== personLoadSequence.current) return;
        setPersonDetail(null);
        setPersonError(
          getErrorMessage(
            error,
            'Les coordonnées de cette fiche ne peuvent pas être chargées.',
          ),
        );
      } finally {
        if (sequence === personLoadSequence.current) setPersonLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (initialPerson) void loadPerson(initialPerson.id, false);
  }, [initialPerson, loadPerson]);

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (selectedPerson || normalizedQuery.length < 2) {
      setResults([]);
      setSearching(false);
      setSearchError(null);
      setActiveResultIndex(-1);

      return;
    }

    const controller = new AbortController();
    setSearching(true);
    setSearchError(null);
    const timer = window.setTimeout(() => {
      void listPersons({
        limit: 8,
        q: normalizedQuery,
        signal: controller.signal,
      })
        .then((response) => {
          if (controller.signal.aborted) return;
          setResults(response.items);
          setActiveResultIndex(response.items.length > 0 ? 0 : -1);
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          setResults([]);
          setActiveResultIndex(-1);
          setSearchError(
            getErrorMessage(
              error,
              'La recherche est momentanément indisponible.',
            ),
          );
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false);
        });
    }, 250);

    return (): void => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, searchAttempt, selectedPerson]);

  const choosePerson = (person: PersonSummary): void => {
    const selected = getSelectedPerson(person);
    setSelectedPerson(selected);
    setQuery('');
    setResults([]);
    setSearchError(null);
    setSelectedEmailId('');
    setSelectedPhoneId('');
    setConflictNotice(null);
    void loadPerson(selected.id, false);
  };

  const clearPerson = (): void => {
    personLoadSequence.current += 1;
    setSelectedPerson(null);
    setPersonDetail(null);
    setPersonError(null);
    setSelectedEmailId('');
    setSelectedPhoneId('');
    setQuery('');
    setConflictNotice(null);
  };

  const handleSearchKeyboard = (
    event: KeyboardEvent<HTMLInputElement>,
  ): void => {
    if (results.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveResultIndex((current) => (current + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveResultIndex((current) =>
        current <= 0 ? results.length - 1 : current - 1,
      );
    } else if (event.key === 'Enter' && activeResultIndex >= 0) {
      event.preventDefault();
      const result = results.at(activeResultIndex);
      if (result && !activePersonIds.has(result.id)) choosePerson(result);
    } else if (event.key === 'Escape') {
      setResults([]);
      setActiveResultIndex(-1);
    }
  };

  const refreshAfterConflict = async (error: ApiClientError): Promise<void> => {
    try {
      const fresh = await getPartner(partner.id);
      onChange(fresh);
      setPartnerVersion(fresh.version);
      if (selectedPerson) {
        await loadPerson(selectedPerson.id, true);
      }
      setConflictNotice(
        'La fiche et les coordonnées ont été actualisées. Votre rôle et vos dates sont conservés ; vérifiez les sélections.',
      );
      toast.error(`${error.message} Les données ont été actualisées.`);
    } catch {
      setConflictNotice(
        'Les données n’ont pas pu être actualisées. Réessayez dans un instant.',
      );
      toast.error(`${error.message} Actualisation impossible.`);
    }
  };

  const create = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const normalizedLabel = label.trim();
    if (!selectedPerson || !personDetail || !normalizedLabel) return;

    setCreating(true);
    try {
      const updated = await addPartnerContact(partner.id, {
        isPrimary,
        label: normalizedLabel,
        personId: selectedPerson.id,
        selectedEmailId: selectedEmailId || null,
        selectedPhoneId: selectedPhoneId || null,
        startedOn: startedOn || null,
        version: partnerVersion,
      });
      onChange(updated);
      toast.success(
        mode === 'relink'
          ? 'Nouvelle liaison créée'
          : 'Interlocuteur lié à l’organisation',
      );
      onClose();
    } catch (error) {
      if (
        error instanceof ApiClientError &&
        (error.status === 409 ||
          error.code === ErrorCode.PARTNER_DEPENDENCY_CONFLICT ||
          error.code === ErrorCode.PARTNER_VERSION_CONFLICT)
      ) {
        await refreshAfterConflict(error);
      } else {
        toast.error(
          getErrorMessage(error, 'La liaison n’a pas pu être créée.'),
        );
      }
    } finally {
      setCreating(false);
    }
  };

  const directoryHref = selectedPerson
    ? `/vie-interne/repertoire/${encodeURIComponent(selectedPerson.id)}?section=coordonnees`
    : '';
  const missingCoordinate =
    personDetail &&
    (personDetail.emails.length === 0 || personDetail.phones.length === 0);

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !creating) onClose();
      }}
    >
      <DialogContent
        className="grid h-[100svh] max-h-[100svh] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-0 sm:h-auto sm:max-h-[90svh] sm:max-w-2xl"
        fullscreenOnMobile
      >
        <DialogHeader className="border-border-divider border-b px-4 py-4 pr-14 text-left sm:px-5">
          <DialogTitle>
            {mode === 'relink'
              ? 'Relier de nouveau cet interlocuteur'
              : 'Lier un interlocuteur'}
          </DialogTitle>
          <DialogDescription>
            Sélectionnez une fiche du Répertoire, son rôle et les coordonnées à
            utiliser pour cette organisation.
          </DialogDescription>
        </DialogHeader>
        <form className="contents" onSubmit={create}>
          <div className="min-h-0 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
            {conflictNotice && (
              <p
                className="border-warning/50 bg-warning/10 rounded-lg border p-3 text-sm"
                role="status"
              >
                {conflictNotice}
              </p>
            )}

            {selectedPerson ? (
              <div className="bg-surface-inset flex items-center justify-between gap-3 rounded-lg border p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <PersonAvatar
                    className="size-10 shrink-0 rounded-full"
                    person={selectedPerson.avatar}
                  />
                  <p className="truncate font-medium">
                    {selectedPerson.displayName}
                  </p>
                </div>
                {mode === 'add' && (
                  <Button
                    disabled={creating}
                    onClick={clearPerson}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    Changer
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-2">
                <Label htmlFor="partner-interlocutor-search">
                  Rechercher dans le Répertoire
                </Label>
                <Input
                  aria-activedescendant={
                    activeResultIndex >= 0
                      ? `partner-interlocutor-result-${activeResultIndex}`
                      : undefined
                  }
                  aria-autocomplete="list"
                  aria-controls="partner-interlocutor-search-results"
                  aria-expanded={
                    query.trim().length >= 2 && !searching && results.length > 0
                  }
                  autoComplete="off"
                  id="partner-interlocutor-search"
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setSearchError(null);
                  }}
                  onKeyDown={handleSearchKeyboard}
                  placeholder="Nom ou pseudonyme…"
                  role="combobox"
                  value={query}
                />
                {query.trim().length < 2 ? (
                  <p className="text-muted-foreground text-xs">
                    Saisissez au moins 2 caractères.
                  </p>
                ) : (
                  <div
                    aria-live="polite"
                    className="border-border-default overflow-hidden rounded-lg border"
                    id="partner-interlocutor-search-results"
                  >
                    {searching ? (
                      <p className="text-muted-foreground flex items-center gap-2 p-3 text-sm">
                        <Loader2 className="size-4 animate-spin" />
                        Recherche…
                      </p>
                    ) : searchError ? (
                      <div className="text-destructive space-y-2 p-3 text-sm">
                        <p className="flex items-start gap-2">
                          <CircleAlert className="mt-0.5 size-4 shrink-0" />
                          {searchError}
                        </p>
                        <Button
                          onClick={() =>
                            setSearchAttempt((attempt) => attempt + 1)
                          }
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          Réessayer
                        </Button>
                      </div>
                    ) : results.length === 0 ? (
                      <p className="text-muted-foreground p-3 text-sm">
                        Aucun résultat.
                      </p>
                    ) : (
                      <ul role="listbox">
                        {results.map((person, index) => {
                          const alreadyActive = activePersonIds.has(person.id);

                          return (
                            <li key={person.id} role="presentation">
                              <button
                                aria-disabled={alreadyActive}
                                aria-selected={activeResultIndex === index}
                                className="hover:bg-surface-tile-hover aria-selected:bg-surface-tile-hover focus-visible:ring-ring flex w-full items-center gap-3 p-3 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-55"
                                disabled={alreadyActive}
                                id={`partner-interlocutor-result-${index}`}
                                onClick={() => choosePerson(person)}
                                onMouseEnter={() => setActiveResultIndex(index)}
                                role="option"
                                type="button"
                              >
                                <PersonAvatar
                                  className="size-9 shrink-0 rounded-full"
                                  person={person}
                                />
                                <span className="min-w-0 flex-1 truncate font-medium">
                                  {getPersonDisplayName(person)}
                                </span>
                                {alreadyActive && (
                                  <Badge variant="secondary">Déjà lié</Badge>
                                )}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}

            {selectedPersonAlreadyActive && (
              <p
                className="border-warning/50 bg-warning/10 rounded-lg border p-3 text-sm"
                role="alert"
              >
                Cette personne possède désormais une liaison active. Choisissez
                une autre fiche.
              </p>
            )}
            {contactLimitReached && (
              <p
                className="border-warning/50 bg-warning/10 rounded-lg border p-3 text-sm"
                role="alert"
              >
                La limite de {PARTNER_LIMITS.contacts} interlocuteurs actifs est
                atteinte.
              </p>
            )}

            {selectedPerson && (
              <>
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
                      onClick={() => {
                        void loadPerson(selectedPerson.id, true);
                      }}
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
                      disabled={creating || personLoading}
                      items={personDetail.emails}
                      kind="email"
                      onChange={setSelectedEmailId}
                      value={selectedEmailId}
                    />
                    <PartnerPersonCoordinateSelect
                      disabled={creating || personLoading}
                      items={personDetail.phones}
                      kind="phone"
                      onChange={setSelectedPhoneId}
                      value={selectedPhoneId}
                    />
                  </div>
                )}
                {missingCoordinate && (
                  <div className="bg-surface-inset flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-muted-foreground text-sm">
                      Les coordonnées absentes doivent être ajoutées à la fiche
                      du Répertoire.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild size="sm" variant="outline">
                        <a
                          href={directoryHref}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <ExternalLink className="size-4" />
                          {canUpdatePersons
                            ? 'Compléter la fiche'
                            : 'Consulter la fiche'}
                        </a>
                      </Button>
                      <Button
                        disabled={personLoading}
                        onClick={() => void loadPerson(selectedPerson.id, true)}
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
                  <Label htmlFor="partner-interlocutor-label">
                    Rôle auprès de l’organisation
                  </Label>
                  <Input
                    autoComplete="off"
                    disabled={creating}
                    id="partner-interlocutor-label"
                    list="partner-interlocutor-label-suggestions"
                    maxLength={80}
                    onChange={(event) => setLabel(event.target.value)}
                    required
                    value={label}
                  />
                  <datalist id="partner-interlocutor-label-suggestions">
                    {CONTACT_LABEL_SUGGESTIONS.map((suggestion) => (
                      <option key={suggestion} value={suggestion} />
                    ))}
                  </datalist>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="partner-interlocutor-started-on">
                    Date de début (facultative)
                  </Label>
                  <Input
                    disabled={creating}
                    id="partner-interlocutor-started-on"
                    onChange={(event) => setStartedOn(event.target.value)}
                    type="date"
                    value={startedOn}
                  />
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={isPrimary}
                    disabled={creating}
                    id="partner-interlocutor-primary"
                    onCheckedChange={(checked) =>
                      setIsPrimary(checked === true)
                    }
                  />
                  <div className="grid gap-1">
                    <Label
                      className="cursor-pointer"
                      htmlFor="partner-interlocutor-primary"
                    >
                      Interlocuteur principal
                    </Label>
                    <p className="text-muted-foreground text-xs">
                      Il remplacera l’interlocuteur principal actuel, le cas
                      échéant.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter className="border-border-divider bg-surface-inset border-t px-4 py-4 sm:px-5">
            <Button
              disabled={creating}
              onClick={onClose}
              type="button"
              variant="outline"
            >
              Annuler
            </Button>
            <Button
              disabled={
                creating ||
                personLoading ||
                !personDetail ||
                contactLimitReached ||
                selectedPersonAlreadyActive ||
                !selectedPerson ||
                !label.trim()
              }
              type="submit"
            >
              {creating && <Loader2 className="size-4 animate-spin" />}
              {creating
                ? 'Création…'
                : mode === 'relink'
                  ? 'Créer la nouvelle liaison'
                  : 'Lier l’interlocuteur'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
