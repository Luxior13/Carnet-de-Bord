'use client';

import { ClipboardList } from 'lucide-react';
import React, { useEffect, useRef } from 'react';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { ContentState } from '$components/layout/ContentState';
import { Disclosure } from '$components/layout/Disclosure';
import { PageIdentityHero } from '$components/layout/PageIdentityHero';
import { getNavigationIcon } from '$constants/navigation-icon.constants';
import { getNavigationSpaceToneClasses } from '$constants/navigation-theme.constants';
import { usePageQuery } from '$hooks/usePageQuery';
import { Badge } from '$ui/badge';
import { Button } from '$ui/button';
import directoryStyles from '$ui/directory.module.css';
import { Label } from '$ui/label';
import { ListSearchField } from '$ui/list-search-field';
import { PageCanvas, PageShell } from '$ui/page-shell';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '$ui/select';
import { ServiceIcon } from '$ui/service-icon';
import { cn } from '$utils/css.utils';

import {
  ROADMAP_AREAS,
  ROADMAP_ITEMS,
  ROADMAP_PHASES,
} from './roadmap.constants';
import type { RoadmapPhaseId } from './roadmap.types';
import {
  getRoadmapQueryCorrection,
  getVisibleRoadmapItems,
  readRoadmapFilters,
  ROADMAP_SEARCH_MAX_LENGTH,
} from './roadmap-search';
import { RoadmapCard } from './RoadmapCard';

export function RoadmapPage(): React.ReactNode {
  const { searchParams, updateQuery } = usePageQuery();
  const filtersRef = useRef<HTMLDivElement>(null);
  const setPhase = (value: RoadmapPhaseId | null): void =>
    updateQuery({ phase: value === null ? null : String(value) });
  const { areaId, phase, query } = readRoadmapFilters(searchParams);
  const visibleItems = getVisibleRoadmapItems({ areaId, phase, query });
  useEffect(() => {
    // History writes are synchronous; normalize the current URL, never an old render.
    const correction = getRoadmapQueryCorrection(
      new URLSearchParams(window.location.search),
    );
    if (correction) updateQuery(correction, 'replace');
  }, [searchParams, updateQuery]);
  const resetFilters = (): void => {
    updateQuery({ phase: null, pole: null, q: null });
    filtersRef.current
      ?.querySelector<HTMLInputElement>('input[type="search"]')
      ?.focus();
  };

  return (
    <AuthenticatedLayout
      breadcrumbs={[{ label: 'Système' }, { label: 'Feuille de route' }]}
    >
      <PageShell className="py-0">
        <PageCanvas contentClassName="space-y-6">
          <PageIdentityHero
            description="Construire la gestion de la structure esport, de l’association d’aujourd’hui à une éventuelle société."
            icon={<ClipboardList aria-hidden="true" />}
            meta={
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  {ROADMAP_ITEMS.length} chantiers
                </Badge>
                <Badge variant="outline">
                  {ROADMAP_AREAS.length} pôles cibles
                </Badge>
                <Badge variant="outline">{ROADMAP_PHASES.length} étapes</Badge>
              </div>
            }
            title="Feuille de route"
          />
          <Disclosure
            className="border-border-divider border-b pb-4"
            label="Comprendre les étapes et les principes du projet"
          >
            <div className="space-y-5 pt-4">
              <ContentState
                title="Le plan de construction"
                description="Ce catalogue est visible par tous les comptes connectés. Il présente les nouveaux modules et les fonctions existantes à compléter. Les étapes donnent un ordre de priorité, sans date de livraison promise."
                icon={<ClipboardList className="size-4" />}
              />
              <section
                aria-labelledby="roadmap-phases-title"
                className="space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2
                    id="roadmap-phases-title"
                    className="text-base font-semibold"
                  >
                    Dans quel ordre ?
                  </h2>
                  <Button
                    size="sm"
                    variant="outline"
                    aria-pressed={phase === null}
                    onClick={() => setPhase(null)}
                  >
                    Toutes les étapes
                  </Button>
                </div>
                <ol className="grid gap-2 @min-[32rem]/page:grid-cols-2 @min-[60rem]/page:grid-cols-3">
                  {ROADMAP_PHASES.map((step) => (
                    <li key={step.id}>
                      <Button
                        type="button"
                        variant="outline"
                        size="inline"
                        aria-pressed={phase === step.id}
                        onClick={() =>
                          setPhase(phase === step.id ? null : step.id)
                        }
                        className={cn(
                          'block h-full w-full rounded-lg border p-3 text-left',
                          phase === step.id
                            ? 'border-primary bg-primary/10'
                            : 'border-border bg-card hover:bg-accent',
                        )}
                      >
                        <span className="text-sm font-medium">
                          {step.id}. {step.label}
                        </span>
                        <span className="text-muted-foreground mt-1 block text-xs leading-5">
                          {step.description}
                        </span>
                      </Button>
                    </li>
                  ))}
                </ol>
                <p className="text-muted-foreground text-sm">
                  Les obligations déjà présentes et les besoins urgents passent
                  en priorité. L’espace personnel se complète à mesure que les
                  modules sont livrés.
                </p>
              </section>
              <Disclosure
                className="border-border rounded-lg border p-4 text-sm"
                label="Les principes retenus et le socle disponible"
              >
                <ul className="text-muted-foreground mt-3 list-disc space-y-2 pl-5 leading-6">
                  <li>
                    Déjà présents : comptes et sécurité, répertoire, paramètres
                    techniques et recherche de pages.
                  </li>
                  <li>
                    Une personne garde la même identité ; ses adhésions, rôles
                    et affectations ont leur propre historique.
                  </li>
                  <li>
                    Association et société peuvent avoir des contrats et
                    finances séparés. Les anciens dossiers gardent leur entité
                    d’origine.
                  </li>
                  <li>
                    Facture, paiement, budget et remboursement suivent des
                    parcours distincts.
                  </li>
                  <li>
                    Le quotidien esport arrive tôt : effectifs, disponibilités,
                    entraînements et convocations.
                  </li>
                  <li>
                    Les vues partagées évitent les doublons ; un chantier ne
                    correspond pas forcément à une nouvelle entrée de menu.
                  </li>
                </ul>
              </Disclosure>
            </div>
          </Disclosure>
          <div
            ref={filtersRef}
            className="border-border-content bg-surface-content-header rounded-panel grid gap-3 border p-4 @min-[44rem]/page:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] @min-[44rem]/page:items-end"
          >
            <div
              className={cn(
                directoryStyles.directory,
                'space-y-1.5 @min-[44rem]/page:col-span-3',
              )}
            >
              <Label htmlFor="roadmap-search">Rechercher un chantier</Label>
              <ListSearchField
                ariaLabel="Rechercher un chantier"
                id="roadmap-search"
                value={query}
                maxLength={ROADMAP_SEARCH_MAX_LENGTH}
                onValueChange={(value) =>
                  updateQuery(
                    { q: value.slice(0, ROADMAP_SEARCH_MAX_LENGTH) },
                    'replace',
                  )
                }
                onClear={() => updateQuery({ q: null }, 'replace')}
                placeholder="Disponibilités, factures, documents…"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="roadmap-area">Pôle cible</Label>
              <Select
                value={areaId}
                onValueChange={(value) =>
                  updateQuery({ pole: value === 'all' ? null : value })
                }
              >
                <SelectTrigger
                  id="roadmap-area"
                  className="w-full"
                  variant="compact"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent variant="compact">
                  <SelectItem value="all">Tous les pôles</SelectItem>
                  {ROADMAP_AREAS.map((area) => (
                    <SelectItem key={area.id} value={area.id}>
                      {area.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="roadmap-phase">Étape</Label>
              <Select
                value={phase === null ? 'all' : String(phase)}
                onValueChange={(value) =>
                  updateQuery({ phase: value === 'all' ? null : value })
                }
              >
                <SelectTrigger
                  id="roadmap-phase"
                  className="w-full"
                  variant="compact"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent variant="compact">
                  <SelectItem value="all">Toutes les étapes</SelectItem>
                  {ROADMAP_PHASES.map((step) => (
                    <SelectItem key={step.id} value={String(step.id)}>
                      {step.id}. {step.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={resetFilters}
              variant="outline"
              disabled={phase === null && areaId === 'all' && !query}
            >
              Réinitialiser
            </Button>
          </div>
          <p
            className="text-muted-foreground text-sm"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {visibleItems.length} chantier{visibleItems.length > 1 ? 's' : ''}{' '}
            affiché{visibleItems.length > 1 ? 's' : ''} sur{' '}
            {ROADMAP_ITEMS.length}
            {phase !== null ? ` · Étape ${phase}` : ''}
          </p>
          {ROADMAP_AREAS.map((area) => {
            const items = visibleItems
              .filter((item) => item.area === area.id)
              .sort((first, second) => first.phase - second.phase);
            if (!items.length) return null;
            const tone = getNavigationSpaceToneClasses(area.tone);
            const Icon = getNavigationIcon(area.icon);

            return (
              <section
                key={area.id}
                aria-labelledby={`roadmap-area-${area.id}`}
                className="border-border-content bg-surface-panel rounded-panel overflow-hidden border"
              >
                <div className="border-border-divider bg-surface-panel-header flex items-start gap-3 border-b px-4 py-4 @min-[40rem]/page:px-5">
                  <ServiceIcon className={cn('size-9', tone.icon)}>
                    <Icon className="size-4" />
                  </ServiceIcon>
                  <div>
                    <h2
                      id={`roadmap-area-${area.id}`}
                      className="text-base font-semibold"
                    >
                      {area.label}
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      {area.description}
                    </p>
                  </div>
                </div>
                <div className="grid items-start gap-3 p-4 @min-[32rem]/page:grid-cols-2 @min-[40rem]/page:px-5 @min-[60rem]/page:grid-cols-3">
                  {items.map((item) => (
                    <RoadmapCard key={item.id} item={item} />
                  ))}
                </div>
              </section>
            );
          })}
          {visibleItems.length === 0 && (
            <ContentState
              title="Aucun chantier ne correspond"
              description="Essayez un autre terme ou réinitialisez les filtres."
              layout="panel"
              action={
                <Button onClick={resetFilters} variant="outline">
                  Réinitialiser les filtres
                </Button>
              }
            />
          )}
        </PageCanvas>
      </PageShell>
    </AuthenticatedLayout>
  );
}
