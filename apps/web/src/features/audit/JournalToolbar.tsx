'use client';

import {
  Download,
  Loader2,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { type FC, useEffect, useRef, useState } from 'react';

import { Button } from '$ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '$ui/dropdown-menu';
import { Input } from '$ui/input';
import { Label } from '$ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '$ui/select';
import { cn } from '$utils/css.utils';

import {
  type ActiveFilterChip,
  ACTIVITY_ACTION_OPTIONS,
  ALL_FILTER_VALUE,
  AUDIT_CATEGORY_OPTIONS,
  CONNECTION_ACTION_OPTIONS,
  getPageOptions,
  JOURNAL_POLE_OPTIONS,
  type JournalExportFormat,
  type JournalFilters,
  normalizeJournalSearch,
  PERIOD_OPTIONS,
  toDateInputValue,
  toIsoDateBoundary,
  validateJournalDateRange,
} from './journal-filters';

const FilterSelect: FC<{
  className?: string;
  disabled?: boolean;
  id: string;
  label: string;
  onChange: (value: string) => void;
  onCloseAutoFocus?: (event: Event) => void;
  options: readonly { label: string; value: string }[];
  value: string;
}> = ({
  className,
  disabled,
  id,
  label,
  onChange,
  onCloseAutoFocus,
  options,
  value,
}) => (
  <div className={cn('min-w-0', className)}>
    <Label className="text-muted-foreground mb-1.5 block text-xs" htmlFor={id}>
      {label}
    </Label>
    <Select disabled={disabled} onValueChange={onChange} value={value}>
      <SelectTrigger
        className="h-11 w-full min-w-0 rounded-[8px] shadow-none lg:h-10"
        id={id}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        className="animate-none! rounded-[8px] shadow-none"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        {!options.some((option) => option.value === value) && (
          <SelectItem value={value}>{value}</SelectItem>
        )}
        {options.map((option) => (
          <SelectItem
            className="min-h-11 rounded-md lg:min-h-10"
            key={option.value}
            value={option.value}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

export const JournalToolbar: FC<{
  activeFilterChips: ActiveFilterChip[];
  canExport: boolean;
  exportBlocked: boolean;
  filters: JournalFilters;
  isExporting: boolean;
  onExport: (format: JournalExportFormat) => void;
  onFilter: (patch: Partial<JournalFilters>) => void;
  onRefresh: () => void;
  onRemove: (key: keyof JournalFilters) => void;
  onReset: () => void;
  onSearch: (value: string) => void;
  refreshing: boolean;
  search: string;
}> = ({
  activeFilterChips,
  canExport,
  exportBlocked,
  filters,
  isExporting,
  onExport,
  onFilter,
  onRefresh,
  onRemove,
  onReset,
  onSearch,
  refreshing,
  search,
}) => {
  const [advanced, setAdvanced] = useState(
    filters.action !== ALL_FILTER_VALUE ||
      filters.category !== ALL_FILTER_VALUE ||
      filters.poleKey !== ALL_FILTER_VALUE ||
      Boolean(filters.entityId),
  );
  const [custom, setCustom] = useState(filters.period === 'custom');
  const [from, setFrom] = useState(toDateInputValue(filters.from));
  const [to, setTo] = useState(toDateInputValue(filters.to));
  const [dateError, setDateError] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const filterButton = useRef<HTMLButtonElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const fromInput = useRef<HTMLInputElement>(null);
  const focusDateOnClose = useRef(false);
  const toInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setCustom(filters.period === 'custom');
    setFrom(toDateInputValue(filters.from));
    setTo(toDateInputValue(filters.to));
    setDateError(null);
  }, [filters.from, filters.period, filters.to]);
  const datesPending =
    custom &&
    (filters.period !== 'custom' ||
      from !== toDateInputValue(filters.from) ||
      to !== toDateInputValue(filters.to));
  const searchTooShort =
    search.trim().length > 0 && !normalizeJournalSearch(search);
  const searchPending = normalizeJournalSearch(search) !== filters.search;
  const busy = refreshing || isExporting;
  const exportAvailable = !(
    busy ||
    exportBlocked ||
    datesPending ||
    searchPending ||
    searchTooShort
  );

  const changePeriod = (period: string): void => {
    setDateError(null);
    setCustom(period === 'custom');
    if (period !== 'custom') {
      onFilter({ from: '', period, to: '' });

      return;
    }
    if (!from || !to) {
      const end = new Date();
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      setFrom(start.toLocaleDateString('sv-SE'));
      setTo(end.toLocaleDateString('sv-SE'));
    }
    focusDateOnClose.current = true;
  };
  const applyDates = (): void => {
    const isoFrom = toIsoDateBoundary(from, false);
    const isoTo = toIsoDateBoundary(to, true);
    const error = validateJournalDateRange(isoFrom, isoTo);
    setDateError(error);
    if (error) {
      (from ? toInput : fromInput).current?.focus();

      return;
    }
    onFilter({ from: isoFrom, period: 'custom', to: isoTo });
  };
  const restoreFilterFocus = (): void => {
    window.requestAnimationFrame(() => filterButton.current?.focus());
  };

  return (
    <section
      aria-label="Filtres du journal"
      className="border-border-default bg-surface-panel-raised rounded-[8px] border p-4"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div
          aria-label="Journal à consulter"
          className="border-border-control bg-surface-control inline-flex rounded-[8px] border p-1"
          role="group"
        >
          {(['activity', 'connections'] as const).map((logType) => (
            <Button
              key={logType}
              type="button"
              variant="ghost"
              aria-pressed={filters.logType === logType}
              className={cn(
                'h-11 rounded-md px-3 lg:h-10',
                filters.logType === logType &&
                  'bg-surface-navigation-active text-foreground',
              )}
              onClick={() => onFilter({ action: ALL_FILTER_VALUE, logType })}
            >
              {logType === 'activity' ? 'Activité' : 'Connexions'}
            </Button>
          ))}
        </div>
        {canExport && (
          <DropdownMenu
            open={exportOpen}
            onOpenChange={(open) => setExportOpen(open && exportAvailable)}
          >
            <DropdownMenuTrigger asChild>
              <Button
                className="h-11 rounded-[8px] lg:h-10"
                variant="outline"
                aria-disabled={
                  busy ||
                  exportBlocked ||
                  datesPending ||
                  searchPending ||
                  searchTooShort
                }
                onClick={(event) => {
                  if (
                    busy ||
                    exportBlocked ||
                    datesPending ||
                    searchPending ||
                    searchTooShort
                  )
                    event.preventDefault();
                }}
              >
                {isExporting ? (
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                ) : (
                  <Download aria-hidden="true" className="size-4" />
                )}{' '}
                {isExporting ? 'Export en cours…' : 'Exporter'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-80 animate-none! rounded-[8px] shadow-none"
            >
              <p className="text-muted-foreground px-2 py-2 text-xs leading-5">
                Tous les événements correspondant aux filtres appliqués, au
                moment de l’export. Jusqu’à 50 000 événements, les plus récents
                en premier.
              </p>
              <DropdownMenuItem
                className="min-h-11 lg:min-h-10"
                disabled={
                  busy ||
                  exportBlocked ||
                  datesPending ||
                  searchPending ||
                  searchTooShort
                }
                onSelect={() => onExport('csv')}
              >
                CSV — tableur
              </DropdownMenuItem>
              <DropdownMenuItem
                className="min-h-11 lg:min-h-10"
                disabled={
                  busy ||
                  exportBlocked ||
                  datesPending ||
                  searchPending ||
                  searchTooShort
                }
                onSelect={() => onExport('json')}
              >
                JSON — données structurées
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <div className="grid min-w-0 grid-cols-2 gap-3 @min-[36rem]/page:items-end @min-[64rem]/page:grid-cols-[minmax(0,1fr)_13rem_auto_auto]">
        <div className="col-span-2 min-w-0 @min-[36rem]/page:col-span-1">
          <Label
            className="text-muted-foreground mb-1.5 block text-xs"
            htmlFor="journal-search"
          >
            Auteur ou compte concerné
          </Label>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            />
            <Input
              aria-describedby="journal-search-help"
              className="h-11 rounded-[8px] pr-12 pl-9 lg:h-10"
              id="journal-search"
              maxLength={120}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Nom ou identifiant de connexion…"
              ref={searchInput}
              type="search"
              value={search}
            />
            {search && (
              <Button
                aria-label="Effacer la recherche"
                className="absolute top-0 right-0 size-11 rounded-[8px] lg:size-10"
                variant="ghost"
                size="icon"
                onClick={() => {
                  onSearch('');
                  searchInput.current?.focus();
                }}
              >
                <X aria-hidden="true" className="size-4" />
              </Button>
            )}
          </div>
        </div>
        <FilterSelect
          id="journal-period"
          className="col-span-2 @min-[36rem]/page:col-span-1"
          label="Période"
          value={custom ? 'custom' : filters.period}
          options={PERIOD_OPTIONS}
          onChange={changePeriod}
          onCloseAutoFocus={(event) => {
            if (!focusDateOnClose.current) return;
            event.preventDefault();
            focusDateOnClose.current = false;
            fromInput.current?.focus();
          }}
        />
        <Button
          ref={filterButton}
          aria-controls="journal-advanced-filters"
          aria-expanded={advanced}
          className="h-11 rounded-[8px] has-[>svg]:px-2 lg:h-10"
          variant="outline"
          onClick={() => setAdvanced(!advanced)}
        >
          <SlidersHorizontal aria-hidden="true" className="size-4" />
          Filtres
          {activeFilterChips.length > 0 && (
            <span className="text-muted-foreground">
              ({activeFilterChips.length})
            </span>
          )}
        </Button>
        <Button
          aria-controls="journal-events"
          aria-disabled={refreshing || searchPending || datesPending}
          className="h-11 rounded-[8px] has-[>svg]:px-2 lg:h-10"
          variant="outline"
          onClick={() => {
            if (!refreshing && !searchPending && !datesPending) onRefresh();
          }}
        >
          <RefreshCw
            aria-hidden="true"
            className={cn('size-4', refreshing && 'animate-spin')}
          />
          Actualiser
        </Button>
      </div>
      <p
        className="text-muted-foreground mt-2 text-xs leading-5"
        id="journal-search-help"
      >
        {searchTooShort
          ? 'Saisissez au moins 3 lettres ou chiffres pour lancer la recherche.'
          : 'Recherche par nom ou identifiant de compte · 3 lettres ou chiffres minimum.'}
      </p>
      {advanced && (
        <div
          className="border-border-divider mt-4 grid min-w-0 gap-3 border-t pt-4 @min-[36rem]/page:grid-cols-2 @min-[64rem]/page:grid-cols-4"
          id="journal-advanced-filters"
        >
          <FilterSelect
            id="journal-action"
            label="Action"
            value={filters.action}
            options={
              filters.logType === 'connections'
                ? CONNECTION_ACTION_OPTIONS
                : ACTIVITY_ACTION_OPTIONS
            }
            onChange={(action) => onFilter({ action })}
          />
          {filters.logType === 'activity' && (
            <>
              <FilterSelect
                id="journal-category"
                label="Catégorie"
                value={filters.category}
                options={AUDIT_CATEGORY_OPTIONS}
                onChange={(category) => onFilter({ category })}
              />
              <FilterSelect
                id="journal-pole"
                label="Pôle"
                value={filters.poleKey}
                options={JOURNAL_POLE_OPTIONS}
                onChange={(poleKey) =>
                  onFilter({ pageKey: ALL_FILTER_VALUE, poleKey })
                }
              />
              <FilterSelect
                id="journal-page"
                label="Page"
                disabled={
                  filters.poleKey === ALL_FILTER_VALUE &&
                  filters.pageKey === ALL_FILTER_VALUE
                }
                value={filters.pageKey}
                options={getPageOptions(filters.poleKey)}
                onChange={(pageKey) => onFilter({ pageKey })}
              />
            </>
          )}
        </div>
      )}
      {custom && (
        <div className="border-border-divider mt-4 border-t pt-4">
          <div className="grid min-w-0 gap-3 @min-[36rem]/page:grid-cols-2 @min-[36rem]/page:items-end @min-[48rem]/page:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <div className="min-w-0">
              <Label className="mb-1.5 block text-xs" htmlFor="journal-from">
                Date de début
              </Label>
              <Input
                ref={fromInput}
                id="journal-from"
                aria-invalid={Boolean(dateError)}
                aria-describedby={`journal-date-help${dateError ? ' journal-date-error' : ''}`}
                className="h-11 min-w-0 rounded-[8px] lg:h-10"
                type="date"
                value={from}
                onChange={(event) => {
                  setFrom(event.target.value);
                  setDateError(null);
                }}
              />
            </div>
            <div className="min-w-0">
              <Label className="mb-1.5 block text-xs" htmlFor="journal-to">
                Date de fin
              </Label>
              <Input
                ref={toInput}
                id="journal-to"
                aria-invalid={Boolean(dateError)}
                aria-describedby={`journal-date-help${dateError ? ' journal-date-error' : ''}`}
                className="h-11 min-w-0 rounded-[8px] lg:h-10"
                type="date"
                value={to}
                onChange={(event) => {
                  setTo(event.target.value);
                  setDateError(null);
                }}
              />
            </div>
            <Button
              className="h-11 rounded-[8px] lg:h-10"
              variant="outline"
              onClick={applyDates}
            >
              Appliquer la période
            </Button>
          </div>
          <p
            className="text-muted-foreground mt-2 text-xs leading-5"
            id="journal-date-help"
          >
            Journées complètes dans votre fuseau (
            {Intl.DateTimeFormat().resolvedOptions().timeZone}). Maximum 366
            jours.{datesPending && ' Période modifiée, non appliquée.'}
          </p>
          {dateError && (
            <p
              className="text-destructive mt-2 text-sm"
              id="journal-date-error"
              role="alert"
            >
              {dateError}
            </p>
          )}
        </div>
      )}
      {activeFilterChips.length > 0 && (
        <div
          className="border-border-divider mt-4 flex flex-wrap items-center gap-2 border-t pt-3"
          aria-label="Filtres appliqués"
        >
          {activeFilterChips.map((chip) => (
            <Button
              key={chip.key}
              aria-label={`Retirer le filtre ${chip.label}`}
              className="h-auto min-h-11 max-w-full gap-2 rounded-[8px] px-2 py-2 text-xs lg:min-h-10"
              variant="outline"
              onClick={() => {
                onRemove(chip.key);
                restoreFilterFocus();
              }}
            >
              <span className="truncate">{chip.label}</span>
              <X aria-hidden="true" className="size-3.5 shrink-0" />
            </Button>
          ))}
          <Button
            className="h-11 rounded-[8px] px-2 lg:h-10"
            variant="ghost"
            onClick={() => {
              setCustom(false);
              setDateError(null);
              onReset();
              restoreFilterFocus();
            }}
          >
            Réinitialiser
          </Button>
        </div>
      )}
    </section>
  );
};
