import { readFileSync } from 'node:fs';

import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { FEATURES } from '$constants/feature-registry.constants';
import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import {
  createPartnerSchema,
  updatePartnerContactSchema,
} from '$features/partners/schemas/partner.schemas';

// Test-owned static path.
// eslint-disable-next-line security/detect-non-literal-fs-filename
const migrationSql = readFileSync(
  new URL(
    '../../../../packages/database/prisma/migrations/20260723190000_partner_relationships/migration.sql',
    import.meta.url,
  ),
  'utf8',
);
// Test-owned static path.
// eslint-disable-next-line security/detect-non-literal-fs-filename
const partnerDetailSource = readFileSync(
  new URL(
    '../features/partners/components/PartnerDetailPage.tsx',
    import.meta.url,
  ),
  'utf8',
);
// Test-owned static path.
// eslint-disable-next-line security/detect-non-literal-fs-filename
const personDangerZoneSource = readFileSync(
  new URL(
    '../features/persons/components/PersonDangerZone.tsx',
    import.meta.url,
  ),
  'utf8',
);

describe('Sponsors & partenaires foundation', () => {
  it('publishes the canonical live feature and three stable permissions', () => {
    expect(FEATURES.partners).toMatchObject({
      availability: 'live',
      href: '/bureau-juridique/partenaires',
      requiredPermissions: [PERMISSIONS.PARTNERS.VIEW],
    });
    expect(hasPermission('ADMIN', PERMISSIONS.PARTNERS.VIEW)).toBe(true);
    expect(hasPermission('ADMIN', PERMISSIONS.PARTNERS.MANAGE)).toBe(true);
    expect(hasPermission('ADMIN', PERMISSIONS.PARTNERS.DELETE)).toBe(true);
    expect(hasPermission('USER', PERMISSIONS.PARTNERS.VIEW)).toBe(false);
  });

  it('validates a minimal prospect and rejects an empty category set', () => {
    const payload = {
      categories: ['SPONSOR'],
      channels: [],
      contact: null,
      description: null,
      endedOn: null,
      name: 'Exemple',
      startedOn: null,
      status: 'PROSPECT',
      website: null,
    };
    expect(createPartnerSchema.safeParse(payload).success).toBe(true);
    expect(
      createPartnerSchema.safeParse({ ...payload, categories: [] }).success,
    ).toBe(false);
  });

  it('preserves omitted contact dates during a partial mutation', () => {
    const parsed = updatePartnerContactSchema.parse({
      isPrimary: true,
      version: 2,
    });
    expect(parsed).not.toHaveProperty('startedOn');
    expect(parsed).not.toHaveProperty('endedOn');
  });

  it('enforces one open period, one primary contact and durable links', () => {
    expect(migrationSql).toContain(
      'CREATE UNIQUE INDEX "PartnerRelationshipPeriod_open_key"',
    );
    expect(migrationSql).toContain(
      'CREATE UNIQUE INDEX "PartnerContact_primary_key"',
    );
    expect(migrationSql).toContain(
      'REFERENCES "public"."Person"("id") ON DELETE SET NULL',
    );
    expect(migrationSql).toContain(
      'CREATE TRIGGER "PartnerOrganizationDeletionTombstone_prevent_mutation"',
    );
  });

  it('shares the fiche shell and destructive confirmation with the directory', () => {
    expect(partnerDetailSource).toContain('<EntityDetailLayout');
    expect(partnerDetailSource).toContain('<EntityDangerZone');
    expect(personDangerZoneSource).toContain('<EntityDangerZone');
    expect(partnerDetailSource).not.toContain('window.confirm');
    expect(partnerDetailSource).not.toContain('<select');
  });
});
