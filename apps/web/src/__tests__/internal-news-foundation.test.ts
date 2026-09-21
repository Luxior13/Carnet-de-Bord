import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { getNavigationItemByHref } from '$constants/app.constants';
import { FEATURES } from '$constants/feature-registry.constants';
import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
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

  it('keeps the feed limited to its own announcements', () => {
    expect(
      getInternalNewsCapabilities({
        isProtected: false,
        permissions: null,
        role: 'USER',
      }),
    ).toEqual({ canManage: false, canView: true });
    expect(
      getInternalNewsCapabilities({
        isProtected: true,
        permissions: null,
        role: 'ADMIN',
      }),
    ).toEqual({ canManage: true, canView: true });
    expect(serviceSource).not.toContain('partner');
    expect(serviceSource).not.toContain('PARTNER');
    expect(feedSource).not.toContain('partner');
    expect(feedSource).not.toContain('PARTNER');
    expect(pageSource).not.toContain('canViewPartners');
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
    expect(internalNewsListQuerySchema.parse({ limit: '50' })).toMatchObject({
      limit: 50,
    });
    expect(
      internalNewsListQuerySchema.safeParse({ filter: 'partners' }).success,
    ).toBe(false);
  });

  it('protects reads, publications and pin changes independently', () => {
    expect(collectionRouteSource).toContain('PERMISSIONS.INTERNAL_NEWS.VIEW');
    expect(collectionRouteSource).toContain('PERMISSIONS.INTERNAL_NEWS.MANAGE');
    expect(collectionRouteSource).not.toContain('PERMISSIONS.PARTNERS');
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

  it('renders a permission-aware and pinnable feed', () => {
    expect(pageSource).toContain('Publier une actualité');
    expect(pageSource).toContain('FEATURES.internalNews.id');
    expect(feedSource).toContain('À la une');
    expect(feedSource).toContain('Charger la suite');
    expect(feedSource).toContain('updateInternalAnnouncementPin');
  });
});
