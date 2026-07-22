import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertMinimumPerformanceDataset,
  assertPerformanceDatabaseIsolation,
  assertPerformancePlan,
  assertPerformanceTargetConfirmation,
  parsePerformanceConfirmation,
  parsePerformanceDatabaseTarget,
  PerformancePlanValidationError,
  summarizePerformancePlan,
} from '../scripts/persons-performance-plan.ts';

const wrapPlan = (plan: Record<string, unknown>): unknown => [
  {
    'QUERY PLAN': [
      {
        'Execution Time': 2.5,
        Plan: plan,
        'Planning Time': 0.4,
      },
    ],
  },
];

test('accepts only explicitly marked performance targets', () => {
  const target = parsePerformanceDatabaseTarget(
    'postgresql://user:secret@LOCALHOST:5433/carnet_perf_2026?schema=public',
  );
  assert.deepEqual(target, {
    databaseName: 'carnet_perf_2026',
    identity: 'localhost:5433/carnet_perf_2026?schema=public',
    schema: 'public',
  });
  assert.equal(
    parsePerformanceDatabaseTarget(
      'postgresql://localhost/carnet?schema=e2e_suite',
    ).schema,
    'e2e_suite',
  );
  assert.throws(
    () => parsePerformanceDatabaseTarget('postgresql://localhost/carnet'),
    /explicit test, e2e or perf marker/u,
  );
  assert.throws(
    () =>
      parsePerformanceDatabaseTarget(
        'postgresql://localhost/contest?schema=public',
      ),
    /explicit test, e2e or perf marker/u,
  );
});

test('requires one exact target confirmation and rejects extra arguments', () => {
  const target = parsePerformanceDatabaseTarget(
    'postgresql://localhost:5432/carnet_test?schema=public',
  );
  const confirmation = parsePerformanceConfirmation([
    '--',
    '--confirm-target=localhost:5432/carnet_test?schema=public',
  ]);
  assertPerformanceTargetConfirmation(target, confirmation);
  assert.throws(() => parsePerformanceConfirmation([]), /Exactly one/u);
  assert.throws(
    () =>
      parsePerformanceConfirmation([
        '--confirm-target=localhost:5432/carnet_test?schema=public',
        '--unexpected',
      ]),
    /Exactly one/u,
  );
  assert.throws(
    () => assertPerformanceTargetConfirmation(target, 'another-target'),
    /confirmation mismatch/u,
  );
});

test('rejects the database currently configured for the application', () => {
  const target = parsePerformanceDatabaseTarget(
    'postgresql://perf_user:secret@127.0.0.1:5432/carnet_perf?schema=public',
  );
  assert.throws(
    () =>
      assertPerformanceDatabaseIsolation(
        target,
        'postgresql://app_user:other@localhost/carnet_perf?schema=public',
      ),
    /also configured as DATABASE_URL/u,
  );
  assert.doesNotThrow(() =>
    assertPerformanceDatabaseIsolation(
      target,
      'postgresql://localhost/carnet_production?schema=public',
    ),
  );
});

test('enforces the complete minimum load dataset', () => {
  assert.doesNotThrow(() =>
    assertMinimumPerformanceDataset({
      auditFieldChanges: 3_000_000n,
      auditLogs: 1_000_000n,
      persons: 100_000n,
    }),
  );
  assert.throws(
    () =>
      assertMinimumPerformanceDataset({
        auditFieldChanges: 2_999_999n,
        auditLogs: 999_999n,
        persons: 99_999n,
      }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /auditFieldChanges=2999999/u);
      assert.match(error.message, /auditLogs=999999/u);
      assert.match(error.message, /persons=99999/u);

      return true;
    },
  );
});

test('collects nested bitmap and index scans from PostgreSQL JSON', () => {
  const summary = summarizePerformancePlan(
    wrapPlan({
      'Node Type': 'Bitmap Heap Scan',
      Plans: [
        {
          'Index Name': 'Person_normalizedNickname_trgm_idx',
          'Node Type': 'Bitmap Index Scan',
        },
        {
          'Actual Loops': 1,
          'Actual Rows': 20,
          'Node Type': 'Seq Scan',
          'Plan Rows': 20,
          'Relation Name': 'PersonEmail',
          'Rows Removed by Filter': 5,
        },
      ],
      'Shared Hit Blocks': 42,
      'Shared Read Blocks': 3,
    }),
  );
  assert.deepEqual(summary.indexes, ['Person_normalizedNickname_trgm_idx']);
  assert.equal(summary.executionTimeMs, 2.5);
  assert.deepEqual(summary.bufferUsage, {
    sharedHitBlocks: 42,
    sharedReadBlocks: 3,
    tempReadBlocks: 0,
    tempWrittenBlocks: 0,
  });
  assert.deepEqual(summary.sequentialScans, [
    {
      actualVisitedRows: 25,
      estimatedRows: 20,
      nodeType: 'Seq Scan',
      relation: 'PersonEmail',
    },
  ]);
});

test('accepts one expected index and only a genuinely bounded sequential scan', () => {
  const summary = assertPerformancePlan(
    wrapPlan({
      'Node Type': 'Nested Loop',
      Plans: [
        {
          'Index Name': 'Person_createdAt_id_idx',
          'Node Type': 'Index Scan',
        },
        {
          'Actual Loops': 2,
          'Actual Rows': 10,
          'Node Type': 'Seq Scan',
          'Plan Rows': 10,
          'Relation Name': 'PersonEmail',
          'Rows Removed by Filter': 5,
        },
      ],
    }),
    {
      indexRequirements: [
        {
          description: 'general list',
          oneOf: ['Person_createdAt_id_idx'],
        },
      ],
      name: 'general-list',
    },
  );
  assert.deepEqual(summary.indexes, ['Person_createdAt_id_idx']);
});

test('fails closed on missing indexes and unbounded scans of large relations', () => {
  assert.throws(
    () =>
      assertPerformancePlan(
        wrapPlan({
          'Actual Loops': 1,
          'Actual Rows': 2,
          'Node Type': 'Seq Scan',
          'Plan Rows': 1,
          'Relation Name': 'Person',
          'Rows Removed by Filter': 99_998,
        }),
        {
          indexRequirements: [
            {
              description: 'identity prefix',
              oneOf: ['Person_normalizedNickname_prefix_idx'],
            },
          ],
          name: 'identity-prefix',
        },
      ),
    (error: unknown) => {
      assert.ok(error instanceof PerformancePlanValidationError);
      assert.match(error.message, /missing index identity prefix/u);
      assert.match(error.message, /unbounded Seq Scan on Person/u);

      return true;
    },
  );
});

test('rejects malformed or multi-plan EXPLAIN payloads', () => {
  assert.throws(() => summarizePerformancePlan([]), /exactly one plan/u);
  assert.throws(
    () => summarizePerformancePlan([{ Plan: {} }, { Plan: {} }]),
    /exactly one plan/u,
  );
  assert.throws(
    () => summarizePerformancePlan([{ 'QUERY PLAN': [{ nope: true }] }]),
    /valid Plan root/u,
  );
});
