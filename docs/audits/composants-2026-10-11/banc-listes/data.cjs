exports.listPage = page => ({
  items: Array.from({ length: page === 1 ? 25 : 2 }, (_, index) => ({
    id: `fictif-${page}-${index}`,
    firstName: `Personne ${page}-${index + 1}`,
    lastName: 'Exemple',
    nickname: null,
    structureStatus: 'IN_STRUCTURE',
    contactCounts: { emails: 0, phones: 0, socialProfiles: 0 },
    createdAt: '2026-10-11T00:00:00.000Z',
    updatedAt: '2026-10-11T00:00:00.000Z',
    lastModifiedBy: null,
    matchedByContact: false,
    version: 1,
  })),
  overview: { inStructure: 27, outsideStructure: 0, noContacts: 27, total: 27 },
  pagination: { total: 27, limit: 25, hasMore: page === 1, nextCursor: page === 1 ? 'page-two' : null, snapshotAt: '2026-10-11T00:00:00.000Z' },
});
