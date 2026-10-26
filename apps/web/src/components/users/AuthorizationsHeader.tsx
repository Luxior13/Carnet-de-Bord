'use client';

import React, {
  createContext,
  type FC,
  type ReactNode,
  useContext,
} from 'react';

import { Button } from '$ui/button';

import styles from './PermissionsEditor.module.css';

export type AuthorizationView = 'access' | 'account';

type AuthorizationViewState = {
  hasAccessChanges: boolean;
  hasAccountChanges: boolean;
  onSelectView: (view: AuthorizationView) => void;
  selectedView: AuthorizationView;
};

/**
 * Set by the Autorisations section when the actor may read both views, so the
 * switch lives in the header of the card it controls (owner request of
 * 26 October 2026: no standalone bar above the card).
 */
export const AuthorizationViewContext =
  createContext<AuthorizationViewState | null>(null);

const VIEWS: ReadonlyArray<{ label: string; view: AuthorizationView }> = [
  { label: 'Administration', view: 'access' },
  { label: 'Compte personnel', view: 'account' },
];

const AuthorizationViewSwitch: FC<{ state: AuthorizationViewState }> = ({
  state,
}) => (
  <div
    aria-label="Catégorie d'autorisations"
    className={styles.viewSwitch}
    role="group"
  >
    {VIEWS.map(({ label, view }) => {
      const selected = state.selectedView === view;
      const dirty =
        view === 'access' ? state.hasAccessChanges : state.hasAccountChanges;

      return (
        <Button
          aria-pressed={selected}
          className={styles.viewButton}
          key={view}
          onClick={() => state.onSelectView(view)}
          size="sm"
          type="button"
          variant="ghost"
        >
          {label}
          {dirty && (
            <span
              aria-label="Modifications non enregistrées"
              className="bg-warning size-1.5 shrink-0 rounded-full"
              role="img"
            />
          )}
        </Button>
      );
    })}
  </div>
);

/**
 * Header shared by both views of the Autorisations section, kept to one line
 * to leave the height to the lists (owner request of 26 October 2026): view
 * switch, short summary with its help in a popover, aside on the right (role,
 * read-only state). `note` adds a second line only for a warning.
 */
export const AuthorizationsHeader: FC<{
  aside?: ReactNode;
  note?: ReactNode;
  summary?: ReactNode;
}> = ({ aside, note, summary }) => {
  const state = useContext(AuthorizationViewContext);
  if (!state && !aside && !note && !summary) return null;

  return (
    <div className={styles.roleBar}>
      {state && (
        <div className={styles.headerStart}>
          <AuthorizationViewSwitch state={state} />
        </div>
      )}
      {summary && <div className={styles.headerSummary}>{summary}</div>}
      {aside && <div className={styles.roleControl}>{aside}</div>}
      {note && <div className={styles.roleNote}>{note}</div>}
    </div>
  );
};
