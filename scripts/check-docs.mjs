import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GUIDE = 'docs/REFERENCE_GENERALE.md';
const DOC_INDEX = 'docs/README.md';
const AUDIT_INDEX = 'docs/audits/README.md';
const PAGE_INDEX = 'docs/pages/README.md';
const ROOTS = ['AGENTS.md', 'CLAUDE.md', 'README.md', DOC_INDEX, GUIDE];
// Guides kept next to the database code are link-checked when present.
const DATABASE_GUIDES = ['packages/database/prisma/README.md', 'packages/database/ROOT_RECOVERY.md'];
// Every Markdown file of these folders must be reachable from the entry points.
const FOLDERS = [
  'docs/references', 'docs/methode', 'docs/design', 'docs/domaines',
  'docs/systeme', 'docs/exploitation', 'docs/propositions',
];
const APP_ROUTES = 'apps/web/src/app';
const blank = (text) => text.replace(/[^\n]/g, ' ');

// Keep line numbers while excluding examples and comments from link checks.
function prose(markdown) {
  let fence = null;
  return markdown.replace(/<!--[^]*?-->/g, blank).split(/\r?\n/).map((line) => {
    const marker = line.match(/^ {0,3}(?:>\s*)?(`{3,}|~{3,})(.*)$/);
    if (fence) {
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length && !marker[2].trim()) fence = null;
      return blank(line);
    }
    if (marker) {
      fence = marker[1];
      return blank(line);
    }
    // Indented lines stay checked: here they are list continuations, not code.
    return line;
  }).join('\n');
}

function destination(text, start) {
  let i = start;
  while (/[ \t]/.test(text[i] ?? '') && i < text.length) i++;
  if (text[i] === '<') {
    const end = text.indexOf('>', i + 1);
    return end < 0 ? null : { href: text.slice(i + 1, end), end: end + 1 };
  }
  let href = '';
  let depth = 0;
  for (; i < text.length; i++) {
    const char = text[i];
    if (char === '\\' && /[\\()[\] ]/.test(text[i + 1] ?? '')) {
      href += text[++i];
      continue;
    }
    if (/\s/.test(char) || (char === ')' && depth === 0)) break;
    if (char === '(') depth++;
    if (char === ')') depth--;
    href += char;
  }
  return depth === 0 ? { href, end: i } : null;
}

export function linksIn(markdown) {
  const text = prose(markdown).replace(/(`+)[^]*?\1(?!`)/g, blank);
  const links = [];
  const append = (href, index) => links.push({ href, line: text.slice(0, index).split('\n').length });
  // Inline links and images, including paths with balanced parentheses.
  const inline = /\[(?:\\.|[^\]\\\n])*\]\(/g;
  for (let match; (match = inline.exec(text));) {
    const value = destination(text, inline.lastIndex);
    if (!value || !/^\s*(?:(?:"[^"\n]*"|'[^'\n]*'|\([^\n)]*\))\s*)?\)/.test(text.slice(value.end))) continue;
    append(value.href, match.index);
    inline.lastIndex = value.end;
  }
  // Check reference definitions even when their link is not used yet.
  for (const match of text.matchAll(/^ {0,3}\[[^\]\n]+\]:[ \t]*/gm)) {
    const value = destination(text, match.index + match[0].length);
    if (value) append(value.href, match.index);
  }
  return links;
}

export function headingAnchors(markdown) {
  const text = prose(markdown);
  const used = new Set();
  const anchors = new Set();
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const atx = lines[i].match(/^ {0,3}#{1,6}\s+(.+?)\s*#*\s*$/);
    const heading = atx?.[1] ?? (lines[i].trim() && !/^[|>\s-]/.test(lines[i]) && /^ {0,3}(?:=+|-+)\s*$/.test(lines[i + 1] ?? '') ? lines[i].trim() : null);
    if (heading === null) continue;
    const base = heading.replace(/<[^>]*>/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .toLowerCase().replace(/[^\p{L}\p{M}\p{N}_\- ]/gu, '').replaceAll(' ', '-');
    let slug = base;
    let suffix = 0;
    while (used.has(slug)) slug = `${base}-${++suffix}`;
    used.add(slug);
    anchors.add(slug);
  }
  for (const match of text.matchAll(/\b(?:id|name)=["']([^"']+)["']/g)) anchors.add(match[1]);
  return anchors;
}

function listMarkdown(root, folder) {
  return readdirSync(path.join(root, folder), { withFileTypes: true }).flatMap((entry) => {
    const relative = `${folder}/${entry.name}`;
    if (entry.isDirectory()) return listMarkdown(root, relative);
    return entry.isFile() && entry.name.endsWith('.md') ? [relative] : [];
  }).sort();
}

// Next.js page routes, written as in the page sheets (route groups removed).
function listRoutes(root) {
  const routes = [];
  const walk = (folder) => {
    const entries = readdirSync(path.join(root, folder), { withFileTypes: true });
    if (entries.some((entry) => entry.isFile() && entry.name === 'page.tsx')) {
      const segments = path.posix.relative(APP_ROUTES, folder).split('/')
        .filter((segment) => segment && !/^\(.*\)$/.test(segment));
      routes.push(`/${segments.join('/')}`);
    }
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name !== 'api') walk(`${folder}/${entry.name}`);
    }
  };
  walk(APP_ROUTES);
  return routes.sort();
}

export function checkDocumentation(root) {
  root = path.resolve(root);
  const errors = [];
  const sheets = [];
  const pages = [];
  const foldered = [];
  const texts = new Map();
  let allDocs = [];
  try {
    allDocs = listMarkdown(root, 'docs');
  } catch {
    errors.push('docs: dossier documentaire absent ou illisible');
  }
  const documents = [...new Set([
    ...ROOTS, AUDIT_INDEX, PAGE_INDEX, ...allDocs,
    ...DATABASE_GUIDES.filter((file) => existsSync(path.join(root, file))),
  ])];
  for (const document of allDocs) {
    if (document.startsWith('docs/references/')) sheets.push(document);
    if (document.startsWith('docs/pages/')) pages.push(document);
    else if (FOLDERS.some((folder) => document.startsWith(`${folder}/`))) foldered.push(document);
  }
  for (const folder of FOLDERS) {
    if (!existsSync(path.join(root, folder))) errors.push(`${folder}: dossier documentaire absent`);
  }
  if (!sheets.length) errors.push('docs/references: aucune fiche trouvée');
  // Discover dated reports without checking that their old evidence still applies.
  let reports = [];
  try {
    reports = readdirSync(path.join(root, 'docs/audits'), { withFileTypes: true })
      .filter((entry) => entry.isFile() && /^\d{4}-\d{2}-\d{2}-.+\.md$/.test(entry.name))
      .map((entry) => `docs/audits/${entry.name}`).sort();
  } catch {
    errors.push('docs/audits: dossier des rapports absent ou illisible');
  }
  const directoryEntries = new Map();
  // Check case on Windows too, so links will also work on Linux and GitHub.
  function existsWithExactCase(relative) {
    let parent = root;
    try {
      for (const part of relative.split('/').filter(Boolean)) {
        if (!directoryEntries.has(parent)) directoryEntries.set(parent, readdirSync(parent));
        if (!directoryEntries.get(parent).includes(part)) return false;
        parent = path.join(parent, part);
      }
      return true;
    } catch {
      return false;
    }
  }
  let localLinks = 0;
  const targetsByDocument = new Map();
  const anchorCache = new Map();
  for (const document of documents) {
    let markdown;
    try {
      markdown = readFileSync(path.join(root, document), 'utf8');
    } catch {
      errors.push(`${document}: document absent ou illisible`);
      continue;
    }
    const targets = new Set();
    targetsByDocument.set(document, targets);
    texts.set(document, markdown);
    for (const { href, line } of linksIn(markdown)) {
      const report = (message) => errors.push(`${document}:${line}: ${message} (${href})`);
      if (/^(?:file:|[a-z]:[\\/])/i.test(href) || href.startsWith('\\')) {
        report('utiliser un chemin relatif au dépôt');
        continue;
      }
      if (/^[a-z][a-z\d+.-]*:/i.test(href) || href.startsWith('//')) continue;
      localLinks++;
      try {
        const hash = href.indexOf('#');
        const address = hash < 0 ? href : href.slice(0, hash);
        const fragment = hash < 0 ? '' : decodeURIComponent(href.slice(hash + 1));
        const relative = decodeURIComponent(address.split('?')[0]);
        if (relative.startsWith('/') || relative.includes('\\')) {
          report('utiliser un chemin relatif avec des barres obliques');
          continue;
        }
        const absolute = relative ? path.resolve(root, path.dirname(document), relative) : path.resolve(root, document);
        const target = path.relative(root, absolute).split(path.sep).join('/');
        if (target === '..' || target.startsWith('../') || path.isAbsolute(target)) {
          report('cible hors du dépôt');
          continue;
        }
        targets.add(target);
        if (!existsWithExactCase(target)) {
          report('cible absente ou casse incorrecte');
          continue;
        }
        if (fragment && target.endsWith('.md')) {
          if (!anchorCache.has(target)) anchorCache.set(target, headingAnchors(readFileSync(absolute, 'utf8')));
          if (!anchorCache.get(target).has(fragment)) report('ancre Markdown absente');
        }
      } catch {
        report('cible illisible ou URL mal encodée');
      }
    }
  }
  if (!targetsByDocument.get('AGENTS.md')?.has(GUIDE)) errors.push(`AGENTS.md: lien vers ${GUIDE} manquant`);
  for (const sheet of sheets) {
    if (!targetsByDocument.get(GUIDE)?.has(sheet)) errors.push(`${GUIDE}: fiche non reliée depuis le guide (${sheet})`);
  }
  for (const report of reports) {
    if (!targetsByDocument.get(AUDIT_INDEX)?.has(report)) errors.push(`${AUDIT_INDEX}: rapport non relié depuis l’index (${report})`);
  }
  for (const entry of [DOC_INDEX, GUIDE]) {
    if (!targetsByDocument.get(entry)?.has(PAGE_INDEX)) errors.push(`${entry}: lien vers ${PAGE_INDEX} manquant`);
  }
  // Follow links within the page tree so nested indexes are supported, while
  // disconnected files (including cycles) cannot silently become orphaned.
  const pageSet = new Set(pages);
  const reachable = new Set();
  const pending = pageSet.has(PAGE_INDEX) ? [PAGE_INDEX] : [];
  if (!pending.length) errors.push(`${PAGE_INDEX}: index des fiches absent`);
  while (pending.length) {
    const current = pending.pop();
    if (reachable.has(current)) continue;
    reachable.add(current);
    for (const target of targetsByDocument.get(current) ?? []) {
      if (pageSet.has(target) && !reachable.has(target)) pending.push(target);
    }
  }
  for (const page of pages) {
    if (!reachable.has(page)) errors.push(`${PAGE_INDEX}: fiche non accessible depuis l’index (${page})`);
  }
  // Reference folders must not hide orphans: follow links from the entry points.
  const linked = new Set();
  const queue = [...ROOTS];
  while (queue.length) {
    const current = queue.pop();
    if (linked.has(current)) continue;
    linked.add(current);
    for (const target of targetsByDocument.get(current) ?? []) {
      if (targetsByDocument.has(target)) queue.push(target);
    }
  }
  for (const document of foldered) {
    if (!linked.has(document)) errors.push(`${document}: document non relié depuis les points d’entrée`);
  }
  // Each application page needs a sheet, or a mention as a redirect in an index.
  let routes = [];
  if (existsSync(path.join(root, APP_ROUTES))) {
    routes = listRoutes(root);
    const sheetText = pages.map((page) => texts.get(page) ?? '').join('\n');
    for (const route of routes) {
      if (!sheetText.includes(`\`${route}\``)) errors.push(`${PAGE_INDEX}: page sans fiche dans docs/pages (${route})`);
    }
  }
  return { errors, documents: documents.length, sheets: sheets.length, pages: pages.length, reports: reports.length, routes: routes.length, localLinks };
}

const scriptPath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  const result = checkDocumentation(path.resolve(path.dirname(scriptPath), '..'));
  if (result.errors.length) {
    console.error(`docs:check — ${result.errors.length} incohérence(s) documentaire(s) :`);
    console.error(result.errors.map((error) => `  ${error}`).join('\n'));
    process.exitCode = 1;
  } else {
    console.log(`docs:check ok : ${result.documents} documents contrôlés, ${result.sheets} fiches, ${result.pages} fiches de page pour ${result.routes} routes, ${result.reports} rapports indexés, ${result.localLinks} liens locaux vérifiés.`);
  }
}
