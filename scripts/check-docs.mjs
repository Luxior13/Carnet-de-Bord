import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const INDEXES = [
  ['docs/qualite/fiches', 'docs/qualite/REVUE_GENERALE.md'],
  ['docs/qualite/modeles', 'docs/qualite/README.md'],
  ['docs/qualite/pages', 'docs/qualite/pages/README.md'],
  ['docs/qualite/decisions', 'docs/qualite/decisions/README.md'],
  ['docs/references', 'docs/qualite/REFERENCES.md'],
  ['docs/plans', 'docs/plans/README.md'],
  ['docs/audits', 'docs/audits/README.md'],
  ['features', 'features/README.md'],
  ['features/pages', 'features/pages/README.md', true],
];

const collectMarkdown = (dir) => {
  const output = [];
  if (!existsSync(dir)) return output;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) output.push(...collectMarkdown(path));
    else if (entry.isFile() && entry.name.endsWith('.md')) output.push(path);
  }
  return output;
};

// Examples inside code blocks and inline code are not navigation links.
export function withoutCode(content) {
  let fence;
  return content
    .replace(/<!--[\s\S]*?-->/g, '')
    .split(/\r?\n/)
    .map((line) => {
      const marker = line.match(/^\s{0,3}(`{3,}|~{3,})/);
      if (fence) {
        if (
          marker &&
          marker[1][0] === fence[0] &&
          marker[1].length >= fence.length
        )
          fence = undefined;
        return '';
      }
      if (marker) {
        fence = marker[1];
        return '';
      }
      return line;
    })
    .join('\n');
}

export function localLinks(content) {
  const text = withoutCode(content).replace(/(`+)[\s\S]*?\1/g, '');
  const destinations = [];
  const destination = (raw) => {
    const value = raw.trim();
    return (
      value.startsWith('<')
        ? value.slice(1, value.indexOf('>'))
        : value.replace(/\s+["'][\s\S]*$/, '')
    ).replace(/\\([() ])/g, '$1');
  };
  for (
    let start = text.indexOf('](');
    start !== -1;
    start = text.indexOf('](', start + 2)
  ) {
    let depth = 1;
    let angle = false;
    for (let end = start + 2; end < text.length; end++) {
      if (text[end] === '\\') {
        end++;
        continue;
      }
      if (text[end] === '<') angle = true;
      if (text[end] === '>') angle = false;
      if (!angle && text[end] === '(') depth++;
      if (!angle && text[end] === ')' && --depth === 0) {
        destinations.push(destination(text.slice(start + 2, end)));
        break;
      }
    }
  }
  for (const match of text.matchAll(/^\s{0,3}\[[^\]]+\]:\s*(.+)$/gm))
    destinations.push(destination(match[1]));
  return destinations.filter(
    (target) => target && !/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(target),
  );
}

export function markdownAnchors(content) {
  const anchors = new Set();
  const used = new Set();
  const text = withoutCode(content);
  const heading = (title) => {
    const base = title
      .toLowerCase()
      .replace(/<[^>]*>/g, '')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/[^\p{L}\p{M}\p{N}_\-\s]/gu, '')
      .trim()
      .replace(/\s/g, '-');
    let slug = base;
    let index = 0;
    while (used.has(slug)) slug = `${base}-${++index}`;
    used.add(slug);
    anchors.add(slug);
  };
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const atx = lines[i].match(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/);
    if (atx) heading(atx[1]);
    else if (
      i > 0 &&
      /^\s{0,3}(?:=+|-+)\s*$/.test(lines[i]) &&
      lines[i - 1].trim() &&
      !/^[|>\s-]/.test(lines[i - 1])
    )
      heading(lines[i - 1]);
  }
  for (const match of text.matchAll(/\b(?:id|name)=["']([^"']+)["']/g))
    anchors.add(match[1]);
  return anchors;
}

export function checkDocuments(
  root = ROOT,
  {
    checkIndexes = true,
    extraFiles = ['AGENTS.md', 'packages/database/prisma/README.md'],
  } = {},
) {
  const files = [
    ...new Set([
      ...extraFiles.map((file) => resolve(root, file)),
      ...collectMarkdown(join(root, 'docs')),
      ...collectMarkdown(join(root, 'features')),
    ]),
  ];
  const errors = [];
  const linksByFile = new Map();
  const anchors = new Map();
  let linkCount = 0;
  for (const file of files) {
    if (!existsSync(file)) {
      errors.push(`Fichier requis absent : ${relative(root, file)}`);
      continue;
    }
    const links = new Set();
    linksByFile.set(file, links);
    for (const raw of localLinks(readFileSync(file, 'utf8'))) {
      linkCount++;
      let target;
      let fragment;
      try {
        const hash = raw.indexOf('#');
        const path = (hash === -1 ? raw : raw.slice(0, hash)).split('?')[0];
        target = path ? resolve(dirname(file), decodeURIComponent(path)) : file;
        fragment = hash === -1 ? '' : decodeURIComponent(raw.slice(hash + 1));
      } catch {
        errors.push(`${relative(root, file)} -> ${raw} (encodage invalide)`);
        continue;
      }
      const local = relative(root, target);
      if (
        local === '..' ||
        local.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) ||
        isAbsolute(local)
      ) {
        errors.push(`${relative(root, file)} -> ${raw} (hors du dépôt)`);
        continue;
      }
      links.add(target);
      if (!existsSync(target)) {
        errors.push(`${relative(root, file)} -> ${raw} (introuvable)`);
        continue;
      }
      if (fragment && target.endsWith('.md')) {
        if (!anchors.has(target))
          anchors.set(target, markdownAnchors(readFileSync(target, 'utf8')));
        if (!anchors.get(target).has(fragment))
          errors.push(`${relative(root, file)} -> ${raw} (ancre absente)`);
      }
    }
  }
  if (checkIndexes) {
    for (const [directory, index, recursive = false] of INDEXES) {
      const indexFile = resolve(root, index);
      if (!existsSync(indexFile)) {
        errors.push(`Index absent : ${index}`);
        continue;
      }
      // Most folders own immediate documents; the legacy page index owns its whole tree.
      for (const file of collectMarkdown(join(root, directory)).filter(
        (file) => recursive || dirname(file) === resolve(root, directory),
      )) {
        if (
          file === indexFile ||
          file.endsWith(`${process.platform === 'win32' ? '\\' : '/'}README.md`)
        )
          continue;
        if (!linksByFile.get(indexFile)?.has(file))
          errors.push(`${relative(root, file)} absent de l’index ${index}`);
      }
    }
  }
  return { errors, fileCount: files.length, linkCount };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const result = checkDocuments();
  if (result.errors.length) {
    console.error('docs:check — incohérences documentaires :');
    for (const error of result.errors) console.error(`  ${error}`);
    process.exitCode = 1;
  } else
    console.log(
      `docs:check ok (${result.fileCount} fichiers, ${result.linkCount} liens locaux et index contrôlés)`,
    );
}
