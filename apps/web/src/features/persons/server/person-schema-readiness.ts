import 'server-only';

import {
  PERSON_SCHEMA_COLUMNS as COLUMNS,
  PERSON_SCHEMA_ENUMS as ENUMS,
} from './person-schema-column-contract';
import {
  PERSON_SCHEMA_CHECKS as CHECKS,
  PERSON_SCHEMA_FOREIGN_KEYS as FOREIGN_KEYS,
  PERSON_SCHEMA_FUNCTIONS as FUNCTIONS,
  PERSON_SCHEMA_INDEXES as INDEXES,
  PERSON_SCHEMA_TRIGGERS as TRIGGERS,
} from './person-schema-object-contract';

type PersonSchemaCatalogClient = {
  $queryRaw<T>(
    query: TemplateStringsArray,
    ...values: readonly unknown[]
  ): Promise<T>;
};

export type PersonSchemaCatalogRow = Readonly<{
  details: unknown;
  kind:
    | 'check'
    | 'column'
    | 'enum'
    | 'extension'
    | 'foreign_key'
    | 'function'
    | 'index'
    | 'trigger';
  objectName: string;
  tableName: string | null;
}>;
export const PERSON_SCHEMA_EXPECTED_COUNTS = Object.freeze({
  checks: CHECKS.length,
  columns: COLUMNS.length,
  enums: ENUMS.length,
  foreignKeys: FOREIGN_KEYS.length,
  functions: FUNCTIONS.length,
  indexes: INDEXES.length,
  triggers: TRIGGERS.length,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const normalizeDefault = (value: unknown): string | null => {
  if (value === null) return null;
  if (typeof value !== 'string') return '__invalid__';

  return (
    value
      .replaceAll('"', '')
      // PostgreSQL catalog defaults are bounded by this closed schema contract.
      // eslint-disable-next-line security/detect-unsafe-regex
      .replace(/::character varying(?:\(\d{1,5}\))?/giu, '::text')
      .replace(/::(?:integer|bigint|boolean)/giu, '')
      .replace(/\s+/gu, '')
      .toLowerCase()
  );
};

export const normalizePersonSchemaCheck = (value: unknown): string => {
  if (typeof value !== 'string') return '__invalid__';

  return (
    value
      .replaceAll('"', '')
      // PostgreSQL catalog expressions are bounded by this closed schema contract.
      // eslint-disable-next-line security/detect-unsafe-regex
      .replace(/::character varying(?:\(\d{1,5}\))?/giu, '')
      .replace(/::(?:text|bpchar|integer|bigint|boolean)/giu, '')
      .replace(/::[a-z_][\w.]{0,127}/giu, '')
      .replace(/[()\s]/gu, '')
      .replace(/=anyarray\[/giu, 'in')
      .replace(/<>allarray\[/giu, 'notin')
      .replaceAll(']', '')
      .replace(
        /octet_length([a-z_]\w{0,127})between(\d{1,10})and(\d{1,10})/giu,
        'octet_length$1>=$2andoctet_length$1<=$3',
      )
      .toLowerCase()
  );
};

const normalizePredicate = (value: unknown): string | null => {
  if (value === null) return null;
  if (typeof value !== 'string') return '__invalid__';
  const normalized = value
    .replaceAll('"', '')
    .replace(/[()\s]/gu, '')
    .toLowerCase();

  return normalized.endsWith('=true') ? normalized.slice(0, -5) : normalized;
};

const stringArray = (value: unknown): string | null =>
  Array.isArray(value) && value.every((item) => typeof item === 'string')
    ? value.join(',')
    : null;

const zeroOptions = (value: unknown, count: number): boolean =>
  Array.isArray(value) &&
  value.length === count &&
  value.every((item) => item === 0);

const rowsByKind = (
  rows: readonly PersonSchemaCatalogRow[],
  kind: PersonSchemaCatalogRow['kind'],
): Map<string, PersonSchemaCatalogRow> => {
  const selected = rows.filter((row) => row.kind === kind);

  return new Map(
    selected.map((row) => [`${row.tableName ?? ''}:${row.objectName}`, row]),
  );
};

export const validatePersonSchemaCatalogRows = (
  rows: readonly PersonSchemaCatalogRow[],
): boolean => {
  const extensionRows = rows.filter((row) => row.kind === 'extension');
  if (
    extensionRows.length !== 1 ||
    extensionRows[0]?.objectName !== 'pg_trgm' ||
    !isRecord(extensionRows[0].details) ||
    typeof extensionRows[0].details.version !== 'string' ||
    extensionRows[0].details.version.length === 0
  ) {
    return false;
  }

  const columnRows = rowsByKind(rows, 'column');
  if (columnRows.size !== COLUMNS.length) return false;
  for (const [
    table,
    name,
    position,
    type,
    notNull,
    defaultExpression,
  ] of COLUMNS) {
    const row = columnRows.get(`${table}:${name}`);
    if (!row || !isRecord(row.details)) return false;
    if (
      row.details.type !== type ||
      row.details.notNull !== notNull ||
      (position !== null && row.details.position !== position) ||
      normalizeDefault(row.details.defaultExpression) !==
        normalizeDefault(defaultExpression)
    ) {
      return false;
    }
  }

  const enumRows = rowsByKind(rows, 'enum');
  if (enumRows.size !== ENUMS.length) return false;
  for (const [type, label, position] of ENUMS) {
    const row = enumRows.get(`${type}:${label}`);
    if (
      !row ||
      !isRecord(row.details) ||
      (position !== null && row.details.position !== position)
    ) {
      return false;
    }
  }

  const checkRows = rowsByKind(rows, 'check');
  if (checkRows.size !== CHECKS.length) return false;
  for (const [name, table, expression] of CHECKS) {
    const row = checkRows.get(`${table}:${name}`);
    if (
      !row ||
      !isRecord(row.details) ||
      row.details.validated !== true ||
      normalizePersonSchemaCheck(row.details.expression) !==
        normalizePersonSchemaCheck(expression)
    ) {
      return false;
    }
  }

  const foreignKeyRows = rowsByKind(rows, 'foreign_key');
  if (foreignKeyRows.size !== FOREIGN_KEYS.length) return false;
  for (const [
    name,
    table,
    columns,
    referencedTable,
    referencedColumns,
    onDelete,
    onUpdate,
  ] of FOREIGN_KEYS) {
    const row = foreignKeyRows.get(`${table}:${name}`);
    if (!row || !isRecord(row.details)) return false;
    if (
      row.details.validated !== true ||
      stringArray(row.details.columns) !== columns ||
      row.details.referencedTable !== referencedTable ||
      stringArray(row.details.referencedColumns) !== referencedColumns ||
      row.details.onDelete !== onDelete ||
      row.details.onUpdate !== onUpdate
    ) {
      return false;
    }
  }

  const indexRows = rowsByKind(rows, 'index');
  if (indexRows.size !== INDEXES.length) return false;
  for (const [
    name,
    table,
    method,
    unique,
    columns,
    opclasses,
    predicate,
  ] of INDEXES) {
    const row = indexRows.get(`${table}:${name}`);
    if (!row || !isRecord(row.details)) return false;
    const columnCount = columns.split(',').length;
    if (
      row.details.method !== method ||
      row.details.unique !== unique ||
      row.details.valid !== true ||
      row.details.ready !== true ||
      row.details.keyCount !== columnCount ||
      row.details.attributeCount !== columnCount ||
      stringArray(row.details.columns) !== columns ||
      stringArray(row.details.opclasses) !== opclasses ||
      !zeroOptions(row.details.options, columnCount) ||
      normalizePredicate(row.details.predicate) !==
        normalizePredicate(predicate)
    ) {
      return false;
    }
  }

  const triggerRows = rowsByKind(rows, 'trigger');
  if (triggerRows.size !== TRIGGERS.length) return false;
  for (const [name, table, functionName, typeMask] of TRIGGERS) {
    const row = triggerRows.get(`${table}:${name}`);
    if (
      !row ||
      !isRecord(row.details) ||
      !['A', 'O'].includes(String(row.details.enabled)) ||
      row.details.functionName !== functionName ||
      row.details.typeMask !== typeMask
    ) {
      return false;
    }
  }

  const functionRows = rowsByKind(rows, 'function');
  if (functionRows.size !== FUNCTIONS.length) return false;
  for (const [
    name,
    identityArguments,
    resultType,
    securityDefiner,
    configuration,
  ] of FUNCTIONS) {
    const row = functionRows.get(`:${name}`);
    if (
      !row ||
      !isRecord(row.details) ||
      row.details.identityArguments !== identityArguments ||
      row.details.resultType !== resultType ||
      row.details.securityDefiner !== securityDefiner ||
      row.details.configuration !== configuration ||
      row.details.executableByCurrentUser !== true ||
      row.details.executableByPublic !== false ||
      row.details.volatility !== 'VOLATILE' ||
      row.details.parallelSafety !== 'UNSAFE'
    ) {
      return false;
    }
  }

  return (
    rows.length ===
    1 +
      COLUMNS.length +
      ENUMS.length +
      CHECKS.length +
      FOREIGN_KEYS.length +
      FUNCTIONS.length +
      INDEXES.length +
      TRIGGERS.length
  );
};

export const getPersonSchemaCatalogRows = async (
  client: PersonSchemaCatalogClient,
): Promise<PersonSchemaCatalogRow[]> => {
  const rows = await client.$queryRaw<PersonSchemaCatalogRow[]>`
    WITH target_tables(name) AS (
      VALUES
        ('AuditEncryptionKeyVersion'), ('AuditFieldChange'), ('Person'),
        ('PersonEmail'), ('PersonPhone'), ('PersonSocialProfile'),
        ('PersonDeletionTombstone')
    ),
    target_constraints(name) AS (
      VALUES
        ('AuditLog_entity_subject_pair_check'), ('AuditLog_person_event_shape_check'),
        ('AuditEncryptionKeyVersion_version_check'), ('AuditEncryptionKeyVersion_algorithm_check'),
        ('Person_version_check'), ('Person_nickname_pair_check'),
        ('Person_first_name_pair_check'), ('Person_last_name_pair_check'),
        ('Person_minimum_identity_check'), ('PersonEmail_version_check'),
        ('PersonEmail_values_check'), ('PersonPhone_version_check'),
        ('PersonPhone_values_check'), ('PersonSocialProfile_version_check'),
        ('PersonSocialProfile_network_key_check'), ('PersonSocialProfile_label_check'),
        ('PersonSocialProfile_identifier_pair_check'), ('PersonSocialProfile_url_set_check'),
        ('PersonSocialProfile_identifier_or_url_check'),
        ('PersonDeletionTombstone_values_check'),
        ('AuditFieldChange_keys_check'), ('AuditFieldChange_hashes_check'),
        ('AuditFieldChange_storage_check'), ('AuditLog_userId_fkey'),
        ('AuditLog_targetUserId_fkey'), ('PersonEmail_personId_fkey'),
        ('PersonPhone_personId_fkey'), ('PersonSocialProfile_personId_fkey'),
        ('AuditFieldChange_auditLogId_entityType_entityId_fkey'),
        ('AuditFieldChange_valueKeyVersion_fkey')
    ),
    target_indexes(name) AS (
      VALUES
        ('AuditLog_id_entityType_entityId_key'),
        ('AuditLog_entityType_entityId_createdAt_id_idx'),
        ('PersonEmail_personId_normalizedEmail_key'),
        ('PersonEmail_normalizedEmail_idx'), ('PersonEmail_normalizedEmail_prefix_idx'),
        ('PersonEmail_one_primary_per_person_idx'),
        ('PersonPhone_personId_normalizedPhone_key'),
        ('PersonPhone_normalizedPhone_idx'), ('PersonPhone_normalizedPhone_prefix_idx'),
        ('PersonPhone_one_primary_per_person_idx'),
        ('PersonSocialProfile_person_network_identifier_key'),
        ('PersonSocialProfile_person_network_url_hash_key'),
        ('PersonSocialProfile_normalizedIdentifier_idx'),
        ('PersonSocialProfile_normalizedIdentifier_prefix_idx'),
        ('PersonSocialProfile_normalizedProfileUrlHash_idx'),
        ('PersonSocialProfile_one_primary_per_network_idx'),
        ('Person_createdAt_id_idx'), ('Person_structureStatus_createdAt_id_idx'),
        ('Person_normalizedNickname_trgm_idx'),
        ('Person_normalizedFirstName_trgm_idx'),
        ('Person_normalizedLastName_trgm_idx'),
        ('Person_normalizedNickname_prefix_idx'),
        ('Person_normalizedFirstName_prefix_idx'),
        ('Person_normalizedLastName_prefix_idx'),
        ('PersonDeletionTombstone_deletionOperationId_key'),
        ('AuditFieldChange_auditLogId_idx'),
        ('AuditFieldChange_history_lookup_idx'),
        ('AuditFieldChange_valueKeyVersion_idx')
    ),
    target_triggers(name) AS (
      VALUES
        ('AuditLog_guard_mutation'), ('AuditFieldChange_validate_parent'),
        ('AuditFieldChange_guard_mutation'),
        ('AuditEncryptionKeyVersion_prevent_mutation'),
        ('PersonDeletionTombstone_prevent_mutation')
    ),
    target_functions(name) AS (
      VALUES
        ('purge_expired_audit_logs'),
        ('purge_person_audit_field_changes')
    )
    SELECT 'extension'::text AS kind, extension.extname AS "objectName",
      NULL::text AS "tableName",
      jsonb_build_object('version', extension.extversion) AS details
    FROM pg_extension extension
    WHERE extension.extname = 'pg_trgm'
    UNION ALL
    SELECT 'column', attribute.attname, relation.relname,
      jsonb_build_object(
        'position', attribute.attnum,
        'type', format_type(attribute.atttypid, attribute.atttypmod),
        'notNull', attribute.attnotnull,
        'defaultExpression', pg_get_expr(default_value.adbin, default_value.adrelid, true)
      )
    FROM pg_attribute attribute
    JOIN pg_class relation ON relation.oid = attribute.attrelid
    JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
    LEFT JOIN pg_attrdef default_value
      ON default_value.adrelid = relation.oid
      AND default_value.adnum = attribute.attnum
    WHERE namespace.nspname = current_schema()
      AND attribute.attnum > 0 AND NOT attribute.attisdropped
      AND (
        relation.relname IN (SELECT name FROM target_tables)
        OR (relation.relname = 'AuditLog' AND attribute.attname IN ('entityType', 'entityId'))
      )
    UNION ALL
    SELECT 'enum', enum_value.enumlabel, enum_type.typname,
      jsonb_build_object('position', enum_value.enumsortorder::int)
    FROM pg_enum enum_value
    JOIN pg_type enum_type ON enum_type.oid = enum_value.enumtypid
    JOIN pg_namespace namespace ON namespace.oid = enum_type.typnamespace
    WHERE namespace.nspname = current_schema()
      AND (
        enum_type.typname IN (
          'PersonStructureStatus', 'AuditFieldChangeType',
          'AuditValueStorageMode'
        )
        OR (enum_type.typname = 'AuditAction' AND enum_value.enumlabel IN (
          'PERSON_CREATE', 'PERSON_UPDATE', 'PERSON_DELETE'
        ))
        OR (enum_type.typname = 'AuditCategory' AND enum_value.enumlabel = 'PERSON')
      )
    UNION ALL
    SELECT CASE constraint_record.contype WHEN 'c' THEN 'check' ELSE 'foreign_key' END,
      constraint_record.conname, relation.relname,
      CASE constraint_record.contype
        WHEN 'c' THEN jsonb_build_object(
          'validated', constraint_record.convalidated,
          'expression', pg_get_expr(constraint_record.conbin, constraint_record.conrelid, true)
        )
        ELSE jsonb_build_object(
          'validated', constraint_record.convalidated,
          'columns', ARRAY(
            SELECT attribute.attname
            FROM unnest(constraint_record.conkey) WITH ORDINALITY key(attnum, position)
            JOIN pg_attribute attribute
              ON attribute.attrelid = constraint_record.conrelid
              AND attribute.attnum = key.attnum
            ORDER BY key.position
          ),
          'referencedTable', referenced_relation.relname,
          'referencedColumns', ARRAY(
            SELECT attribute.attname
            FROM unnest(constraint_record.confkey) WITH ORDINALITY key(attnum, position)
            JOIN pg_attribute attribute
              ON attribute.attrelid = constraint_record.confrelid
              AND attribute.attnum = key.attnum
            ORDER BY key.position
          ),
          'onDelete', CASE constraint_record.confdeltype
            WHEN 'c' THEN 'CASCADE' WHEN 'r' THEN 'RESTRICT'
            WHEN 'n' THEN 'SET NULL' WHEN 'd' THEN 'SET DEFAULT' ELSE 'NO ACTION' END,
          'onUpdate', CASE constraint_record.confupdtype
            WHEN 'c' THEN 'CASCADE' WHEN 'r' THEN 'RESTRICT'
            WHEN 'n' THEN 'SET NULL' WHEN 'd' THEN 'SET DEFAULT' ELSE 'NO ACTION' END
        )
      END
    FROM pg_constraint constraint_record
    JOIN target_constraints target ON target.name = constraint_record.conname
    JOIN pg_class relation ON relation.oid = constraint_record.conrelid
    JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
    LEFT JOIN pg_class referenced_relation
      ON referenced_relation.oid = constraint_record.confrelid
    WHERE namespace.nspname = current_schema()
      AND constraint_record.contype IN ('c', 'f')
    UNION ALL
    SELECT 'index', index_relation.relname, table_relation.relname,
      jsonb_build_object(
        'method', access_method.amname, 'unique', index_state.indisunique,
        'valid', index_state.indisvalid, 'ready', index_state.indisready,
        'keyCount', index_state.indnkeyatts,
        'attributeCount', index_state.indnatts,
        'columns', ARRAY(
          SELECT attribute.attname
          FROM unnest(index_state.indkey::smallint[]) WITH ORDINALITY key(attnum, position)
          LEFT JOIN pg_attribute attribute
            ON attribute.attrelid = table_relation.oid AND attribute.attnum = key.attnum
          ORDER BY key.position
        ),
        'opclasses', ARRAY(
          SELECT operator_class.opcname
          FROM unnest(index_state.indclass::oid[]) WITH ORDINALITY class(oid, position)
          JOIN pg_opclass operator_class ON operator_class.oid = class.oid
          ORDER BY class.position
        ),
        'options', ARRAY(
          SELECT option_value
          FROM unnest(index_state.indoption::smallint[]) WITH ORDINALITY option(option_value, position)
          ORDER BY option.position
        ),
        'predicate', pg_get_expr(index_state.indpred, index_state.indrelid, true)
      )
    FROM pg_index index_state
    JOIN pg_class index_relation ON index_relation.oid = index_state.indexrelid
    JOIN target_indexes target ON target.name = index_relation.relname
    JOIN pg_class table_relation ON table_relation.oid = index_state.indrelid
    JOIN pg_namespace namespace ON namespace.oid = table_relation.relnamespace
    JOIN pg_am access_method ON access_method.oid = index_relation.relam
    WHERE namespace.nspname = current_schema()
    UNION ALL
    SELECT 'function', function_record.proname, NULL,
      jsonb_build_object(
        'identityArguments', pg_get_function_identity_arguments(function_record.oid),
        'resultType', format_type(function_record.prorettype, NULL),
        'securityDefiner', function_record.prosecdef,
        'configuration', COALESCE(array_to_string(function_record.proconfig, ','), ''),
        'executableByCurrentUser', has_function_privilege(function_record.oid, 'EXECUTE'),
        'executableByPublic', EXISTS (
          SELECT 1
          FROM aclexplode(
            COALESCE(
              function_record.proacl,
              acldefault('f', function_record.proowner)
            )
          ) privilege
          WHERE privilege.grantee = 0
            AND privilege.privilege_type = 'EXECUTE'
        ),
        'volatility', CASE function_record.provolatile
          WHEN 'v' THEN 'VOLATILE' WHEN 's' THEN 'STABLE' ELSE 'IMMUTABLE' END,
        'parallelSafety', CASE function_record.proparallel
          WHEN 'u' THEN 'UNSAFE' WHEN 'r' THEN 'RESTRICTED' ELSE 'SAFE' END
      )
    FROM pg_proc function_record
    JOIN target_functions target ON target.name = function_record.proname
    JOIN pg_namespace namespace ON namespace.oid = function_record.pronamespace
    WHERE namespace.nspname = current_schema()
      AND function_record.prokind = 'f'
    UNION ALL
    SELECT 'trigger', trigger_record.tgname, relation.relname,
      jsonb_build_object(
        'enabled', trigger_record.tgenabled,
        'functionName', function_record.proname,
        'typeMask', trigger_record.tgtype::int
      )
    FROM pg_trigger trigger_record
    JOIN target_triggers target ON target.name = trigger_record.tgname
    JOIN pg_class relation ON relation.oid = trigger_record.tgrelid
    JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
    JOIN pg_proc function_record ON function_record.oid = trigger_record.tgfoid
    WHERE namespace.nspname = current_schema()
      AND NOT trigger_record.tgisinternal
  `;

  return rows;
};

export const isPersonSchemaCatalogReady = async (
  client: PersonSchemaCatalogClient,
): Promise<boolean> =>
  validatePersonSchemaCatalogRows(await getPersonSchemaCatalogRows(client));

export const createExpectedPersonSchemaCatalogRowsForTests =
  (): PersonSchemaCatalogRow[] => [
    {
      details: { version: '1.6' },
      kind: 'extension',
      objectName: 'pg_trgm',
      tableName: null,
    },
    ...COLUMNS.map(
      ([table, name, position, type, notNull, defaultExpression]) => ({
        details: { defaultExpression, notNull, position, type },
        kind: 'column' as const,
        objectName: name,
        tableName: table,
      }),
    ),
    ...ENUMS.map(([type, label, position]) => ({
      details: { position },
      kind: 'enum' as const,
      objectName: label,
      tableName: type,
    })),
    ...CHECKS.map(([name, table, expression]) => ({
      details: { expression, validated: true },
      kind: 'check' as const,
      objectName: name,
      tableName: table,
    })),
    ...FOREIGN_KEYS.map(
      ([
        name,
        table,
        columns,
        referencedTable,
        referencedColumns,
        onDelete,
        onUpdate,
      ]) => ({
        details: {
          columns: columns.split(','),
          onDelete,
          onUpdate,
          referencedColumns: referencedColumns.split(','),
          referencedTable,
          validated: true,
        },
        kind: 'foreign_key' as const,
        objectName: name,
        tableName: table,
      }),
    ),
    ...INDEXES.map(
      ([name, table, method, unique, columns, opclasses, predicate]) => ({
        details: {
          attributeCount: columns.split(',').length,
          columns: columns.split(','),
          keyCount: columns.split(',').length,
          method,
          opclasses: opclasses.split(','),
          options: columns.split(',').map(() => 0),
          predicate,
          ready: true,
          unique,
          valid: true,
        },
        kind: 'index' as const,
        objectName: name,
        tableName: table,
      }),
    ),
    ...FUNCTIONS.map(
      ([
        name,
        identityArguments,
        resultType,
        securityDefiner,
        configuration,
      ]) => ({
        details: {
          configuration,
          executableByCurrentUser: true,
          executableByPublic: false,
          identityArguments,
          parallelSafety: 'UNSAFE',
          resultType,
          securityDefiner,
          volatility: 'VOLATILE',
        },
        kind: 'function' as const,
        objectName: name,
        tableName: null,
      }),
    ),
    ...TRIGGERS.map(([name, table, functionName, typeMask]) => ({
      details: { enabled: 'O', functionName, typeMask },
      kind: 'trigger' as const,
      objectName: name,
      tableName: table,
    })),
  ];
