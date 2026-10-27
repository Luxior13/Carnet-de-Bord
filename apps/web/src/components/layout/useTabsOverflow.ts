'use client';

import { type RefObject, useLayoutEffect, useState } from 'react';

export type TabsLayout<SectionId extends string> = {
  /**
   * `tabs`: every tab fits. `more`: the tabs that fit and a « Plus » menu.
   * `select`: a single section selector (narrow screens).
   */
  mode: 'more' | 'select' | 'tabs';
  visible: readonly SectionId[];
};

/** Below this width, a few cut tabs help less than one clear selector. */
const SELECT_BELOW_PX = 480;
const TAB_GAP_PX = 4;

/** Pure fitting rule, kept separate for the tests. */
export function fitTabs<SectionId extends string>({
  activeSection,
  available,
  ids,
  moreWidth,
  widths,
}: {
  activeSection: SectionId;
  available: number;
  ids: readonly SectionId[];
  moreWidth: number;
  widths: readonly number[];
}): TabsLayout<SectionId> {
  const total =
    widths.reduce((sum, width) => sum + width, 0) +
    TAB_GAP_PX * Math.max(0, widths.length - 1);
  if (total <= available) return { mode: 'tabs', visible: ids };
  if (available < SELECT_BELOW_PX) return { mode: 'select', visible: [] };

  const budget = available - moreWidth - TAB_GAP_PX;
  const fitted: number[] = [];
  let used = 0;
  for (const [index, width] of widths.entries()) {
    const next = used + (fitted.length > 0 ? TAB_GAP_PX : 0) + width;
    if (next > budget) break;
    fitted.push(index);
    used = next;
  }
  // The current section always stays visible, in its place in the order.
  const activeIndex = ids.indexOf(activeSection);
  if (activeIndex >= 0 && !fitted.includes(activeIndex)) {
    const activeWidth = widths.at(activeIndex) ?? 0;
    while (fitted.length > 0 && used + TAB_GAP_PX + activeWidth > budget) {
      const removed = fitted.pop() ?? 0;
      used -= (widths.at(removed) ?? 0) + (fitted.length > 0 ? TAB_GAP_PX : 0);
    }
    if (activeWidth > budget) return { mode: 'select', visible: [] };
    fitted.push(activeIndex);
  }

  return {
    mode: 'more',
    visible: fitted
      .sort((first, second) => first - second)
      .flatMap((index) => ids.at(index) ?? []),
  };
}

const sameLayout = <SectionId extends string>(
  first: TabsLayout<SectionId>,
  second: TabsLayout<SectionId>,
): boolean =>
  first.mode === second.mode &&
  first.visible.length === second.visible.length &&
  first.visible.every((id, index) => id === second.visible.at(index));

/**
 * Header tabs that do not fit (owner decision of 27 October 2026): measures
 * every tab in a hidden row and keeps the ones that fit beside « Plus ».
 */
export function useTabsOverflow<SectionId extends string>({
  activeSection,
  enabled,
  measureRef,
  navigationRef,
  sectionIds,
  sectionKey,
}: {
  activeSection: SectionId;
  enabled: boolean;
  measureRef: RefObject<HTMLElement | null>;
  navigationRef: RefObject<HTMLElement | null>;
  /** Changes when labels, icons or dirty markers change the tab widths. */
  sectionIds: readonly SectionId[];
  sectionKey: string;
}): TabsLayout<SectionId> {
  const [layout, setLayout] = useState<TabsLayout<SectionId>>({
    mode: 'tabs',
    visible: sectionIds,
  });

  useLayoutEffect(() => {
    const navigation = navigationRef.current;
    const measure = measureRef.current;
    if (!enabled || !navigation || !measure) {
      setLayout((current) => {
        const next = { mode: 'tabs' as const, visible: sectionIds };

        return sameLayout(current, next) ? current : next;
      });

      return undefined;
    }
    const update = (): void => {
      const width = (selector: string): number =>
        measure.querySelector<HTMLElement>(selector)?.offsetWidth ?? 0;
      const next = fitTabs({
        activeSection,
        available: navigation.clientWidth,
        ids: sectionIds,
        moreWidth: width('[data-measure="more"]'),
        widths: sectionIds.map((_, index) =>
          width(`[data-measure="tab-${index}"]`),
        ),
      });
      setLayout((current) => (sameLayout(current, next) ? current : next));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(navigation);
    // Late fonts change the tab widths without resizing the navigation.
    observer.observe(measure);

    return (): void => observer.disconnect();
    // sectionKey stands for the ids, labels and markers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, enabled, sectionKey]);

  return layout;
}
