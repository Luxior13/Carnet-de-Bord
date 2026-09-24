import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { InternalNewsFeed } from '$features/internal-news/components/InternalNewsFeed';
import type { InternalNewsItem } from '$features/internal-news/internal-news.types';

const announcement: InternalNewsItem = {
  actor: { displayName: 'Équipe', loginName: null },
  body: 'Information de test.',
  href: null,
  id: 'announcement:test',
  isPinned: true,
  kind: 'ANNOUNCEMENT',
  occurredAt: '2026-09-24T10:00:00Z',
  title: 'Annonce épinglée',
};

describe('internal news empty state', () => {
  it.each([
    [[], [], true],
    [[announcement], [], false],
    [[], [{ ...announcement, isPinned: false }], false],
    [
      [announcement],
      [{ ...announcement, id: 'announcement:other', isPinned: false }],
      false,
    ],
  ] as [InternalNewsItem[], InternalNewsItem[], boolean][])(
    'only announces an empty feed when both collections are empty',
    (pinned, items, empty) => {
      const html = renderToStaticMarkup(
        createElement(InternalNewsFeed, {
          canManage: false,
          initialState: {
            data: {
              items,
              pagination: {
                hasMore: false,
                limit: 25,
                nextCursor: null,
                snapshotAt: '2026-09-24T10:00:00Z',
              },
              pinned,
            },
          },
          onContentChanged: () => undefined,
          refreshVersion: 0,
        }),
      );
      expect(html.includes('Aucune actualité pour le moment')).toBe(empty);
      if (pinned.length > 0) expect(html).toContain('À la une');
    },
  );
});
