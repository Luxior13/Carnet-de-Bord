import { describe, expect, it } from 'vitest';

import { getNavigationSpaceItems, NAV_SPACES } from '$constants/app.constants';
import { RESERVED_PLANNED_HREFS } from '$constants/reserved-planned-hrefs.constants';
import {
  ROADMAP_AREAS,
  ROADMAP_ITEMS,
  ROADMAP_PHASES,
} from '$features/roadmap/roadmap.constants';

describe('roadmap planning contracts', () => {
  it('keeps every historical planned destination covered after regrouping', () => {
    const covered = new Set(
      ROADMAP_ITEMS.flatMap((item) => item.legacyHrefs ?? []),
    );
    for (const href of RESERVED_PLANNED_HREFS)
      expect(covered.has(href), href).toBe(true);
    const live = NAV_SPACES.flatMap(getNavigationSpaceItems);
    expect(live.every((item) => item.availability === 'live')).toBe(true);
    expect(live.every((item) => !RESERVED_PLANNED_HREFS.has(item.href))).toBe(
      true,
    );
  });

  it('has unique identities and valid area and phase references', () => {
    expect(new Set(ROADMAP_ITEMS.map((item) => item.id)).size).toBe(
      ROADMAP_ITEMS.length,
    );
    for (const item of ROADMAP_ITEMS) {
      expect(ROADMAP_AREAS.some((area) => area.id === item.area)).toBe(true);
      expect(ROADMAP_PHASES.some((phase) => phase.id === item.phase)).toBe(
        true,
      );
      if (item.status === 'partial')
        expect(item.baseline?.length).toBeGreaterThan(0);
    }
  });

  it('defines an achievable dependency graph without missing or later prerequisites', () => {
    const items = new Map(ROADMAP_ITEMS.map((item) => [item.id, item]));
    const visit = (id: string, ancestors: Set<string>): void => {
      expect(ancestors.has(id), `Dependency cycle at ${id}`).toBe(false);
      const item = items.get(id);
      expect(item, `Missing dependency ${id}`).toBeDefined();
      if (!item) return;
      for (const dependency of item.dependsOn) {
        expect(
          items.get(dependency)?.phase,
          `${id} requires ${dependency}`,
        ).toBeLessThanOrEqual(item.phase);
        visit(dependency, new Set([...ancestors, id]));
      }
    };
    for (const item of ROADMAP_ITEMS) visit(item.id, new Set());
  });
});
