import { AuditAction, AuditCategory } from '@repo/shared';
import { describe, expect, it, vi } from 'vitest';

import {
  AUDIT_ACTION_OPTIONS,
  formatAuditChangeValue,
  getAuditActionDisplay,
  getAuditChangeDiffs,
} from '$features/audit/audit-display';
import {
  ACTIVITY_ACTION_OPTIONS,
  AUDIT_CATEGORY_OPTIONS,
  buildServerQuery,
  CONNECTION_ACTION_OPTIONS,
  DEFAULT_FILTERS,
  getFiltersFromSearchParams,
  normalizeJournalFilters,
  normalizeJournalSearch,
  toIsoDateBoundary,
  validateJournalDateRange,
  writeFiltersToSearchParams,
} from '$features/audit/journal-filters';
import {
  formatPersonAuditValue,
  getPersonAuditFieldLabel,
} from '$features/persons/person-audit-display';
import { getAuditEventClassification } from '$server/audit-event';

vi.mock('server-only', () => ({}));

describe('journal investigation contracts', () => {
  it('offers every persisted action and category with readable labels', () => {
    expect(new Set(AUDIT_ACTION_OPTIONS.map(({ value }) => value))).toEqual(
      new Set(['all', ...Object.values(AuditAction)]),
    );
    expect(new Set(AUDIT_CATEGORY_OPTIONS.map(({ value }) => value))).toEqual(
      new Set(['all', ...Object.values(AuditCategory)]),
    );
    for (const action of Object.values(AuditAction)) {
      expect(getAuditActionDisplay(action).label).not.toBe('Action système');
    }
  });

  it('matches the server classification for every selectable action', () => {
    for (const option of CONNECTION_ACTION_OPTIONS.filter(
      ({ value }) => value !== 'all',
    )) {
      expect(
        getAuditEventClassification(option.value as AuditAction).eventKind,
      ).toBe('CONNECTION');
    }
    for (const option of ACTIVITY_ACTION_OPTIONS.filter(
      ({ value }) => value !== 'all',
    )) {
      expect(
        getAuditEventClassification(option.value as AuditAction).eventKind,
      ).toBe('ACTIVITY');
    }
  });

  it('clears incompatible entity and action criteria when switching journals', () => {
    const filters = normalizeJournalFilters({
      ...DEFAULT_FILTERS,
      action: 'PERSON_UPDATE',
      actorId: 'author-1',
      category: 'PERSON',
      entityId: 'person-1',
      entityType: 'PERSON',
      fieldKey: 'email',
      logType: 'connections',
      pageKey: 'persons',
      poleKey: 'internal',
      recordId: 'contact-1',
      search: 'Alice',
      sectionKey: 'contacts',
    });
    const params = new URLSearchParams(buildServerQuery(filters));
    for (const key of [
      'entityType',
      'entityId',
      'sectionKey',
      'fieldKey',
      'recordId',
      'action',
      'category',
      'pageKey',
      'poleKey',
    ])
      expect(params.has(key)).toBe(false);
    expect(params.get('actorId')).toBe('author-1');
    expect(params.get('search')).toBe('Alice');
    expect(
      normalizeJournalFilters({
        ...filters,
        action: 'LOGIN_SUCCESS',
        logType: 'activity',
      }).action,
    ).toBe('all');
  });

  it('round-trips context and canonical page aliases without losing unrelated URL state', () => {
    const params = new URLSearchParams(
      'poleKey=system&pageKey=audit&entityType=PERSON&entityId=p1&sectionKey=contacts&fieldKey=email&recordId=c1&actorId=a1&targetUserId=t1&other=keep',
    );
    const filters = getFiltersFromSearchParams(params);
    expect(filters.pageKey).toBe('system-activity');
    const output = writeFiltersToSearchParams(params, filters);
    expect(getFiltersFromSearchParams(output)).toEqual(filters);
    expect(output.get('other')).toBe('keep');
    const server = new URLSearchParams(buildServerQuery(filters));
    expect(server.get('recordId')).toBe('c1');
    expect(server.get('targetUserId')).toBe('t1');
    expect(server.has('other')).toBe(false);
  });

  it.each([
    'logType=activity&action=LOGIN_SUCCESS',
    'logType=connections&action=USER_CREATE&entityType=PERSON&entityId=p1',
    'category=INVALID&action=INVALID',
    'fieldKey=email&sectionKey=contacts&recordId=c1',
    'entityId=p1&fieldKey=email',
  ])('normalizes malformed links: %s', (query) => {
    const filters = getFiltersFromSearchParams(new URLSearchParams(query));
    expect(filters.action).toBe('all');
    expect(filters.category).toBe('all');
    expect(filters.fieldKey).toBe('');
    expect(filters.entityId).toBe('');
  });

  it.each([
    ['2026-09-27T00:00:00Z', '2026-09-27T23:59:59Z', true],
    ['2024-01-01T00:00:00Z', '2025-01-01T00:00:00Z', true],
    ['2024-01-01T00:00:00Z', '2025-01-01T00:00:01Z', false],
    ['2026-09-28T00:00:00Z', '2026-09-27T23:59:59Z', false],
    ['2026-09-27', '2026-09-28', false],
    ['', '', false],
  ])('validates exact date boundaries (%s / %s)', (from, to, valid) => {
    expect(validateJournalDateRange(from, to) === null).toBe(valid);
    const filters = getFiltersFromSearchParams(
      new URLSearchParams({ from, period: 'custom', to }),
    );
    expect(filters.period).toBe(valid ? 'custom' : '30d');
  });

  it('uses local full-day boundaries and handles incomplete date drafts', () => {
    expect(toIsoDateBoundary('', false)).toBe('');
    const start = new Date(toIsoDateBoundary('2026-09-27', false));
    const end = new Date(toIsoDateBoundary('2026-09-27', true));
    expect([start.getHours(), start.getMinutes()]).toEqual([0, 0]);
    expect([end.getHours(), end.getMinutes(), end.getMilliseconds()]).toEqual([
      23, 59, 999,
    ]);
  });

  it('requires three letters or numbers rather than punctuation', () => {
    expect(normalizeJournalSearch(' é-1 ')).toBe('');
    expect(normalizeJournalSearch(' é-1茶 ')).toBe('é-1茶');
    expect(normalizeJournalSearch('---')).toBe('');
    expect(normalizeJournalSearch('x'.repeat(200))).toHaveLength(120);
  });

  it('does not rewrite historical account archives as definitive deletion', () => {
    expect(getAuditActionDisplay('USER_DELETE').label).toBe(
      'Utilisateur archivé (historique)',
    );
    expect(
      getAuditActionDisplay('USER_DELETE', {
        deletionVersion: 1,
        irreversible: true,
      }).label,
    ).toBe('Utilisateur supprimé');
    expect(getAuditActionDisplay('UNKNOWN').label).toBe('UNKNOWN');
  });

  it('preserves full values and uses person-specific field meanings', () => {
    const before = 'ancienne valeur '.repeat(20);
    const after = 'nouvelle valeur '.repeat(20);
    expect(
      getAuditChangeDiffs({
        after: { firstName: after },
        before: { firstName: before },
      }),
    ).toContainEqual({ after, before, fieldKey: 'firstName' });
    expect(formatAuditChangeValue('firstName', before)).toBe(before);
    expect(getPersonAuditFieldLabel('email')).toBe('Email');
    expect(getPersonAuditFieldLabel('nickname')).toBe('Pseudo');
    expect(formatPersonAuditValue('isPrimary', true)).toBe('Oui');
    expect(formatPersonAuditValue('birthDate', '2000-01-01')).toBe(
      '01/01/2000',
    );
    expect(formatPersonAuditValue('structureStatus', 'OUTSIDE_STRUCTURE')).toBe(
      'Hors structure',
    );
  });
});
