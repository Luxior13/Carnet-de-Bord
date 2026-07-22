export type AuditContextFilters = {
  entityId: string;
  entityType: string;
  fieldKey: string;
  recordId: string;
  sectionKey: string;
};

export const AUDIT_CONTEXT_FILTER_DEFAULTS: AuditContextFilters = {
  entityId: '',
  entityType: '',
  fieldKey: '',
  recordId: '',
  sectionKey: '',
};

export const AUDIT_CONTEXT_FILTER_QUERY_KEYS = [
  'entityId',
  'entityType',
  'fieldKey',
  'recordId',
  'sectionKey',
] as const;

export const readAuditContextFilters = (
  params: URLSearchParams,
): AuditContextFilters => ({
  entityId: (params.get('entityId') ?? '').trim().slice(0, 128),
  entityType: (params.get('entityType') ?? '').trim().slice(0, 40),
  fieldKey: (params.get('fieldKey') ?? '').trim().slice(0, 100),
  recordId: (params.get('recordId') ?? '').trim().slice(0, 128),
  sectionKey: (params.get('sectionKey') ?? '').trim().slice(0, 64),
});

export const writeAuditContextFilters = (
  params: URLSearchParams,
  filters: AuditContextFilters,
): void => {
  if (filters.entityId && filters.entityType) {
    params.set('entityId', filters.entityId);
    params.set('entityType', filters.entityType);
  }
  if (filters.fieldKey && filters.sectionKey) {
    params.set('fieldKey', filters.fieldKey);
    params.set('sectionKey', filters.sectionKey);
    if (filters.recordId) params.set('recordId', filters.recordId);
  }
};

export const getAuditContextFilterChips = (
  filters: AuditContextFilters,
): { key: keyof AuditContextFilters; label: string }[] => [
  ...(filters.entityId && filters.entityType
    ? [
        {
          key: 'entityId' as const,
          label: `Entité : ${filters.entityType} · ${filters.entityId}`,
        },
      ]
    : []),
  ...(filters.fieldKey && filters.sectionKey
    ? [
        {
          key: 'fieldKey' as const,
          label: `Champ : ${filters.sectionKey} · ${filters.fieldKey}`,
        },
      ]
    : []),
];
