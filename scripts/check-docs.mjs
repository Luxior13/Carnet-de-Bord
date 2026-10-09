import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, normalize, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const targets = [
  'AGENTS.md',
  'docs/README.md',
  'docs/qualite/README.md',
  'docs/qualite/REVUE_GENERALE.md',
  'docs/qualite/REFERENCES.md',
  'docs/qualite/SUJETS_FUTURS.md',
  'docs/qualite/pages/README.md',
];

const collectMarkdown = (dir) => {
  const output = [];
  if (!existsSync(dir)) return output;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) output.push(...collectMarkdown(path));
    else if (name.endsWith('.md')) output.push(relative(ROOT, path));
  }
  return output;
};

for (const dir of [
  'docs/qualite/fiches',
  'docs/qualite/modeles',
  'docs/qualite/pages',
]) {
  targets.push(...collectMarkdown(join(ROOT, dir)));
}

const errors = [];
const linkPattern = /\[[^\]]*\]\(([^)]+)\)/g;

for (const file of [...new Set(targets)]) {
  const absoluteFile = join(ROOT, file);
  if (!existsSync(absoluteFile)) {
    errors.push(`fichier manquant dans la liste : ${file}`);
    continue;
  }

  const content = readFileSync(absoluteFile, 'utf8');
  let match;
  while ((match = linkPattern.exec(content)) !== null) {
    const rawTarget = match[1].trim();
    if (
      !rawTarget ||
      rawTarget.startsWith('http://') ||
      rawTarget.startsWith('https://') ||
      rawTarget.startsWith('mailto:') ||
      rawTarget.startsWith('#')
    ) {
      continue;
    }

    const pathPart = rawTarget.split(/[?#]/)[0];
    if (!pathPart) continue;

    const absoluteTarget = normalize(
      resolve(dirname(absoluteFile), decodeURIComponent(pathPart)),
    );
    if (!existsSync(absoluteTarget)) {
      errors.push(
        `${relative(ROOT, absoluteFile)} -> ${rawTarget} (introuvable : ${relative(ROOT, absoluteTarget)})`,
      );
    }
  }
}

if (errors.length > 0) {
  console.error('docs:check a trouvé des liens cassés :');
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}

console.log(`docs:check ok (${new Set(targets).size} fichiers contrôlés)`);
