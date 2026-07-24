import { readFileSync } from 'node:fs';

import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { FEATURES } from '$constants/feature-registry.constants';
import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import {
  PARTNER_STATUS_TRANSITIONS,
  PARTNER_STATUSES,
} from '$features/partners/partner.constants';
import {
  createPartnerSchema,
  updatePartnerContactSchema,
  updatePartnerSchema,
  updatePartnerStatusSchema,
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
const partnerFollowUpSource = readFileSync(
  new URL(
    '../features/partners/components/PartnerFollowUpSection.tsx',
    import.meta.url,
  ),
  'utf8',
);
// Test-owned static path.
// eslint-disable-next-line security/detect-non-literal-fs-filename
const partnerFollowUpComposerSource = readFileSync(
  new URL(
    '../features/partners/components/PartnerFollowUpComposer.tsx',
    import.meta.url,
  ),
  'utf8',
);
// Test-owned static path.
// eslint-disable-next-line security/detect-non-literal-fs-filename
const partnerOpenActionsSource = readFileSync(
  new URL(
    '../features/partners/components/PartnerOpenActions.tsx',
    import.meta.url,
  ),
  'utf8',
);
// Test-owned static path.
// eslint-disable-next-line security/detect-non-literal-fs-filename
const partnerTimelineItemsSource = readFileSync(
  new URL(
    '../features/partners/components/PartnerTimelineItems.tsx',
    import.meta.url,
  ),
  'utf8',
);
// Test-owned static path.
// eslint-disable-next-line security/detect-non-literal-fs-filename
const partnerStatusControlSource = readFileSync(
  new URL(
    '../features/partners/components/PartnerStatusControl.tsx',
    import.meta.url,
  ),
  'utf8',
);
// Test-owned static path.
// eslint-disable-next-line security/detect-non-literal-fs-filename
const partnerStatusRouteSource = readFileSync(
  new URL('../app/api/partenaires/[id]/statut/route.ts', import.meta.url),
  'utf8',
);
// Test-owned static path.
// eslint-disable-next-line security/detect-non-literal-fs-filename
const partnerServiceSource = readFileSync(
  new URL('../features/partners/server/partner.service.ts', import.meta.url),
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

  it('separates general information from the relationship status mutation', () => {
    const information = {
      categories: ['PARTNER'],
      channels: [],
      description: null,
      name: 'Exemple',
      version: 2,
      website: null,
    };
    expect(updatePartnerSchema.safeParse(information).success).toBe(true);
    for (const relationshipField of [
      'closingNote',
      'endedOn',
      'startedOn',
      'status',
    ]) {
      expect(
        updatePartnerSchema.safeParse({
          ...information,
          [relationshipField]: relationshipField === 'status' ? 'ACTIVE' : null,
        }).success,
      ).toBe(false);
    }
    const relationshipStatus = {
      closingNote: null,
      endedOn: null,
      startedOn: null,
      status: 'DISCUSSION',
      version: 2,
    };
    expect(
      updatePartnerStatusSchema.safeParse(relationshipStatus).success,
    ).toBe(true);
    expect(
      updatePartnerStatusSchema.safeParse({
        ...relationshipStatus,
        name: 'Exemple',
      }).success,
    ).toBe(false);
  });

  it('protects the dedicated status mutation with the management permission', () => {
    expect(partnerStatusRouteSource).toContain('PERMISSIONS.PARTNERS.MANAGE');
    expect(partnerStatusRouteSource).toContain('updatePartnerStatusSchema');
    expect(partnerStatusRouteSource).toContain('updatePartnerStatus(');
    expect(partnerStatusRouteSource).toContain('withPartnerNoStore(');
  });

  it('shares one explicit relationship lifecycle between the UI and server', () => {
    expect(PARTNER_STATUSES).toEqual([
      'PROSPECT',
      'DISCUSSION',
      'ACTIVE',
      'ENDED',
      'CLOSED',
    ]);
    expect(PARTNER_STATUS_TRANSITIONS).toEqual({
      ACTIVE: ['ACTIVE', 'ENDED'],
      CLOSED: ['CLOSED', 'DISCUSSION'],
      DISCUSSION: ['DISCUSSION', 'ACTIVE', 'CLOSED'],
      ENDED: ['ENDED', 'DISCUSSION'],
      PROSPECT: ['PROSPECT', 'DISCUSSION', 'CLOSED'],
    });
    expect(partnerStatusControlSource).toContain('nextStatuses.map');
    expect(partnerStatusControlSource).toContain(
      '.filter((item) => item !== partner.status)',
    );
    expect(partnerStatusControlSource).not.toContain('PARTNER_STATUSES.map');
    expect(partnerStatusControlSource).not.toContain('disabled={!allowed}');
    expect(partnerServiceSource).toContain(
      'const allowedTransitions = PARTNER_STATUS_TRANSITIONS[',
    );
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
    expect(partnerDetailSource).toContain('<PartnerFollowUpSection');
    expect(partnerFollowUpComposerSource).toContain(
      '<DialogTitle>Ajouter une note de suivi</DialogTitle>',
    );
    expect(partnerFollowUpSource).toContain('<PartnerStatusControl');
    expect(partnerStatusControlSource).toContain('void saveStatus(nextStatus)');
    expect(partnerStatusControlSource).toContain(
      'onClick={() => selectStatus(nextStatus)}',
    );
    expect(partnerStatusControlSource).toContain("'Activer la relation'");
    expect(partnerStatusControlSource).toContain("'Terminer la relation'");
    expect(partnerStatusControlSource).toContain("'Corriger la période'");
    expect(partnerStatusControlSource).toContain('Corriger les dates');
    expect(partnerStatusControlSource).not.toContain('Modifier le statut');
    expect(partnerStatusControlSource).not.toContain('<Select');
    expect(partnerDetailSource).not.toContain('partner-detail-status');
    expect(partnerDetailSource).not.toContain('Situation en bref');
    expect(partnerDetailSource).not.toContain('Historique du suivi');
    expect(partnerFollowUpSource).toContain('entry.action.version');
    expect(partnerFollowUpComposerSource).toContain('Contact concerné');
    expect(partnerTimelineItemsSource).toContain('Modifiée le');
  });

  it('presents one lazy, durable and understandable business timeline', () => {
    expect(partnerFollowUpSource).toContain('getPartnerTimeline');
    expect(partnerFollowUpSource).toContain('TIMELINE_PAGE_SIZE = 25');
    expect(partnerFollowUpSource).toContain('Afficher les suivis précédents');
    expect(partnerFollowUpSource).toContain("return 'Aujourd’hui'");
    expect(partnerFollowUpSource).toContain("return 'Hier'");
    expect(partnerTimelineItemsSource).toContain(
      "item.payload.source === 'migration'",
    );
    expect(partnerTimelineItemsSource).toContain("'Échanges commencés'");
    expect(partnerTimelineItemsSource).toContain("'Échanges repris'");
    expect(partnerOpenActionsSource).toContain('Contexte : {entry.text}');
    expect(partnerFollowUpComposerSource).toContain('autoComplete="off"');
  });
});
