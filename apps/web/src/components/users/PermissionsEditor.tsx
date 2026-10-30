'use client';

import { type UserRole } from '@repo/shared';
import { ChevronLeft, LockKeyhole, ShieldCheck, X } from 'lucide-react';
import React, { type FC, useCallback, useMemo, useRef, useState } from 'react';

import {
  getAccessPermissionKeys,
  hasCompleteAccessByRole,
  type PermissionItem,
  type PermissionsData,
} from '$constants/permissions.constants';
import { Badge } from '$ui/badge';
import { Button } from '$ui/button';

import { AuthorizationsHeader } from './AuthorizationsHeader';
import {
  buildPermissionOverrideChange,
  buildResetPermissionOverrides,
  evaluatePermissionMutationBatch,
  type PermissionChoiceState,
  type PermissionMutationDecision,
  type PermissionMutationPolicy,
} from './permission-editor-policy';
import {
  buildPermissionEditorState,
  countCategoryPermissionResults,
  countUsablePermissions,
  getPermissionSearchTerms,
  matchesPermissionSearch,
  normalizePermissionSearch,
  PERMISSION_EDITOR_CATEGORIES,
  PERMISSION_EDITOR_POLES,
  type PermissionEditorCategory,
} from './permission-editor-view';
import { PermissionDecisionButton } from './PermissionDecisionButton';
import { PermissionInfoButton } from './PermissionInfoButton';
import {
  type PermissionListFilter,
  PermissionListFilters,
  PermissionNavigation,
  type PermissionResultGroup,
} from './PermissionNavigation';
import { PermissionRow } from './PermissionRow';
import styles from './PermissionsEditor.module.css';

type PermissionsEditorProps = {
  canChangePermission?: PermissionMutationPolicy;
  changedPermissionKeys?: ReadonlySet<string>;
  disabled?: boolean;
  onChange: (permissions: PermissionsData | null) => void;
  /** On a narrow screen, open the selected page instead of the page list. */
  onSelectedPageChange: (pageKey: string) => void;
  openPageOnNarrow?: boolean;
  permissions: PermissionsData | null;
  /** Role field, on its own line above the pages. */
  role: UserRole;
  /** Extra note after the role explanation (MFA, locked role). */
  roleControl?: React.ReactNode;
  roleNotice?: React.ReactNode;
  /** Keys that differ from the saved account: marked on rows and pages. */
  selectedPageKey: string;
  /**
   * Computer layout: the editor fills its card, each column scrolls on its
   * own (26 October 2026).
   */
  workspace?: boolean;
};

const ACCESS_KEYS = new Set(getAccessPermissionKeys());
const NO_CHANGES: ReadonlySet<string> = new Set();
const ALL_PERMISSIONS = PERMISSION_EDITOR_CATEGORIES.flatMap(
  (category) => category.permissions,
);

const groupByModule = (
  permissions: readonly PermissionItem[],
): Map<string, PermissionItem[]> => {
  const groups = new Map<string, PermissionItem[]>();
  for (const permission of permissions)
    groups.set(permission.module, [
      ...(groups.get(permission.module) ?? []),
      permission,
    ]);

  return groups;
};

/**
 * Permissions of an account: the role on its own line, a pole and page
 * navigation with counts, then the selected page, a search result or the
 * granted list. Redesigned on 26 October 2026 to hold many pages and poles.
 */
export const PermissionsEditor: FC<PermissionsEditorProps> = ({
  canChangePermission,
  changedPermissionKeys = NO_CHANGES,
  disabled = false,
  onChange,
  onSelectedPageChange,
  openPageOnNarrow = false,
  permissions,
  role,
  roleControl,
  roleNotice,
  selectedPageKey,
  workspace = false,
}) => {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<PermissionListFilter>('all');
  // The last change that also switched other permissions, shown under its
  // row with an undo while the draft is still the one it produced.
  const [cascade, setCascade] = useState<{
    after: PermissionsData | null;
    before: PermissionsData | null;
    key: string;
    message: string;
  } | null>(null);
  const [narrowView, setNarrowView] = useState<'detail' | 'list'>(
    openPageOnNarrow ? 'detail' : 'list',
  );
  // The phone list marks a page only once one has been opened: the page a
  // computer shows by default was never chosen there (30 October 2026).
  const [pageOpened, setPageOpened] = useState(openPageOnNarrow);
  const state = useMemo(
    () => buildPermissionEditorState(role, permissions),
    [role, permissions],
  );
  const permissionsMap = useMemo(
    () => new Map(Object.entries(permissions ?? {})),
    [permissions],
  );
  const countCategory = useCallback(
    (category: PermissionEditorCategory) =>
      countCategoryPermissionResults(
        category,
        state.configured,
        state.effective,
      ),
    [state],
  );
  const completeAccess = hasCompleteAccessByRole(role);
  // Total of the draft, like the per-page counts (decision of 2026-10-20).
  const usable = countUsablePermissions(state.effective);
  const editable = !disabled && !completeAccess;
  const grantedPermissionCount = [...permissionsMap.keys()].filter((key) =>
    ACCESS_KEYS.has(key),
  ).length;
  const isGranted = (key: string): boolean =>
    (state.configured.get(key) || state.effective.get(key)) ?? false;
  const grantedCount = ALL_PERMISSIONS.filter((item) =>
    isGranted(item.key),
  ).length;
  const normalizedQuery = normalizePermissionSearch(query);
  const searchTerms = getPermissionSearchTerms(query);
  // Only a search lists results across poles; « Accordées » narrows the
  // usual pole menu, pages and page to what is granted (owner request of
  // 26 October 2026).
  const resultsActive = normalizedQuery !== '';
  const grantedOnly = filter === 'granted';
  // « Accordées » also keeps what the draft just changed: a permission
  // switched off stays in place, with its note and undo, until saved or
  // cancelled (code review of 29 October 2026).
  const isListed = (key: string): boolean =>
    isGranted(key) || changedPermissionKeys.has(key);
  const hasGranted = (category: PermissionEditorCategory): boolean =>
    category.permissions.some((item) => isListed(item.key));
  // Nothing at all to show: a phone stays on the list, where the header and
  // its filters are, instead of an empty page without a way back.
  const nothingListed =
    grantedOnly && !ALL_PERMISSIONS.some((item) => isListed(item.key));
  const shownNarrowView = nothingListed ? 'list' : narrowView;
  const requestedCategory =
    PERMISSION_EDITOR_CATEGORIES.find(
      (category) => category.key === selectedPageKey,
    ) ?? PERMISSION_EDITOR_CATEGORIES[0];
  const selectedCategory =
    grantedOnly && requestedCategory && !hasGranted(requestedCategory)
      ? (PERMISSION_EDITOR_CATEGORIES.find(hasGranted) ?? requestedCategory)
      : requestedCategory;

  const getBatchDecision = (
    nextPermissions: PermissionsData | null,
  ): PermissionMutationDecision =>
    evaluatePermissionMutationBatch({
      accessPermissionKeys: ACCESS_KEYS,
      currentEffectivePermissions: state.effective,
      currentPermissionsMap: permissionsMap,
      disabled,
      nextPermissions,
      policy: canChangePermission,
      role,
    });
  const buildChange = (
    permissionKey: string,
    choice: PermissionChoiceState,
  ): PermissionsData | null =>
    buildPermissionOverrideChange({
      permissionKey,
      permissionsMap,
      roleBasePermissionsMap: state.roleDefaults,
      state: choice,
    });
  const buildReset = (keys: Iterable<string>): PermissionsData | null =>
    buildResetPermissionOverrides(permissionsMap, keys);
  const getDecision = (
    key: string,
    choice: PermissionChoiceState,
  ): PermissionMutationDecision => {
    const batch = getBatchDecision(buildChange(key, choice));
    if (!batch.allowed || !canChangePermission) return batch;

    return canChangePermission(key, choice === 'allow');
  };
  const changePermission = (
    key: string,
    choice: PermissionChoiceState,
  ): void => {
    if (!getDecision(key, choice).allowed) return;
    const next = buildChange(key, choice);
    // Prerequisites switched on, or dependents switched off, with it.
    const nextConfigured = buildPermissionEditorState(role, next).configured;
    const others = ALL_PERMISSIONS.filter(
      (item) =>
        item.key !== key &&
        (state.configured.get(item.key) ?? false) !==
          (nextConfigured.get(item.key) ?? false),
    );
    onChange(next);
    setCascade(
      others.length > 0
        ? {
            after: next,
            before: permissions,
            key,
            message: `${choice === 'allow' ? 'Accordé aussi' : 'Retiré aussi'} : ${others.map((item) => item.label).join(', ')}.`,
          }
        : null,
    );
  };
  const undoCascade = (): void => {
    if (!cascade) return;
    const { before, key } = cascade;
    setCascade(null);
    onChange(before);
    requestAnimationFrame(() =>
      bodyRef.current
        ?.querySelector<HTMLElement>(
          `[data-permission="${key}"] [role="switch"]`,
        )
        ?.focus(),
    );
  };
  // Shown only while the draft is the one the change produced: a cancel, a
  // save or another change makes it disappear.
  const activeCascade =
    cascade && cascade.after === permissions ? cascade : null;
  const reset = (keys: Iterable<string>): void => {
    const next = buildReset(keys);
    if (getBatchDecision(next).allowed) onChange(next);
  };

  // Search results (granted ones only under « Accordées »), shared by the
  // right column and the index of the left one.
  const resultGroups: PermissionResultGroup[] | null = resultsActive
    ? PERMISSION_EDITOR_POLES.flatMap((pole) =>
        pole.categories.map((category) => ({
          category,
          items: category.permissions.filter(
            (item) =>
              matchesPermissionSearch(
                item,
                category,
                searchTerms,
                pole.label,
              ) &&
              (!grantedOnly || isListed(item.key)),
          ),
          pole,
        })),
      ).filter((group) => group.items.length > 0)
    : null;
  const jumpToResult = (pageKey: string): void => {
    const heading = bodyRef.current?.querySelector<HTMLElement>(
      `[data-result-heading="${pageKey}"]`,
    );
    if (!heading) return;
    heading.scrollIntoView({ block: 'start' });
    heading.focus({ preventScroll: true });
  };

  // The page list exists twice (pole menu on a computer, every pole on a
  // phone); only the shown copy can take focus.
  const findVisiblePageButton = (pageKey: string): HTMLElement | null =>
    Array.from(
      bodyRef.current?.querySelectorAll<HTMLElement>(
        `[data-page-key="${pageKey}"]`,
      ) ?? [],
    ).find((button) => button.offsetParent !== null) ?? null;

  // On a narrow screen the list and the page take turns: focus follows the
  // visible one so a keyboard or screen reader user is never left behind.
  const selectPage = (pageKey: string): void => {
    onSelectedPageChange(pageKey);
    setQuery('');
    setNarrowView('detail');
    setPageOpened(true);
    requestAnimationFrame(() => {
      const button = findVisiblePageButton(pageKey);
      if (button) {
        // Side by side: keep focus in the list, but show the new page from
        // its start when the previous one had been scrolled past it.
        const detail = bodyRef.current?.querySelector<HTMLElement>(
          '[data-editor-detail]',
        );
        if (!detail) return;
        // Its own scroll (computer layout) restarts at the top; otherwise
        // the page brings it under the sticky section bar, where its scroll
        // margin (--editor-bar) lands it.
        detail.scrollTop = 0;
        if (
          detail.getBoundingClientRect().top <
          parseFloat(getComputedStyle(detail).scrollMarginTop)
        )
          detail.scrollIntoView({ block: 'start' });

        return;
      }
      // Phone (28 October 2026): the page opens from its start, under the
      // condensed record bar, with its sticky title and back button. Its
      // section is aimed at, not the title: a stuck title reports its stuck
      // place, not its own.
      const heading = bodyRef.current?.querySelector<HTMLElement>(
        '[data-editor-heading]',
      );
      heading
        ?.closest<HTMLElement>('[data-editor-page]')
        ?.scrollIntoView({ block: 'start' });
      heading?.focus({ preventScroll: true });
    });
  };
  // Choosing a pole opens its first page; on a narrow screen its page list
  // stays shown. A running search keeps covering every pole.
  const selectPole = (poleKey: string): void => {
    const categories =
      PERMISSION_EDITOR_POLES.find((pole) => pole.key === poleKey)
        ?.categories ?? [];
    const first = grantedOnly ? categories.find(hasGranted) : categories[0];
    if (!first) return;
    onSelectedPageChange(first.key);
    requestAnimationFrame(() => {
      const detail = bodyRef.current?.querySelector<HTMLElement>(
        '[data-editor-detail]',
      );
      if (detail) detail.scrollTop = 0;
    });
  };
  // The filters sit in the header, shown with the list on a phone: a new
  // filter keeps the list, never reopens a page hidden behind it.
  const changeFilter = (next: PermissionListFilter): void => {
    setFilter(next);
    setNarrowView('list');
  };
  const showPageList = (): void => {
    setNarrowView('list');
    requestAnimationFrame(() => {
      const button = findVisiblePageButton(
        selectedCategory?.key ?? selectedPageKey,
      );
      button?.scrollIntoView({ block: 'center' });
      button?.focus({ preventScroll: true });
    });
  };

  const renderRow = (
    permission: PermissionItem,
    category: PermissionEditorCategory,
    isPageAccess = false,
    sharedBlockedReason: string | null = null,
  ): React.ReactNode => (
    <PermissionRow
      key={permission.key}
      accessKey={
        category.scope === 'page' ? category.accessPermissionKey : undefined
      }
      cascade={
        activeCascade?.key === permission.key
          ? { message: activeCascade.message, onUndo: undoCascade }
          : null
      }
      changed={changedPermissionKeys.has(permission.key)}
      disabled={disabled}
      getDecision={getDecision}
      sharedBlockedReason={sharedBlockedReason}
      isPageAccess={isPageAccess}
      onChange={changePermission}
      permission={permission}
      role={role}
      state={state}
    />
  );

  const renderPage = (category: PermissionEditorCategory): React.ReactNode => {
    const result = countCategory(category);
    const accessPermission =
      category.scope === 'page'
        ? category.permissions.find(
            (item) => item.key === category.accessPermissionKey,
          )
        : undefined;
    const shown = (item: PermissionItem): boolean =>
      !grantedOnly || isListed(item.key);
    const groups = groupByModule(
      category.permissions.filter(
        (item) => item !== accessPermission && shown(item),
      ),
    );
    const pageOverrides = category.permissions.filter((item) =>
      permissionsMap.has(item.key),
    );
    // A reason shared by several blocked switches is said once at the top;
    // those rows keep only a lock (26 October 2026).
    const blockedReasons = editable
      ? category.permissions
          .filter((item) => item.grantable && shown(item))
          .map((item) => {
            const decision = getDecision(
              item.key,
              state.configured.get(item.key) ? 'deny' : 'allow',
            );

            return decision.allowed
              ? null
              : (decision.reason ?? 'Action non autorisée');
          })
      : [];
    const reasonCounts = new Map<string, number>();
    for (const reason of blockedReasons)
      if (reason) reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
    const pageBlockedReason =
      [...reasonCounts]
        .filter(([, count]) => count > 1)
        .sort(([, first], [, second]) => second - first)[0]?.[0] ?? null;

    return (
      <section
        aria-label={`Autorisations de la page ${category.label}`}
        className={styles.page}
        data-editor-page
      >
        {/* On a phone this line sticks under the record bar, with the way
            back to the pages; a direct child of the page so it stays stuck
            over all its permissions (28 October 2026). */}
        <div className={styles.pageHeader} data-page-header>
          <Button
            aria-label="Toutes les pages"
            className={styles.backButton}
            onClick={showPageList}
            size="icon"
            type="button"
            variant="ghost"
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
          </Button>
          <h3
            className="text-foreground text-base font-semibold outline-none"
            data-editor-heading
            tabIndex={-1}
          >
            {category.label}
          </h3>
          <Badge variant="outline">
            {result.ready}/{result.total} utilisables
          </Badge>
          {category.assignment === 'role-bound' && (
            <Badge variant="outline">Géré par le rôle</Badge>
          )}
          {result.incomplete > 0 && (
            <Badge variant="outline" className="text-warning">
              {result.incomplete} à compléter
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-muted-foreground text-xs leading-5">
              {category.description}
            </p>
          </div>
          {/* Grouped on the right, never spread across the header. */}
          <div className="flex flex-wrap items-center gap-1">
            {pageOverrides.length > 0 && editable && (
              <PermissionDecisionButton
                accessibleLabel="Retirer les autorisations de cette page"
                decision={getBatchDecision(
                  buildReset(category.permissions.map((item) => item.key)),
                )}
                onClick={() =>
                  reset(category.permissions.map((item) => item.key))
                }
                variant="ghost"
                size="sm"
              >
                <X className="size-3.5" />
                Retirer cette page
              </PermissionDecisionButton>
            )}
            {grantedOnly && grantedPermissionCount > 0 && editable && (
              <PermissionDecisionButton
                accessibleLabel="Retirer toutes les autorisations"
                decision={getBatchDecision(buildReset(ACCESS_KEYS))}
                onClick={() => reset(ACCESS_KEYS)}
                variant="ghost"
                size="sm"
              >
                <X className="size-3.5" />
                Tout retirer
              </PermissionDecisionButton>
            )}
          </div>
        </div>
        {pageBlockedReason && (
          <p className={styles.blockedReason} role="note">
            <LockKeyhole aria-hidden="true" className="size-3.5 shrink-0" />
            {pageBlockedReason}
          </p>
        )}
        {accessPermission &&
          shown(accessPermission) &&
          renderRow(accessPermission, category, true, pageBlockedReason)}
        {[...groups].map(([module, items]) => (
          <section key={module} className={styles.group} aria-label={module}>
            <h4 className={styles.groupHeading}>{module}</h4>
            <div className={styles.rows}>
              {items.map((item) =>
                renderRow(item, category, false, pageBlockedReason),
              )}
            </div>
          </section>
        ))}
        {groups.size === 0 && !grantedOnly && (
          <p className="text-muted-foreground flex items-center gap-2 text-xs">
            <ShieldCheck className="size-4" />
            Cette page se pilote uniquement avec son autorisation d’accès.
          </p>
        )}
      </section>
    );
  };

  const renderResults = (): React.ReactNode => {
    const groups = resultGroups ?? [];
    const count = groups.reduce((sum, group) => sum + group.items.length, 0);

    return (
      <section aria-label="Résultats de recherche" className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <h3
              className="text-foreground text-base font-semibold outline-none"
              data-editor-heading
              tabIndex={-1}
            >
              {`Résultats pour « ${query.trim()} »`}
            </h3>
            <p
              aria-live="polite"
              className="text-muted-foreground text-xs leading-5"
            >
              {count === 0
                ? 'Aucune autorisation ne correspond à cette recherche.'
                : `${count} autorisation${count > 1 ? 's' : ''}, toutes pages confondues.`}
            </p>
          </div>
        </div>
        {groups.map(({ category, items, pole }) => (
          <section
            key={category.key}
            className={styles.group}
            aria-label={`${pole.label}, ${category.label}`}
          >
            <h4
              className={`${styles.groupHeading} ${styles.resultHeading}`}
              data-result-heading={category.key}
              tabIndex={-1}
            >
              {pole.label} · {category.label}
            </h4>
            <div className={styles.rows}>
              {items.map((item) => renderRow(item, category))}
            </div>
          </section>
        ))}
      </section>
    );
  };

  return (
    <div
      className={styles.editor}
      data-narrow-view={resultsActive ? 'results' : shownNarrowView}
      data-workspace={workspace}
    >
      <AuthorizationsHeader
        aside={roleControl}
        note={roleNotice}
        summary={
          <>
            {disabled && !completeAccess && (
              <Badge variant="outline">Lecture seule</Badge>
            )}
            <span>
              {completeAccess
                ? 'Toutes les autorisations administratives'
                : `${usable.ready} sur ${usable.total} utilisables`}
            </span>
            <PermissionInfoButton
              description={
                completeAccess
                  ? 'Un administrateur possède toutes les autorisations administratives ; seul le superadmin gère les administrateurs.'
                  : 'Un utilisateur n’a que les autorisations accordées ici. Activer une autorisation active aussi ses prérequis ; la retirer retire celles qui en dépendent. Les changements prennent effet après enregistrement.'
              }
              label="Fonctionnement des autorisations"
            />
            <PermissionListFilters
              filter={filter}
              grantedCount={grantedCount}
              onFilterChange={changeFilter}
              totalCount={ALL_PERMISSIONS.length}
            />
          </>
        }
      />
      <div
        className={styles.body}
        data-narrow-view={shownNarrowView}
        data-results={resultsActive}
        ref={bodyRef}
      >
        <div
          className={`${styles.navigationPane} thin-scrollbar`}
          tabIndex={workspace ? -1 : undefined}
        >
          <PermissionNavigation
            countCategory={countCategory}
            onQueryChange={setQuery}
            onSelectPage={selectPage}
            onSelectPole={selectPole}
            query={query}
            changedPermissionKeys={changedPermissionKeys}
            isPageListed={grantedOnly ? hasGranted : undefined}
            onJumpToResult={jumpToResult}
            results={resultGroups}
            openedPageKey={pageOpened ? (selectedCategory?.key ?? '') : ''}
            selectedPageKey={selectedCategory?.key ?? ''}
          />
        </div>
        <div
          aria-label={workspace ? 'Autorisations affichées' : undefined}
          className={`${styles.detailPane} thin-scrollbar`}
          data-editor-detail
          role={workspace ? 'region' : undefined}
          tabIndex={workspace ? 0 : undefined}
        >
          {resultsActive ? (
            renderResults()
          ) : nothingListed ? (
            <p className="text-muted-foreground text-sm">
              Aucune autorisation n’est accordée.
            </p>
          ) : (
            selectedCategory && renderPage(selectedCategory)
          )}
        </div>
      </div>
    </div>
  );
};
