import { describe, expect, it } from 'vitest';

import {
  formatPartnerCivilDate,
  getPartnerActionDuePresentation,
  getRelationshipStatusDescription,
} from '$features/partners/partner-timeline.ui';
import type { PartnerDetail } from '$features/partners/types/partner.types';

const basePartner = {
  categories: ['PARTNER'],
  channels: [],
  contacts: [],
  createdAt: '2026-07-20T10:00:00.000Z',
  createdBy: null,
  description: null,
  id: 'partner-1',
  name: 'Exemple',
  normalizedName: 'exemple',
  periods: [],
  status: 'PROSPECT',
  updatedAt: '2026-07-20T10:00:00.000Z',
  updatedBy: null,
  version: 1,
  website: null,
} satisfies PartnerDetail;

describe('Partner timeline UI', () => {
  it('formats civil dates without shifting their calendar day', () => {
    expect(formatPartnerCivilDate('2026-07-24')).toBe('24 juillet 2026');
  });

  it('states the current relationship period and missing dates explicitly', () => {
    expect(
      getRelationshipStatusDescription({
        ...basePartner,
        periods: [
          {
            closedAt: null,
            closingNote: null,
            endedOn: null,
            id: 'period-1',
            startedOn: '2026-07-24',
            version: 1,
          },
        ],
        status: 'ACTIVE',
      }),
    ).toBe('Relation active depuis le 24 juillet 2026');

    expect(
      getRelationshipStatusDescription({
        ...basePartner,
        periods: [
          {
            closedAt: '2026-07-24T12:00:00.000Z',
            closingNote: null,
            endedOn: null,
            id: 'period-1',
            startedOn: '2026-07-10',
            version: 2,
          },
        ],
        status: 'ENDED',
      }),
    ).toBe('Dernière période : début le 10 juillet 2026 · fin non renseignée');
  });

  it('makes an overdue action immediately understandable', () => {
    expect(
      getPartnerActionDuePresentation(
        '2026-07-23',
        new Date('2026-07-24T12:00:00.000Z'),
      ),
    ).toEqual({
      isOverdue: true,
      label: 'En retard · 23 juillet 2026',
    });
  });
});
