import { readFileSync } from 'node:fs';

import { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';

// Test-owned static path; no external input reaches the filesystem call.
// eslint-disable-next-line security/detect-non-literal-fs-filename
const migrationSql = readFileSync(
  new URL(
    '../../../../packages/database/prisma/migrations/20260721120000_person_identity_foundation/migration.sql',
    import.meta.url,
  ),
  'utf8',
);

const findModel = (
  name: string,
): (typeof Prisma.dmmf.datamodel.models)[number] => {
  const model = Prisma.dmmf.datamodel.models.find(
    (candidate) => candidate.name === name,
  );
  if (!model) throw new Error(`Missing generated Prisma model: ${name}`);

  return model;
};

describe('Person and User isolation contract', () => {
  it('has no relation field in either direction in generated Prisma metadata', () => {
    const personRelations = findModel('Person')
      .fields.filter((field) => field.kind === 'object')
      .map((field) => field.type);
    const userRelations = findModel('User')
      .fields.filter((field) => field.kind === 'object')
      .map((field) => field.type);

    expect(personRelations).toEqual([
      'PersonEmail',
      'PersonPhone',
      'PersonSocialProfile',
    ]);
    expect(personRelations).not.toContain('User');
    expect(userRelations).not.toContain('Person');
    expect(findModel('Person').fields.map((field) => field.name)).not.toContain(
      'userId',
    );
  });

  it('creates no Person-to-User foreign key or synchronization trigger', () => {
    const statements = migrationSql
      .split(';')
      .map((statement) => statement.trim())
      .filter(Boolean);
    const personUserForeignKeys = statements.filter(
      (statement) =>
        /ALTER TABLE\s+"public"\."Person(?:Email|Phone|SocialProfile)?"/u.test(
          statement,
        ) && /REFERENCES\s+"public"\."User"/u.test(statement),
    );
    const personUserTriggers = statements.filter(
      (statement) =>
        /CREATE TRIGGER/u.test(statement) &&
        /\bPerson\b/u.test(statement) &&
        /\bUser\b/u.test(statement),
    );

    expect(personUserForeignKeys).toEqual([]);
    expect(personUserTriggers).toEqual([]);
  });

  it('enforces one primary contact per aggregate or per social network in PostgreSQL', () => {
    expect(migrationSql).toMatch(
      /CREATE UNIQUE INDEX "PersonEmail_one_primary_per_person_idx"\s+ON "public"\."PersonEmail"\("personId"\) WHERE "isPrimary" = true;/u,
    );
    expect(migrationSql).toMatch(
      /CREATE UNIQUE INDEX "PersonPhone_one_primary_per_person_idx"\s+ON "public"\."PersonPhone"\("personId"\) WHERE "isPrimary" = true;/u,
    );
    expect(migrationSql).toMatch(
      /CREATE UNIQUE INDEX "PersonSocialProfile_one_primary_per_network_idx"\s+ON "public"\."PersonSocialProfile"\("personId", "networkKey"\) WHERE "isPrimary" = true;/u,
    );
  });
});
