import { describe, expect, it } from 'vitest';

import { ROADMAP_ITEMS } from '$features/roadmap/roadmap.constants';
import {
  getRoadmapQueryCorrection,
  getVisibleRoadmapItems,
  readRoadmapFilters,
} from '$features/roadmap/roadmap-search';

const search = (query: string): string[] =>
  getVisibleRoadmapItems({ areaId: 'all', phase: null, query }).map(
    (item) => item.id,
  );

describe('roadmap local search and URL filters', () => {
  it('bounds external searches and rejects unknown filters as displayed', () => {
    const params = new URLSearchParams({
      phase: '99',
      pole: 'private',
      q: 'a'.repeat(250),
    });
    expect(readRoadmapFilters(params)).toEqual({
      areaId: 'all',
      phase: null,
      query: 'a'.repeat(200),
    });
    expect(getRoadmapQueryCorrection(params)).toEqual({
      phase: null,
      pole: null,
      q: 'a'.repeat(200),
    });
  });

  it('makes duplicate and neutral parameters unambiguous without touching others', () => {
    const params = new URLSearchParams(
      'phase=2&phase=3&pole=all&q=&q=planning&keep=yes',
    );
    expect(readRoadmapFilters(params)).toEqual({
      areaId: 'all',
      phase: 2,
      query: '',
    });
    const correction = getRoadmapQueryCorrection(params);
    expect(correction).toEqual({ phase: '2', pole: null, q: null });
    for (const [key, value] of Object.entries(correction ?? {})) {
      if (value === null) params.delete(key);
      else params.set(key, value);
    }
    expect(params.toString()).toBe('phase=2&keep=yes');
    expect(getRoadmapQueryCorrection(params)).toBeNull();
  });

  it('leaves valid input untouched while a user types spaces or accented words', () => {
    const params = new URLSearchParams({
      phase: '2',
      pole: 'esport',
      q: '  Équipes ',
    });
    expect(readRoadmapFilters(params).query).toBe('  Équipes ');
    expect(getRoadmapQueryCorrection(params)).toBeNull();
    expect(getRoadmapQueryCorrection(new URLSearchParams())).toBeNull();
  });

  it('combines every word independently of accents, case, punctuation and order', () => {
    expect(search('SAISONS, équipes')).toEqual(search('equipes saisons'));
    expect(search('SAISONS, équipes')).toContain('sport-teams');
    expect(search('equipes saisons motabsentduchantier')).toEqual([]);
  });

  it('searches the delivery criterion, even while its disclosure is collapsed', () => {
    expect(search('anciennes rencontres')).toContain('sport-teams');
    expect(search('nOuVeLLe identité')).toContain('person-relationships');
  });

  it('intersects the search, target area and phase rather than replacing a criterion', () => {
    expect(
      getVisibleRoadmapItems({
        areaId: 'esport',
        phase: 2,
        query: 'anciennes rencontres',
      }).map((item) => item.id),
    ).toEqual(['sport-teams']);
    expect(
      getVisibleRoadmapItems({
        areaId: 'esport',
        phase: 3,
        query: 'anciennes rencontres',
      }),
    ).toEqual([]);
    expect(
      getVisibleRoadmapItems({
        areaId: 'people',
        phase: 2,
        query: 'anciennes rencontres',
      }),
    ).toEqual([]);
  });

  it('returns the entire unchanged catalogue when neutral criteria are restored', () => {
    const before = ROADMAP_ITEMS.map((item) => item.id);
    expect(search('   , +   ')).toEqual(before);
    expect(
      getVisibleRoadmapItems(readRoadmapFilters(new URLSearchParams())),
    ).toEqual(ROADMAP_ITEMS);
    expect(ROADMAP_ITEMS.map((item) => item.id)).toEqual(before);
  });
});
