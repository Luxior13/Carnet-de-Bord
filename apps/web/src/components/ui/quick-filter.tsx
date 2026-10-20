import React, { type FC, type ReactNode } from 'react';

import { Button } from '$ui/button';
import directoryStyles from '$ui/directory.module.css';
import { cn } from '$utils/css.utils';

/**
 * One dimension of the quick filters of a management list, under its search.
 * `caption` is the short visible label (« État ») that tells what « Tous »
 * applies to; `label` names the group for assistive technologies. Needs the
 * `directoryStyles.directory` scope, like the other list controls.
 */
export const QuickFilterGroup: FC<{
  caption: string;
  children: ReactNode;
  className?: string;
  label: string;
}> = ({ caption, children, className, label }) => (
  <div
    aria-label={label}
    className={cn(directoryStyles.quickFilters, className)}
    role="group"
  >
    <span aria-hidden="true" className={directoryStyles.quickFilterLabel}>
      {caption}
    </span>
    {children}
  </div>
);

/**
 * Toggle of a quick filter. The caller gives a count only when it equals the
 * result the filter would show, so a number never contradicts the list; the
 * accessible name then carries it (« Actifs, 2 comptes »).
 */
export const QuickFilter: FC<{
  count: number | null;
  label: string;
  noun: readonly [singular: string, plural: string];
  onClick: () => void;
  pressed: boolean;
}> = ({ count, label, noun, onClick, pressed }) => (
  <Button
    aria-label={
      count === null
        ? undefined
        : `${label}, ${count.toLocaleString('fr-FR')} ${count > 1 ? noun[1] : noun[0]}`
    }
    aria-pressed={pressed}
    className={directoryStyles.quickFilter}
    onClick={onClick}
    type="button"
    variant="ghost"
  >
    {label}
    {count !== null && (
      <span className={directoryStyles.quickFilterCount}>
        {count.toLocaleString('fr-FR')}
      </span>
    )}
  </Button>
);
