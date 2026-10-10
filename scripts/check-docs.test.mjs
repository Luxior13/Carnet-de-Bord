import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { checkDocuments, localLinks, markdownAnchors } from './check-docs.mjs';

function fixture(t) {
  const base = resolve(tmpdir());
  const root = mkdtempSync(join(base, 'noctambule-docs-'));
  t.after(() => {
    assert.equal(dirname(resolve(root)), base);
    assert.ok(root.startsWith(join(base, 'noctambule-docs-')));
    rmSync(root, { recursive: true, force: true });
  });
  return {
    root,
    write(path, text) {
      const file = join(root, path);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, text);
    },
  };
}
const options = { checkIndexes: false, extraFiles: [] };

test('ignores code examples and external URLs while checking real links', (t) => {
  const f = fixture(t);
  f.write(
    'docs/a.md',
    '# Départ\n[ok](b.md#suite)\n`[exemple](absent.md)`\n```md\n[exemple](absent.md)\n```\n[web](https://example.com)',
  );
  f.write('docs/b.md', '# Suite');
  assert.deepEqual(checkDocuments(f.root, options).errors, []);
  assert.equal(checkDocuments(f.root, options).linkCount, 1);
});

test('reports missing targets, anchors, invalid encoding and paths outside the repo', (t) => {
  const f = fixture(t);
  f.write(
    'docs/a.md',
    '[missing](b.md)\n[anchor](#absent)\n[invalid](%ZZ)\n[outside](../../outside.md)',
  );
  const errors = checkDocuments(f.root, options).errors.join('\n');
  for (const reason of [
    'introuvable',
    'ancre absente',
    'encodage invalide',
    'hors du dépôt',
  ])
    assert.ok(errors.includes(reason), reason);
});

test('reads parentheses, escaped parentheses, titles, angle paths and reference definitions', () => {
  assert.deepEqual(
    localLinks(
      '[a](file(v2).md) [b](file\\(v2\\).md "titre") [c](<a b.md>)\n[ref]: other.md "titre"',
    ),
    ['file(v2).md', 'file(v2).md', 'a b.md', 'other.md'],
  );
});

test('recognizes Unicode, formatted headings, duplicates and explicit anchors', () => {
  const anchors = markdownAnchors(
    '# État de `Person`\n## Suite\n## Suite\n<a id="explicite"></a>\n```md\n# Exemple\n```',
  );
  assert.deepEqual(
    [...anchors],
    ['état-de-person', 'suite', 'suite-1', 'explicite'],
  );
});

test('discovers added documents and requires their entry in the owning index', (t) => {
  const f = fixture(t);
  const indexes = [
    'docs/qualite/REVUE_GENERALE.md',
    'docs/qualite/README.md',
    'docs/qualite/pages/README.md',
    'docs/qualite/decisions/README.md',
    'docs/qualite/REFERENCES.md',
    'docs/plans/README.md',
    'docs/audits/README.md',
    'features/README.md',
    'features/pages/README.md',
  ];
  for (const index of indexes) f.write(index, '# Index');
  f.write('docs/audits/new.md', '# Rapport\n[broken](missing.md)');
  const check = () => checkDocuments(f.root, { extraFiles: [] });
  assert.ok(check().errors.some((error) => error.includes('introuvable')));
  assert.ok(
    check().errors.some((error) => error.includes('absent de l’index')),
  );
  f.write('docs/audits/new.md', '# Rapport');
  f.write('docs/audits/README.md', '[Rapport](new.md)');
  assert.deepEqual(check().errors, []);
  f.write('features/pages/ancien/groupe.md', '# Ancien cadrage');
  assert.ok(
    check().errors.some((error) =>
      error.includes('absent de l’index features/pages/README.md'),
    ),
  );
  f.write('features/pages/README.md', '[Ancien cadrage](ancien/groupe.md)');
  assert.deepEqual(check().errors, []);
});

test('checks same-document encoded anchors and local images', (t) => {
  const f = fixture(t);
  f.write('docs/a.md', '# État\n[ici](#%C3%A9tat)\n![image](image.svg)');
  f.write('docs/image.svg', '<svg/>');
  assert.deepEqual(checkDocuments(f.root, options).errors, []);
});
