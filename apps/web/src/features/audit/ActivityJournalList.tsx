'use client';

import { ChevronRight, ExternalLink, Filter } from 'lucide-react';
import Link from 'next/link';
import React, { type FC, useId, useState } from 'react';

import { Button } from '$ui/button';

import styles from './ActivityJournal.module.css';
import {
  JOURNAL_VISIBLE_CHANGES,
  type JournalChange,
  type JournalEvent,
  type JournalQuery,
  summarizeJournalChanges,
} from './audit-journal.types';

const TONE_LABELS: Record<JournalEvent['tone'], string | null> = {
  critical: 'Important',
  failure: 'Échec',
  neutral: null,
  warning: 'À surveiller',
};

const TIME = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
});
const DAY = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
});
const DAY_YEAR = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const EXACT = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'full',
  timeStyle: 'long',
});

const startOfDay = (date: Date): number =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

/** « 14:32 », « hier 14:32 », « 12 oct. 14:32 », year when it differs. */
const formatJournalTime = (iso: string, now = new Date()): string => {
  const date = new Date(iso);
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  const time = TIME.format(date);
  if (days === 0) return time;
  if (days === 1) return `hier ${time}`;

  return `${(date.getFullYear() === now.getFullYear() ? DAY : DAY_YEAR).format(date)} ${time}`;
};

/**
 * What changed comes first (31 October 2026). Past six, the rest waits behind
 * one button; a single extra change is shown rather than hidden.
 */
const EventChanges: FC<{ changes: JournalChange[]; id: string }> = ({
  changes,
  id,
}) => {
  const [showAll, setShowAll] = useState(false);
  const hidden = changes.length - JOURNAL_VISIBLE_CHANGES;
  const collapsible = hidden > 1;
  const shown =
    collapsible && !showAll
      ? changes.slice(0, JOURNAL_VISIBLE_CHANGES)
      : changes;

  return (
    <div className={styles.changesBlock}>
      <table className={styles.changes}>
        <caption>Changements</caption>
        <thead>
          <tr>
            <th scope="col">Champ</th>
            <th scope="col">Avant</th>
            <th scope="col">Après</th>
          </tr>
        </thead>
        <tbody id={id}>
          {shown.map((change, index) => (
            // Two contacts may change the same field: the index separates them.
            <tr key={`${change.label}-${index}`}>
              <th scope="row">{change.label}</th>
              <td>{change.before}</td>
              <td>{change.after}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {collapsible && (
        <Button
          aria-controls={id}
          aria-expanded={showAll}
          className={styles.moreChanges}
          onClick={() => setShowAll(!showAll)}
          size="sm"
          type="button"
          variant="ghost"
        >
          {showAll
            ? 'Afficher moins'
            : `Afficher les ${hidden} autres changements`}
        </Button>
      )}
    </div>
  );
};

const EventDetails: FC<{
  event: JournalEvent;
  id: string;
  onFocus: (changes: Partial<Pick<JournalQuery, 'person' | 'user'>>) => void;
  query: JournalQuery;
}> = ({ event, id, onFocus, query }) => {
  const actorId = event.actor.id;
  const target = event.target;

  return (
    <div className={styles.details} id={id}>
      {event.changes.length > 0 && (
        <EventChanges changes={event.changes} id={`${id}-changes`} />
      )}
      <dl className={styles.facts}>
        <dt>Date</dt>
        <dd>
          <time dateTime={event.at}>{EXACT.format(new Date(event.at))}</time>
        </dd>
        <dt>Type</dt>
        <dd>{event.typeLabel}</dd>
        <dt>Auteur</dt>
        <dd>
          {event.actor.name}
          {event.actor.loginName && event.actor.loginName !== event.actor.name
            ? ` (${event.actor.loginName})`
            : ''}
        </dd>
        {target && (
          <>
            <dt>{target.kind === 'person' ? 'Fiche' : 'Compte concerné'}</dt>
            <dd>{target.name}</dd>
          </>
        )}
        {event.subject && (
          <>
            <dt>Détail</dt>
            <dd>{event.subject}</dd>
          </>
        )}
        {event.facts.map((fact) => (
          <React.Fragment key={fact.label}>
            <dt>{fact.label}</dt>
            <dd>{fact.value}</dd>
          </React.Fragment>
        ))}
        {event.browser && (
          <>
            <dt>Navigateur</dt>
            <dd>{event.browser}</dd>
          </>
        )}
        {(event.ip || event.ipMasked) && (
          <>
            <dt>Adresse IP</dt>
            <dd>{event.ip ?? 'Adresse masquée'}</dd>
          </>
        )}
      </dl>
      <div className={styles.links}>
        {actorId && query.user !== actorId && (
          <Button
            onClick={() => onFocus({ person: null, user: actorId })}
            size="sm"
            type="button"
            variant="outline"
          >
            <Filter aria-hidden="true" />
            Filtrer sur cet auteur
          </Button>
        )}
        {target?.kind === 'user' &&
          target.id !== actorId &&
          query.user !== target.id && (
            <Button
              onClick={() => onFocus({ person: null, user: target.id })}
              size="sm"
              type="button"
              variant="outline"
            >
              <Filter aria-hidden="true" />
              Filtrer sur ce compte
            </Button>
          )}
        {target?.kind === 'person' && query.person !== target.id && (
          <Button
            onClick={() => onFocus({ person: target.id, user: null })}
            size="sm"
            type="button"
            variant="outline"
          >
            <Filter aria-hidden="true" />
            Filtrer sur cette fiche
          </Button>
        )}
        {target?.href && (
          <Button asChild size="sm" variant="outline">
            <Link href={target.href}>
              <ExternalLink aria-hidden="true" />
              {target.kind === 'person'
                ? 'Ouvrir la fiche'
                : 'Ouvrir le compte'}
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
};

export const ActivityJournalList: FC<{
  events: JournalEvent[];
  onFocus: (changes: Partial<Pick<JournalQuery, 'person' | 'user'>>) => void;
  query: JournalQuery;
}> = ({ events, onFocus, query }) => {
  const baseId = useId();
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <ol aria-label="Événements" className={styles.list}>
      {events.map((event) => {
        const open = openId === event.id;
        const detailsId = `${baseId}-${event.id}`;
        const tone = TONE_LABELS[event.tone];
        // Without a record or account, the next column already names what
        // changed (a setting): the summary would only repeat it.
        const changed = event.target
          ? summarizeJournalChanges(event.changes)
          : null;

        return (
          <li className={styles.item} key={event.id}>
            <Button
              aria-controls={open ? detailsId : undefined}
              aria-expanded={open}
              className={styles.row}
              onClick={() => setOpenId(open ? null : event.id)}
              size="inline"
              type="button"
              variant="ghost"
            >
              <span
                aria-hidden="true"
                className={styles.dot}
                data-tone={event.tone}
              />
              <span className={styles.label}>
                <span className={styles.labelText}>{event.label}</span>
                {tone && (
                  <span className={styles.tone} data-tone={event.tone}>
                    {tone}
                  </span>
                )}
                {changed && (
                  <span className={styles.changed}>
                    <span className="sr-only">, champs : </span>
                    {changed}
                  </span>
                )}
              </span>
              <span className={styles.subject}>
                {event.target?.name ?? event.subject ?? event.typeLabel}
              </span>
              <span className={styles.actor}>
                <span className="sr-only">Par </span>
                {event.actor.name}
              </span>
              <time className={styles.time} dateTime={event.at}>
                {formatJournalTime(event.at)}
              </time>
              <ChevronRight aria-hidden="true" className={styles.chevron} />
            </Button>
            {open && (
              <EventDetails
                event={event}
                id={detailsId}
                onFocus={onFocus}
                query={query}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
};
