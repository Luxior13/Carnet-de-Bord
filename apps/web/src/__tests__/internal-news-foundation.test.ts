import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { getNavigationItemByHref } from '$constants/app.constants';
import { FEATURES } from '$constants/feature-registry.constants';
import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import { getPartnerNewsCopy } from '$features/internal-news/internal-news.mapper';
import { getInternalNewsCapabilities } from '$features/internal-news/internal-news.permissions';
import {
  internalNewsListQuerySchema,
  publishInternalAnnouncementSchema,
  updateInternalAnnouncementPinSchema,
} from '$features/internal-news/internal-news.schemas';

const readSourceFile = (relativePath: string): string => {
  // Test-owned paths only; the helper never receives external input.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
};

const collectionRouteSource = readSourceFile(
  '../app/api/actualite-interne/route.ts',
);
const itemRouteSource = readSourceFile(
  '../app/api/actualite-interne/[id]/route.ts',
);
const serviceSource = readSourceFile(
  '../features/internal-news/server/internal-news.service.ts',
);
const pageSource = readSourceFile(
  '../features/internal-news/components/InternalNewsPage.tsx',
);
const feedSource = readSourceFile(
  '../features/internal-news/components/InternalNewsFeed.tsx',
);
const prismaSchemaSource = readSourceFile(
  '../../../../packages/database/prisma/schema.prisma',
);
const migrationSource = readSourceFile(
  '../../../../packages/database/prisma/migrations/20260726160000_internal_news/migration.sql',
);

describe('internal news foundation', () => {
  it('publishes one live feature with role-bound editorial management', () => {
    expect(FEATURES.internalNews).toMatchObject({
      availability: 'live',
      href: '/vie-interne/actualite-interne',
      requiredPermissions: [PERMISSIONS.INTERNAL_NEWS.VIEW],
    });
    expect(getNavigationItemByHref(FEATURES.internalNews.href)).toMatchObject({
      availability: 'live',
      featureId: FEATURES.internalNews.id,
    });
    expect(hasPermission('USER', PERMISSIONS.INTERNAL_NEWS.VIEW)).toBe(true);
    expect(hasPermission('USER', PERMISSIONS.INTERNAL_NEWS.MANAGE)).toBe(false);
    expect(hasPermission('ADMIN', PERMISSIONS.INTERNAL_NEWS.MANAGE)).toBe(true);
  });

  it('keeps partner visibility independent from internal-news access', () => {
    expect(
      getInternalNewsCapabilities({
        isProtected: false,
        permissions: null,
        role: 'USER',
      }),
    ).toEqual({
      canManage: false,
      canView: true,
      canViewPartners: false,
    });
    expect(
      getInternalNewsCapabilities({
        isProtected: true,
        permissions: null,
        role: 'ADMIN',
      }),
    ).toEqual({
      canManage: true,
      canView: true,
      canViewPartners: true,
    });
  });

  it('bounds publication, pinning and pagination inputs', () => {
    expect(
      publishInternalAnnouncementSchema.parse({
        body: 'Une information utile.',
        title: 'Annonce',
      }),
    ).toEqual({
      body: 'Une information utile.',
      isPinned: false,
      title: 'Annonce',
    });
    expect(
      publishInternalAnnouncementSchema.safeParse({
        body: ' ',
        title: 'Annonce',
      }).success,
    ).toBe(false);
    expect(
      publishInternalAnnouncementSchema.safeParse({
        body: 'Information',
        extra: true,
        title: 'Annonce',
      }).success,
    ).toBe(false);
    expect(
      updateInternalAnnouncementPinSchema.parse({ isPinned: true }),
    ).toEqual({ isPinned: true });
    expect(
      internalNewsListQuerySchema.parse({ filter: 'partners', limit: '50' }),
    ).toMatchObject({ filter: 'partners', limit: 50 });
    expect(
      internalNewsListQuerySchema.safeParse({ filter: 'audit' }).success,
    ).toBe(false);
  });

  it('turns relationship changes into concise business copy', () => {
    expect(
      getPartnerNewsCopy('Acme', 'RELATIONSHIP_CREATED', {
        status: 'PROSPECT',
      }),
    ).toMatchObject({
      statusTransition: { from: null, to: 'PROSPECT' },
      title: 'Nouvelle relation suivie : Acme',
    });
    expect(
      getPartnerNewsCopy('Acme', 'STATUS_CHANGED', {
        fromStatus: 'DISCUSSION',
        toStatus: 'ACTIVE',
      }),
    ).toEqual({
      body: 'Statut passé de « En discussion » à « Actif ».',
      statusTransition: { from: 'DISCUSSION', to: 'ACTIVE' },
      title: 'Acme devient partenaire actif',
    });
    expect(
      getPartnerNewsCopy('Acme', 'STATUS_CHANGED', {
        fromStatus: 'ENDED',
        toStatus: 'DISCUSSION',
      }).title,
    ).toBe('Les échanges reprennent avec Acme');
  });

  it('only promotes significant partner events into the shared feed', () => {
    expect(serviceSource).toContain("'RELATIONSHIP_CREATED'");
    expect(serviceSource).toContain("'STATUS_CHANGED'");
    expect(serviceSource).not.toContain("'PERIOD_CORRECTED'");
    expect(serviceSource).not.toContain("'ACTION_UPDATED'");
    expect(serviceSource).toContain('canViewPartners');
    expect(serviceSource).toContain('buildCursorPaginationMeta');
  });

  it('protects reads, publications and pin changes independently', () => {
    expect(collectionRouteSource).toContain('PERMISSIONS.INTERNAL_NEWS.VIEW');
    expect(collectionRouteSource).toContain('PERMISSIONS.INTERNAL_NEWS.MANAGE');
    expect(collectionRouteSource).toContain('PERMISSIONS.PARTNERS.VIEW');
    expect(itemRouteSource).toContain('PERMISSIONS.INTERNAL_NEWS.MANAGE');
    expect(collectionRouteSource).toContain('assertInternalNewsFeatureReady()');
    expect(itemRouteSource).toContain('assertInternalNewsFeatureReady()');
  });

  it('persists author snapshots and audits editorial mutations', () => {
    expect(prismaSchemaSource).toContain('model InternalAnnouncement');
    expect(prismaSchemaSource).toContain('authorDisplayNameSnapshot');
    expect(prismaSchemaSource).toContain('INTERNAL_ANNOUNCEMENT_PUBLISH');
    expect(migrationSource).toContain('CREATE TABLE "InternalAnnouncement"');
    expect(migrationSource).toContain('ON DELETE SET NULL');
    expect(migrationSource).toContain(
      '"InternalAnnouncement_pinnedAt_publishedAt_id_idx"',
    );
  });

  it('renders a permission-aware, filterable and pinnable feed', () => {
    expect(pageSource).toContain('Publier une actualité');
    expect(pageSource).toContain('FEATURES.internalNews.id');
    expect(feedSource).toContain('À la une');
    expect(feedSource).toContain('value="announcements"');
    expect(feedSource).toContain('value="partners"');
    expect(feedSource).toContain('Charger la suite');
    expect(feedSource).toContain('updateInternalAnnouncementPin');
  });
});
