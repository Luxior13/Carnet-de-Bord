const PERFORMANCE_TARGET_MARKER =
  /(?:^|[_-])(?:e2e|test|perf(?:ormance)?)(?:[_-]|$)/iu;

export const PERSONS_PERFORMANCE_MINIMUM_COUNTS = Object.freeze({
  auditFieldChanges: 3_000_000n,
  auditLogs: 1_000_000n,
  persons: 100_000n,
});

export const PERSONS_PERFORMANCE_LARGE_RELATIONS = new Set([
  'AuditFieldChange',
  'AuditLog',
  'Person',
  'PersonEmail',
  'PersonPhone',
  'PersonSocialProfile',
]);

export const PERSONS_PERFORMANCE_MAX_BOUNDED_SEQ_SCAN_ROWS = 1_000;

type JsonRecord = Record<string, unknown>;

export type PerformanceDatabaseTarget = Readonly<{
  databaseName: string;
  identity: string;
  schema: string;
}>;

export type PerformanceDatasetCounts = Readonly<{
  auditFieldChanges: bigint;
  auditLogs: bigint;
  persons: bigint;
}>;

export type PlanIndexRequirement = Readonly<{
  description: string;
  oneOf: readonly string[];
}>;

export type PerformancePlanExpectation = Readonly<{
  indexRequirements: readonly PlanIndexRequirement[];
  name: string;
}>;

export type SequentialScanSummary = Readonly<{
  actualVisitedRows: number | null;
  estimatedRows: number | null;
  nodeType: string;
  relation: string;
}>;

export type PerformancePlanSummary = Readonly<{
  bufferUsage: Readonly<{
    sharedHitBlocks: number;
    sharedReadBlocks: number;
    tempReadBlocks: number;
    tempWrittenBlocks: number;
  }>;
  executionTimeMs: number | null;
  indexes: readonly string[];
  planningTimeMs: number | null;
  sequentialScans: readonly SequentialScanSummary[];
}>;

export class PerformancePlanValidationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'PerformancePlanValidationError';
  }
}

const parsePostgresDatabaseTarget = (
  rawValue: string,
  variableName: string,
): PerformanceDatabaseTarget => {
  let url: URL;
  try {
    url = new URL(rawValue);
  } catch {
    throw new Error(`${variableName} must be a valid PostgreSQL URL`);
  }
  if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
    throw new Error(`${variableName} must use the postgres protocol`);
  }
  let databaseName: string;
  try {
    databaseName = decodeURIComponent(url.pathname.replace(/^\//u, ''));
  } catch {
    throw new Error(`${variableName} contains an invalid database name`);
  }
  if (!databaseName) {
    throw new Error(`${variableName} must include a database name`);
  }
  const schema = url.searchParams.get('schema') ?? 'public';
  if (!schema) throw new Error(`${variableName} contains an empty schema name`);
  const rawHostname = url.hostname.toLowerCase();
  const hostname = ['127.0.0.1', '[::1]', '::1', 'localhost'].includes(
    rawHostname,
  )
    ? 'localhost'
    : rawHostname;
  const port = url.port || '5432';

  return {
    databaseName,
    identity: `${hostname}:${port}/${databaseName}?schema=${schema}`,
    schema,
  };
};

const asRecord = (value: unknown): JsonRecord | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;

const readFiniteNumber = (record: JsonRecord, key: string): number | null => {
  // Keys come exclusively from the closed PostgreSQL EXPLAIN contract.
  // eslint-disable-next-line security/detect-object-injection
  const value = record[key];

  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

const unwrapSingleton = (value: unknown, label: string): unknown => {
  if (!Array.isArray(value)) return value;
  if (value.length !== 1) {
    throw new PerformancePlanValidationError(
      `${label} must contain exactly one plan`,
    );
  }

  return value[0];
};

const parseExplainRoot = (raw: unknown): JsonRecord => {
  let candidate = unwrapSingleton(raw, 'EXPLAIN result');
  const row = asRecord(candidate);
  if (row && 'QUERY PLAN' in row) {
    candidate = unwrapSingleton(row['QUERY PLAN'], 'QUERY PLAN');
  }
  const root = asRecord(candidate);
  if (!root || !asRecord(root.Plan)) {
    throw new PerformancePlanValidationError(
      'EXPLAIN JSON does not contain a valid Plan root',
    );
  }

  return root;
};

const walkPlanNodes = (
  node: JsonRecord,
  visit: (current: JsonRecord) => void,
): void => {
  visit(node);
  const children = node.Plans;
  if (children === undefined) return;
  if (!Array.isArray(children)) {
    throw new PerformancePlanValidationError(
      'EXPLAIN JSON contains a non-array Plans field',
    );
  }
  for (const child of children) {
    const parsedChild = asRecord(child);
    if (!parsedChild) {
      throw new PerformancePlanValidationError(
        'EXPLAIN JSON contains an invalid child plan',
      );
    }
    walkPlanNodes(parsedChild, visit);
  }
};

const summarizeSequentialScan = (
  node: JsonRecord,
): SequentialScanSummary | null => {
  const nodeType = node['Node Type'];
  const relation = node['Relation Name'];
  if (
    typeof nodeType !== 'string' ||
    !['Parallel Seq Scan', 'Seq Scan'].includes(nodeType) ||
    typeof relation !== 'string' ||
    !PERSONS_PERFORMANCE_LARGE_RELATIONS.has(relation)
  ) {
    return null;
  }
  const actualRows = readFiniteNumber(node, 'Actual Rows');
  const actualLoops = readFiniteNumber(node, 'Actual Loops') ?? 1;
  const removedByFilter = readFiniteNumber(node, 'Rows Removed by Filter') ?? 0;
  const removedByJoin =
    readFiniteNumber(node, 'Rows Removed by Join Filter') ?? 0;
  const actualVisitedRows =
    actualRows === null
      ? null
      : (actualRows + removedByFilter + removedByJoin) * actualLoops;

  return {
    actualVisitedRows,
    estimatedRows: readFiniteNumber(node, 'Plan Rows'),
    nodeType,
    relation,
  };
};

export const parsePerformanceDatabaseTarget = (
  rawValue: string,
): PerformanceDatabaseTarget => {
  const target = parsePostgresDatabaseTarget(
    rawValue,
    'PERSONS_PERFORMANCE_DATABASE_URL',
  );
  if (
    !PERFORMANCE_TARGET_MARKER.test(target.databaseName) &&
    !PERFORMANCE_TARGET_MARKER.test(target.schema)
  ) {
    throw new Error(
      'Performance check refused: database or schema must contain an explicit test, e2e or perf marker',
    );
  }

  return target;
};

export const assertPerformanceDatabaseIsolation = (
  target: PerformanceDatabaseTarget,
  applicationDatabaseUrl: string | undefined,
): void => {
  if (!applicationDatabaseUrl) return;

  const applicationTarget = parsePostgresDatabaseTarget(
    applicationDatabaseUrl,
    'DATABASE_URL',
  );
  if (applicationTarget.identity === target.identity) {
    throw new Error(
      'Performance check refused: target is also configured as DATABASE_URL',
    );
  }
};

export const parsePerformanceConfirmation = (
  arguments_: readonly string[],
): string => {
  const values = arguments_.filter((argument) => argument !== '--');
  const confirmations = values.filter((argument) =>
    argument.startsWith('--confirm-target='),
  );
  if (values.length !== 1 || confirmations.length !== 1) {
    throw new Error(
      'Exactly one --confirm-target=<host:port/database?schema=name> argument is required',
    );
  }
  const confirmation = confirmations[0]?.slice('--confirm-target='.length);
  if (!confirmation) {
    throw new Error('The performance target confirmation cannot be empty');
  }

  return confirmation;
};

export const assertPerformanceTargetConfirmation = (
  target: PerformanceDatabaseTarget,
  confirmation: string,
): void => {
  if (confirmation !== target.identity) {
    throw new Error(
      `Performance target confirmation mismatch; expected exactly ${target.identity}`,
    );
  }
};

export const assertMinimumPerformanceDataset = (
  counts: PerformanceDatasetCounts,
): void => {
  const missing = [
    ...(counts.persons < PERSONS_PERFORMANCE_MINIMUM_COUNTS.persons
      ? [
          `persons=${String(counts.persons)} (minimum ${String(PERSONS_PERFORMANCE_MINIMUM_COUNTS.persons)})`,
        ]
      : []),
    ...(counts.auditLogs < PERSONS_PERFORMANCE_MINIMUM_COUNTS.auditLogs
      ? [
          `auditLogs=${String(counts.auditLogs)} (minimum ${String(PERSONS_PERFORMANCE_MINIMUM_COUNTS.auditLogs)})`,
        ]
      : []),
    ...(counts.auditFieldChanges <
    PERSONS_PERFORMANCE_MINIMUM_COUNTS.auditFieldChanges
      ? [
          `auditFieldChanges=${String(counts.auditFieldChanges)} (minimum ${String(PERSONS_PERFORMANCE_MINIMUM_COUNTS.auditFieldChanges)})`,
        ]
      : []),
  ];
  if (missing.length > 0) {
    throw new Error(`Performance dataset is too small: ${missing.join(', ')}`);
  }
};

export const summarizePerformancePlan = (
  raw: unknown,
): PerformancePlanSummary => {
  const root = parseExplainRoot(raw);
  const plan = asRecord(root.Plan);
  if (!plan) {
    throw new PerformancePlanValidationError(
      'EXPLAIN JSON does not contain a valid Plan node',
    );
  }
  const indexes = new Set<string>();
  const sequentialScans: SequentialScanSummary[] = [];
  walkPlanNodes(plan, (node) => {
    const indexName = node['Index Name'];
    if (typeof indexName === 'string') indexes.add(indexName);
    const sequentialScan = summarizeSequentialScan(node);
    if (sequentialScan) sequentialScans.push(sequentialScan);
  });

  return {
    bufferUsage: {
      sharedHitBlocks: readFiniteNumber(plan, 'Shared Hit Blocks') ?? 0,
      sharedReadBlocks: readFiniteNumber(plan, 'Shared Read Blocks') ?? 0,
      tempReadBlocks: readFiniteNumber(plan, 'Temp Read Blocks') ?? 0,
      tempWrittenBlocks: readFiniteNumber(plan, 'Temp Written Blocks') ?? 0,
    },
    executionTimeMs: readFiniteNumber(root, 'Execution Time'),
    indexes: [...indexes].sort(),
    planningTimeMs: readFiniteNumber(root, 'Planning Time'),
    sequentialScans,
  };
};

export const assertPerformancePlan = (
  raw: unknown,
  expectation: PerformancePlanExpectation,
): PerformancePlanSummary => {
  const summary = summarizePerformancePlan(raw);
  const usedIndexes = new Set(summary.indexes);
  const missingIndexGroups = expectation.indexRequirements.filter(
    (requirement) =>
      requirement.oneOf.length === 0 ||
      !requirement.oneOf.some((indexName) => usedIndexes.has(indexName)),
  );
  const unboundedScans = summary.sequentialScans.filter((scan) => {
    const visited = scan.actualVisitedRows ?? Number.POSITIVE_INFINITY;
    const estimated = scan.estimatedRows ?? Number.POSITIVE_INFINITY;

    return (
      visited > PERSONS_PERFORMANCE_MAX_BOUNDED_SEQ_SCAN_ROWS ||
      estimated > PERSONS_PERFORMANCE_MAX_BOUNDED_SEQ_SCAN_ROWS
    );
  });
  const failures = [
    ...missingIndexGroups.map(
      (requirement) =>
        `missing index ${requirement.description} (one of: ${requirement.oneOf.join(', ')})`,
    ),
    ...unboundedScans.map(
      (scan) =>
        `unbounded ${scan.nodeType} on ${scan.relation} (actual=${String(scan.actualVisitedRows)}, estimated=${String(scan.estimatedRows)})`,
    ),
  ];
  if (failures.length > 0) {
    throw new PerformancePlanValidationError(
      `${expectation.name}: ${failures.join('; ')}; used indexes: ${summary.indexes.join(', ') || 'none'}`,
    );
  }

  return summary;
};
