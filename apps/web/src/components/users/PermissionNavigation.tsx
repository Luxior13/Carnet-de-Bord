'use client';

import { Search } from 'lucide-react';
import React, { type FC, useId } from 'react';

import { getNavigationIcon } from '$constants/navigation-icon.constants';
import { type PermissionItem } from '$constants/permissions.constants';
import { Button } from '$ui/button';
import directoryStyles from '$ui/directory.module.css';
import { Input } from '$ui/input';
import { Label } from '$ui/label';
import { QuickFilter, QuickFilterGroup } from '$ui/quick-filter';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '$ui/select';
import { cn } from '$utils/css.utils';

import {
  PERMISSION_EDITOR_POLES,
  type PermissionCategoryResult,
  type PermissionEditorCategory,
} from './permission-editor-view';
import styles from './PermissionsEditor.module.css';

export type PermissionListFilter = 'all' | 'granted';

export type PermissionResultGroup = {
  category: PermissionEditorCategory;
  items: PermissionItem[];
  pole: (typeof PERMISSION_EDITOR_POLES)[number];
};

type PermissionNavigationProps = {
  changedPermissionKeys?: ReadonlySet<string>;
  countCategory: (
    category: PermissionEditorCategory,
  ) => PermissionCategoryResult;
  /** Unsaved changes: a dot on the pages and poles they belong to. */
  isPageListed?: (category: PermissionEditorCategory) => boolean;
  /** « Accordées »: only the poles and pages holding a granted permission. */
  onJumpToResult: (pageKey: string) => void;
  onQueryChange: (query: string) => void;
  onSelectPage: (pageKey: string) => void;
  onSelectPole: (poleKey: string) => void;
  /**
   * Pages holding the shown search or granted results. While set, the column
   * becomes their index instead of the pole menu (26 October 2026).
   */
  query: string;
  results: ReadonlyArray<PermissionResultGroup> | null;
  selectedPageKey: string;
};

const PERMISSION_NOUN = ['autorisation', 'autorisations'] as const;

const countClassName = (
  result: Pick<PermissionCategoryResult, 'incomplete' | 'ready'>,
): string =>
  result.incomplete > 0
    ? 'text-warning'
    : result.ready > 0
      ? 'text-success'
      : 'text-muted-foreground';

const ChangedDot: FC = () => (
  <span
    aria-label="Modifications non enregistrées"
    className="bg-warning size-1.5 shrink-0 rounded-full"
    role="img"
  />
);

/** Visible « 3/7 », read as « 3 sur 7 utilisables ». */
const UsableCount: FC<{
  result: Pick<PermissionCategoryResult, 'incomplete' | 'ready' | 'total'>;
}> = ({ result }) => (
  <span className={cn('text-xs tabular-nums', countClassName(result))}>
    <span aria-hidden="true">
      {result.ready}/{result.total}
    </span>
    <span className="sr-only">
      , {result.ready} sur {result.total} utilisables
    </span>
  </span>
);

/**
 * « Toutes / Accordées », in the header of the Autorisations card since
 * 26 October 2026 (owner request): they act on the whole editor, not on the
 * navigation column.
 */
export const PermissionListFilters: FC<{
  filter: PermissionListFilter;
  grantedCount: number;
  onFilterChange: (filter: PermissionListFilter) => void;
  totalCount: number;
}> = ({ filter, grantedCount, onFilterChange, totalCount }) => (
  <div className={directoryStyles.directory}>
    <QuickFilterGroup caption="Afficher" label="Filtrer les autorisations">
      <QuickFilter
        count={totalCount}
        label="Toutes"
        noun={PERMISSION_NOUN}
        onClick={() => onFilterChange('all')}
        pressed={filter === 'all'}
      />
      <QuickFilter
        count={grantedCount}
        label="Accordées"
        noun={PERMISSION_NOUN}
        onClick={() => onFilterChange('granted')}
        pressed={filter === 'granted'}
      />
    </QuickFilterGroup>
  </div>
);

/**
 * Navigation of the permissions editor: a search across every pole, then a
 * pole menu and the pages of that pole only, each
 * with its usable count. Built to hold many pages on many poles (owner
 * decisions of 26 October 2026).
 */
export const PermissionNavigation: FC<PermissionNavigationProps> = ({
  changedPermissionKeys,
  countCategory,
  isPageListed,
  onJumpToResult,
  onQueryChange,
  onSelectPage,
  onSelectPole,
  query,
  results,
  selectedPageKey,
}) => {
  const poleSelectId = useId();
  const isChanged = (category: PermissionEditorCategory): boolean =>
    !!changedPermissionKeys &&
    category.permissions.some((item) => changedPermissionKeys.has(item.key));
  // The pole follows the selected page: one source of truth, kept in the URL.
  const listedPoles = PERMISSION_EDITOR_POLES.map((pole) => ({
    ...pole,
    categories: pole.categories.filter(
      (category) => !isPageListed || isPageListed(category),
    ),
  })).filter((pole) => pole.categories.length > 0);
  const currentPole =
    listedPoles.find((pole) =>
      pole.categories.some((category) => category.key === selectedPageKey),
    ) ?? listedPoles[0];
  const countPole = (
    pole: (typeof PERMISSION_EDITOR_POLES)[number],
  ): Pick<PermissionCategoryResult, 'incomplete' | 'ready' | 'total'> =>
    pole.categories.reduce(
      (sum, category) => {
        const result = countCategory(category);

        return {
          incomplete: sum.incomplete + result.incomplete,
          ready: sum.ready + result.ready,
          total: sum.total + result.total,
        };
      },
      { incomplete: 0, ready: 0, total: 0 },
    );

  return (
    <nav aria-label="Pages des autorisations" className={styles.navigation}>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
        />
        <Input
          aria-label="Rechercher une autorisation"
          className="pl-9"
          maxLength={80}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Rechercher"
          type="search"
          value={query}
        />
      </div>
      {results ? (
        // Index of the results on the right: only the poles and pages that
        // hold some, each jumping to its group.
        <div className={cn(styles.tree, 'space-y-3')}>
          <p className={styles.indexHeading}>Pages concernées</p>
          {results.length === 0 && (
            <p className="text-muted-foreground text-xs">Aucune page.</p>
          )}
          {PERMISSION_EDITOR_POLES.filter((pole) =>
            results.some((group) => group.pole.key === pole.key),
          ).map((pole) => {
            const PoleIcon = getNavigationIcon(pole.icon);

            return (
              <div className="space-y-1" key={pole.key}>
                <p className={styles.indexPole}>
                  <PoleIcon aria-hidden="true" className="size-4 shrink-0" />
                  {pole.label}
                </p>
                <ul className="space-y-0.5">
                  {results
                    .filter((group) => group.pole.key === pole.key)
                    .map(({ category, items }) => (
                      <li key={category.key}>
                        <Button
                          className={styles.pageButton}
                          data-result-link={category.key}
                          onClick={() => onJumpToResult(category.key)}
                          type="button"
                          variant="ghost"
                        >
                          <span className="min-w-0 flex-1 truncate">
                            {category.label}
                          </span>
                          <span className="text-xs tabular-nums">
                            <span aria-hidden="true">{items.length}</span>
                            <span className="sr-only">
                              , {items.length} autorisation
                              {items.length > 1 ? 's' : ''}
                            </span>
                          </span>
                        </Button>
                      </li>
                    ))}
                </ul>
              </div>
            );
          })}
        </div>
      ) : (
        <>
          {/* One pole at a time; the search above still covers every pole. */}
          <div className={cn(styles.tree, 'space-y-2')}>
            <Label htmlFor={poleSelectId}>Pôle</Label>
            {!currentPole && (
              <p className="text-muted-foreground text-xs">Aucune page.</p>
            )}
            {currentPole && (
              <Select onValueChange={onSelectPole} value={currentPole.key}>
                <SelectTrigger
                  className="w-full min-w-0"
                  id={poleSelectId}
                  variant="compact"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent variant="compact">
                  {listedPoles.map((pole) => {
                    const PoleIcon = getNavigationIcon(pole.icon);

                    return (
                      <SelectItem key={pole.key} value={pole.key}>
                        <PoleIcon aria-hidden="true" />
                        <span className="flex-1">{pole.label}</span>
                        {pole.categories.some(isChanged) && <ChangedDot />}
                        <UsableCount result={countPole(pole)} />
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
            <ul
              aria-label={`Pages du pôle ${currentPole?.label ?? ''}`}
              className="space-y-0.5"
            >
              {currentPole?.categories.map((category) => {
                const current = category.key === selectedPageKey;

                return (
                  <li key={category.key}>
                    <Button
                      aria-current={current ? 'page' : undefined}
                      className={styles.pageButton}
                      data-page-key={category.key}
                      onClick={() => onSelectPage(category.key)}
                      type="button"
                      variant="ghost"
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {category.label}
                      </span>
                      {isChanged(category) && <ChangedDot />}
                      <UsableCount result={countCategory(category)} />
                    </Button>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </nav>
  );
};
