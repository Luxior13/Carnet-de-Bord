import { normalizeSearchValue } from '$components/layout/global-search.utils';

import {
  ROADMAP_AREAS,
  ROADMAP_ITEMS,
  ROADMAP_PHASES,
} from './roadmap.constants';
import type {
  RoadmapAreaId,
  RoadmapItem,
  RoadmapPhaseId,
} from './roadmap.types';

export const ROADMAP_SEARCH_MAX_LENGTH = 200;

export type RoadmapFilters = {
  areaId: RoadmapAreaId | 'all';
  phase: RoadmapPhaseId | null;
  query: string;
};

export function readRoadmapFilters(
  params: Pick<URLSearchParams, 'get'>,
): RoadmapFilters {
  return {
    areaId:
      ROADMAP_AREAS.find((area) => area.id === params.get('pole'))?.id ?? 'all',
    phase:
      ROADMAP_PHASES.find((step) => String(step.id) === params.get('phase'))
        ?.id ?? null,
    query: (params.get('q') ?? '').slice(0, ROADMAP_SEARCH_MAX_LENGTH),
  };
}

/** Keep shared/reloaded URLs aligned with the filters actually displayed. */
export function getRoadmapQueryCorrection(
  params: URLSearchParams,
): Record<string, string | null> | null {
  const { areaId, phase, query } = readRoadmapFilters(params);
  const values = {
    phase: phase === null ? null : String(phase),
    pole: areaId === 'all' ? null : areaId,
    q: query || null,
  };
  const corrections = Object.fromEntries(
    Object.entries(values).filter(([key, value]) => {
      const entries = params.getAll(key);

      return value === null
        ? entries.length > 0
        : entries.length !== 1 || entries[0] !== value;
    }),
  );

  return Object.keys(corrections).length ? corrections : null;
}

export function getVisibleRoadmapItems({
  areaId,
  phase,
  query,
}: RoadmapFilters): RoadmapItem[] {
  const terms = normalizeSearchValue(query).split(' ').filter(Boolean);

  return ROADMAP_ITEMS.filter((item) => {
    if (phase !== null && item.phase !== phase) return false;
    if (areaId !== 'all' && item.area !== areaId) return false;
    if (!terms.length) return true;
    const area = ROADMAP_AREAS.find((candidate) => candidate.id === item.area);
    const text = normalizeSearchValue(
      [
        item.title,
        item.description,
        item.firstRelease,
        item.later,
        item.baseline,
        item.audience,
        item.doneWhen,
        area?.label,
      ].join(' '),
    );

    return terms.every((term) => text.includes(term));
  });
}
