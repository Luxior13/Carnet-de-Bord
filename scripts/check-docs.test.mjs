import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { checkDocumentation, headingAnchors } from './check-docs.mjs';

const FOLDER_INDEX = [
  '# Documentation', '[Fiches](pages/README.md)', '[Méthode](methode/audit.md)',
  '[Design](design/README.md)', '[Domaines](domaines/README.md)', '[Système](systeme/README.md)',
  '[Exploitation](exploitation/README.md)', '[Propositions](propositions/README.md)',
].join('\n');

function fixture(t, files = {}) {
  const root = mkdtempSync(path.join(tmpdir(), 'carnet-docs-check-'));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(root)), path.resolve(tmpdir()));
    assert.ok(path.basename(root).startsWith('carnet-docs-check-'));
    rmSync(root, { recursive: true, force: true });
  });
  const write = (file, content) => {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), content);
  };
  for (const [file, content] of Object.entries({
    'AGENTS.md': '[Guide](docs/REFERENCE_GENERALE.md)',
    'CLAUDE.md': '# Consignes pour Claude',
    'README.md': '[Documentation](docs/README.md)',
    'docs/README.md': FOLDER_INDEX,
    'docs/REFERENCE_GENERALE.md': '[Accès](references/acces.md)\n[Fiches](pages/README.md)',
    'docs/pages/README.md': '# Fiches',
    'docs/references/acces.md': '# Accès',
    'docs/methode/audit.md': '# Méthode',
    'docs/design/README.md': '# Design',
    'docs/domaines/README.md': '# Domaines',
    'docs/systeme/README.md': '# Système',
    'docs/exploitation/README.md': '# Exploitation',
    'docs/propositions/README.md': '# Propositions',
    'docs/audits/README.md': '# Audits',
    ...files,
  })) write(file, content);
  return { root, write };
}

test('vérifie les liens locaux, références, images, chemins dynamiques et ancres françaises', (t) => {
  const { root } = fixture(t, {
    'README.md': [
      '[Page](apps/[slug]/page.tsx)',
      '[Document](<docs/Mon document (v2).md#état-du-cache-1>)',
      '[Parenthèses](docs/notes(v2).md)',
      '![Image](image.svg "illustration")',
      '[Référence][guide]',
      '[guide]: docs/REFERENCE_GENERALE.md',
      '[Lien externe](https://example.invalid/absent)',
      '[Contact](mailto:test@example.invalid)',
    ].join('\n'),
    'apps/[slug]/page.tsx': '',
    'docs/Mon document (v2).md': '# État du cache\n## État du cache',
    'docs/notes(v2).md': '',
    'image.svg': '',
  });
  const result = checkDocumentation(root);
  assert.deepEqual(result.errors, []);
  assert.equal(result.sheets, 1);
  assert.equal(result.localLinks, 15);
});

test('reconnaît les titres Unicode, formatés, en double et les ancres explicites', () => {
  const anchors = headingAnchors('# État de `Person`\n## Suite\n## Suite\n<a id="explicite"></a>\n```md\n# Exemple\n```\n## Fiche : champs — 17 octobre 2026');
  assert.deepEqual([...anchors], ['état-de-person', 'suite', 'suite-1', 'fiche--champs--17-octobre-2026', 'explicite']);
});

test('signale un fichier déplacé ou mal capitalisé et une ancre renommée', (t) => {
  const { root } = fixture(t, {
    'README.md': '[Déplacé](apps/ancien.ts)\n[Casse](docs/readme.md)\n[Section](docs/README.md#ancien-titre)',
  });
  const { errors } = checkDocumentation(root);
  assert.equal(errors.length, 3);
  assert.match(errors[0], /README.md:1: cible absente/);
  assert.match(errors[1], /README.md:2: cible absente ou casse incorrecte/);
  assert.match(errors[2], /README.md:3: ancre Markdown absente/);
});

test('découvre les nouvelles fiches et refuse celles oubliées dans le guide', (t) => {
  const { root, write } = fixture(t, { 'docs/references/module/nouvelle.md': '# Nouvelle' });
  assert.match(checkDocumentation(root).errors.join('\n'), /fiche non reliée.*module\/nouvelle.md/);
  write('docs/REFERENCE_GENERALE.md', '[Accès](references/acces.md)\n[Nouvelle](references/module/nouvelle.md)\n[Fiches](pages/README.md)');
  assert.deepEqual(checkDocumentation(root).errors, []);
});

test('ignore les exemples de code et commentaires, contrôle les continuations de liste', (t) => {
  const { root } = fixture(t, {
    'README.md': [
      '````md', '[Faux](absent1.md)', '```', '[Faux](absent2.md)', '````',
      '`[Faux](absent3.md)`', '<!-- [Faux](absent4.md) -->',
      '    [Continuation](absent5.md)', '[Vrai](absent6.md)',
    ].join('\n'),
  });
  const { errors } = checkDocumentation(root);
  assert.equal(errors.length, 2);
  assert.match(errors[0], /README.md:8: cible absente.*absent5/);
  assert.match(errors[1], /README.md:9: cible absente.*absent6/);
});

test('signale un guide absent, un lien d’entrée retiré et une référence de fichier cassée', (t) => {
  const { root } = fixture(t, { 'AGENTS.md': '# Consignes', 'README.md': '[guide]: absent.md' });
  const { errors } = checkDocumentation(root);
  assert.equal(errors.length, 2);
  assert.match(errors.join('\n'), /AGENTS.md: lien vers docs\/REFERENCE_GENERALE.md manquant/);
  assert.match(errors.join('\n'), /absent.md/);
  rmSync(path.join(root, 'docs/REFERENCE_GENERALE.md'));
  assert.match(checkDocumentation(root).errors.join('\n'), /REFERENCE_GENERALE.md: document absent/);
});

test('refuse les chemins propres à une machine, hors dépôt et les URL locales mal encodées', (t) => {
  const { root } = fixture(t, {
    'README.md': '[Machine](C:/projet/doc.md)\n[Hors dépôt](../ailleurs.md)\n[Encodage](%XX.md)',
  });
  const { errors } = checkDocumentation(root);
  assert.equal(errors.length, 3);
  assert.match(errors[0], /chemin relatif/);
  assert.match(errors[1], /hors du dépôt/);
  assert.match(errors[2], /mal encodée/);
});

test('détecte un rapport supprimé mais encore cité par l’index des audits', (t) => {
  const { root } = fixture(t, { 'docs/audits/README.md': '[Logs](2026-07-23-admin-logs.md)' });
  const { errors } = checkDocumentation(root);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /docs\/audits\/README.md:1: cible absente.*2026-07-23-admin-logs/);
});

test('découvre les rapports datés et vérifie aussi leurs liens et ceux de leurs preuves', (t) => {
  const { root, write } = fixture(t, {
    'docs/audits/2026-09-13-api.md': '[Preuve](api-2026-09-13/README.md)',
    'docs/audits/api-2026-09-13/README.md': '[Code retiré](../../../code-retire.ts)',
  });
  const errors = checkDocumentation(root).errors.join('\n');
  assert.match(errors, /rapport non relié.*2026-09-13-api/);
  assert.match(errors, /api-2026-09-13\/README.md:1: cible absente/);
  write('docs/audits/README.md', '[Rapport](2026-09-13-api.md)');
  write('docs/audits/api-2026-09-13/README.md', '`code-retire.ts` (historique)');
  const result = checkDocumentation(root);
  assert.deepEqual(result.errors, []);
  assert.equal(result.reports, 1);
});

test('contrôle aussi les liens de la méthode et du modèle d’audit', (t) => {
  const { root } = fixture(t, {
    'docs/methode/audit.md': '[Fiche retirée](../references/retiree.md)\n[Modèle](modeles/rapport-audit.md)',
    'docs/methode/modeles/rapport-audit.md': '[Section](../audit.md#retiree)',
  });
  const { errors } = checkDocumentation(root);
  assert.equal(errors.length, 2);
  assert.match(errors[0], /methode\/audit.md:1: cible absente/);
  assert.match(errors[1], /rapport-audit.md:1: ancre Markdown absente/);
});

test('découvre les fiches oubliées et accepte les index imbriqués', (t) => {
  const { root, write } = fixture(t, {
    'docs/pages/module/README.md': '[Informations](informations.md)',
    'docs/pages/module/informations.md': '[Module](README.md)',
  });
  const { errors } = checkDocumentation(root);
  assert.equal(errors.length, 2);
  assert.ok(errors.every((error) => /fiche non accessible/.test(error)));
  write('docs/pages/README.md', '[Module](module/README.md)');
  const result = checkDocumentation(root);
  assert.deepEqual(result.errors, []);
  assert.equal(result.pages, 3);
});

test('garde les fiches accessibles depuis les deux points d’entrée', (t) => {
  const { root } = fixture(t, {
    'docs/README.md': FOLDER_INDEX.replace('[Fiches](pages/README.md)', ''),
    'docs/REFERENCE_GENERALE.md': '[Accès](references/acces.md)',
  });
  const { errors } = checkDocumentation(root);
  assert.equal(errors.length, 2);
  assert.ok(errors.every((error) => /lien vers docs\/pages\/README.md manquant/.test(error)));
});

test('signale un index des fiches supprimé', (t) => {
  const { root } = fixture(t);
  rmSync(path.join(root, 'docs/pages/README.md'));
  assert.match(checkDocumentation(root).errors.join('\n'), /index des fiches absent/);
});

test('refuse un document orphelin dans les dossiers de référence, intentions comprises', (t) => {
  const { root, write } = fixture(t, {
    'docs/domaines/orphelin.md': '# Orphelin',
    'docs/propositions/intentions/pages/ancien/groupe.md': '# Ancien cadrage',
  });
  const errors = checkDocumentation(root).errors.join('\n');
  assert.match(errors, /docs\/domaines\/orphelin.md: document non relié/);
  assert.match(errors, /intentions\/pages\/ancien\/groupe.md: document non relié/);
  write('docs/domaines/README.md', '# Domaines\n[Orphelin](orphelin.md)');
  write('docs/propositions/README.md', '[Intentions](intentions/pages/ancien/groupe.md)');
  assert.deepEqual(checkDocumentation(root).errors, []);
});

test('vérifie les guides de la base lorsqu’ils existent', (t) => {
  const { root } = fixture(t, { 'packages/database/prisma/README.md': '[Schéma](schema.prisma)' });
  assert.match(checkDocumentation(root).errors.join('\n'), /prisma\/README.md:1: cible absente/);
});

test('exige une fiche pour chaque page de l’application, groupes de routes et API exclus', (t) => {
  const { root, write } = fixture(t, {
    'apps/web/src/app/page.tsx': '',
    'apps/web/src/app/contact/page.tsx': '',
    'apps/web/src/app/(vitrine)/a-propos/page.tsx': '',
    'apps/web/src/app/systeme/[[...slug]]/page.tsx': '',
    'apps/web/src/app/api/outil/page.tsx': '',
    'apps/page-hors-application/page.tsx': '',
  });
  const errors = checkDocumentation(root).errors.join('\n');
  for (const route of ['/', '/contact', '/a-propos', '/systeme/[[...slug]]']) {
    assert.ok(errors.includes(`page sans fiche dans docs/pages (${route})`), route);
  }
  assert.doesNotMatch(errors, /api\/outil|page-hors-application/);
  write('docs/pages/README.md', '# Fiches\n[Contact](contact.md)\n- `/` : accueil\n- `/a-propos` : redirection\n- `/systeme/[[...slug]]` : routage');
  write('docs/pages/contact.md', '| Route | `/contact` |');
  const result = checkDocumentation(root);
  assert.deepEqual(result.errors, []);
  assert.equal(result.routes, 4);
});
