import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  createExpectedPersonSchemaCatalogRowsForTests,
  isPersonSchemaCatalogReady,
  PERSON_SCHEMA_EXPECTED_COUNTS,
  type PersonSchemaCatalogRow,
  validatePersonSchemaCatalogRows,
} from '$features/persons/server/person-schema-readiness';

const fixture = (): PersonSchemaCatalogRow[] =>
  structuredClone(createExpectedPersonSchemaCatalogRowsForTests());

const findRow = (
  rows: PersonSchemaCatalogRow[],
  kind: PersonSchemaCatalogRow['kind'],
  objectName: string,
): PersonSchemaCatalogRow => {
  const row = rows.find(
    (candidate) =>
      candidate.kind === kind && candidate.objectName === objectName,
  );
  if (!row) throw new Error(`Missing fixture row ${kind}:${objectName}`);

  return row;
};

const replaceDetails = (
  row: PersonSchemaCatalogRow,
  details: Record<string, unknown>,
): void => {
  Object.assign(row as { details: unknown }, { details });
};

describe('strict Person PostgreSQL catalog readiness', () => {
  it('accepts the complete migration catalog and queries only bounded catalogs', async () => {
    const rows = fixture();
    const queryRaw = vi.fn();
    const client = {
      async $queryRaw<T>(query: TemplateStringsArray): Promise<T> {
        queryRaw(query);
        const sql = String(query);
        expect(sql).toContain("extension.extname = 'pg_trgm'");
        expect(sql).toContain('format_type(attribute.atttypid');
        expect(sql).toContain('constraint_record.convalidated');
        expect(sql).toContain('index_state.indclass');
        expect(sql).toContain('index_state.indoption');
        expect(sql).toContain('pg_get_expr(index_state.indpred');
        expect(sql).toContain('pg_get_function_identity_arguments');
        expect(sql).toContain('has_function_privilege');
        expect(sql).toContain('aclexplode');
        expect(sql).toContain('target_indexes');
        expect(sql).not.toContain('FROM "Person"');

        return rows as unknown as T;
      },
    };

    await expect(isPersonSchemaCatalogReady(client)).resolves.toBe(true);
    expect(queryRaw).toHaveBeenCalledTimes(1);
    expect(PERSON_SCHEMA_EXPECTED_COUNTS).toEqual({
      checks: 23,
      columns: 70,
      enums: 12,
      foreignKeys: 7,
      functions: 2,
      indexes: 32,
      triggers: 5,
    });
  });

  it.each([
    ['type', 'text'],
    ['notNull', false],
    ['defaultExpression', '2'],
  ] as const)('rejects a changed column %s', (property, value) => {
    const rows = fixture();
    const row = findRow(rows, 'column', 'version');
    replaceDetails(row, {
      ...(row.details as Record<string, unknown>),
      [property]: value,
    });

    expect(validatePersonSchemaCatalogRows(rows)).toBe(false);
  });

  it('accepts the PostgreSQL rewrite of a BETWEEN check expression', () => {
    const rows = fixture();
    const row = findRow(rows, 'check', 'AuditFieldChange_storage_check');
    const details = row.details as Record<string, unknown>;
    const expression = String(details.expression).replace(
      'octet_length("valuesCiphertext") BETWEEN 1 AND 8192',
      'octet_length("valuesCiphertext") >= 1 AND octet_length("valuesCiphertext") <= 8192',
    );
    replaceDetails(row, { ...details, expression });

    expect(validatePersonSchemaCatalogRows(rows)).toBe(true);
  });

  it('rejects a missing pg_trgm extension or enum label', () => {
    const withoutExtension = fixture().filter(
      (row) => row.kind !== 'extension',
    );
    const withoutEnum = fixture().filter(
      (row) => row.objectName !== 'OUTSIDE_STRUCTURE',
    );

    expect(validatePersonSchemaCatalogRows(withoutExtension)).toBe(false);
    expect(validatePersonSchemaCatalogRows(withoutEnum)).toBe(false);
  });

  it.each([
    ['validated', false],
    ['expression', '"version" >= 0'],
  ] as const)('rejects a changed check %s', (property, value) => {
    const rows = fixture();
    const row = findRow(rows, 'check', 'Person_version_check');
    replaceDetails(row, {
      ...(row.details as Record<string, unknown>),
      [property]: value,
    });

    expect(validatePersonSchemaCatalogRows(rows)).toBe(false);
  });

  it.each([
    ['columns', ['normalizedEmail', 'personId']],
    ['referencedTable', 'PersonEmail'],
    ['referencedColumns', ['version']],
    ['onDelete', 'RESTRICT'],
    ['onUpdate', 'NO ACTION'],
    ['validated', false],
  ] as const)('rejects a changed foreign key %s', (property, value) => {
    const rows = fixture();
    const row = findRow(rows, 'foreign_key', 'PersonEmail_personId_fkey');
    replaceDetails(row, {
      ...(row.details as Record<string, unknown>),
      [property]: value,
    });

    expect(validatePersonSchemaCatalogRows(rows)).toBe(false);
  });

  it.each([
    ['method', 'btree'],
    ['unique', true],
    ['columns', ['normalizedFirstName']],
    ['opclasses', ['text_ops']],
    ['predicate', '"normalizedNickname" IS NOT NULL'],
    ['options', [1]],
    ['ready', false],
    ['valid', false],
  ] as const)('rejects a changed exact index %s', (property, value) => {
    const rows = fixture();
    const row = findRow(rows, 'index', 'Person_normalizedNickname_trgm_idx');
    replaceDetails(row, {
      ...(row.details as Record<string, unknown>),
      [property]: value,
    });

    expect(validatePersonSchemaCatalogRows(rows)).toBe(false);
  });

  it.each([
    ['enabled', 'D'],
    ['functionName', 'wrong_function'],
    ['typeMask', 7],
  ] as const)('rejects a changed trigger %s', (property, value) => {
    const rows = fixture();
    const row = findRow(rows, 'trigger', 'AuditLog_guard_mutation');
    replaceDetails(row, {
      ...(row.details as Record<string, unknown>),
      [property]: value,
    });

    expect(validatePersonSchemaCatalogRows(rows)).toBe(false);
  });

  it.each([
    ['identityArguments', 'retention_days integer'],
    ['resultType', 'integer'],
    ['securityDefiner', false],
    ['configuration', 'search_path=public'],
    ['executableByCurrentUser', false],
    ['executableByPublic', true],
    ['volatility', 'STABLE'],
    ['parallelSafety', 'SAFE'],
  ] as const)('rejects a changed purge function %s', (property, value) => {
    const rows = fixture();
    const row = findRow(rows, 'function', 'purge_expired_audit_logs');
    replaceDetails(row, {
      ...(row.details as Record<string, unknown>),
      [property]: value,
    });

    expect(validatePersonSchemaCatalogRows(rows)).toBe(false);
  });

  it('rejects duplicate catalog rows instead of masking them in a map', () => {
    const rows = fixture();
    rows.push(structuredClone(rows[1] as PersonSchemaCatalogRow));

    expect(validatePersonSchemaCatalogRows(rows)).toBe(false);
  });
});
