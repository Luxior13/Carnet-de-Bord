/*
 * Run from any directory: node docs/audits/schema-prisma-2026-10-13/coverage.cjs
 * Checks textual inventory coverage only. It does not validate Prisma, SQL,
 * business reasoning or the correctness of a documented type/default/relation.
 * The parser deliberately accepts the repository's current one-line declarations
 * and fails on an unfamiliar schema line instead of silently ignoring it.
 */
'use strict';

const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../..');
const SCHEMA = 'packages/database/prisma/schema.prisma';
const OUTPUT = path.join(__dirname, 'preuves/couverture.json');
const DOCUMENTS = ['comptes.md', 'personnes.md', 'audit-technique.md'];
const PERSONS = new Set([
  'PersonStructureStatus', 'Person', 'PersonEmail', 'PersonPhone',
  'PersonSocialProfile', 'PersonDeletionTombstone',
]);
const AUDIT = new Set([
  'AuditFieldChangeType', 'AuditValueStorageMode', 'AuditAction', 'AuditCategory',
  'AuditEventKind', 'AuditStream', 'AuditOutcome', 'AuditSeverity', 'AuditLog',
  'AuditEncryptionKeyVersion', 'AuditFieldChange', 'ArchivedStaffProfile',
  'RateLimit', 'InternalAnnouncement', 'SystemSetting',
]);

const normalized = (value) => value.replace(/\\\|/gu, '|').replace(/\s+/gu, ' ').trim();
const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');
const relative = (file) => path.relative(ROOT, file).split(path.sep).join('/');
const codeSpans = (text) => [...text.matchAll(/`([^`]+)`/gu)].map((match) => normalized(match[1]));
const owner = (name) => PERSONS.has(name) ? 'personnes.md' : AUDIT.has(name) ? 'audit-technique.md' : 'comptes.md';

// Keep escaped pipes and pipes inside inline code in their original cell.
function tableCells(line) {
  const cells = [];
  let value = '';
  let code = false;
  let escaped = false;
  for (const char of line.trim()) {
    if (char === '|' && !code && !escaped) {
      cells.push(value.trim());
      value = '';
    } else {
      value += char;
      if (char === '`' && !escaped) code = !code;
    }
    escaped = char === '\\' && !escaped;
  }
  if (value.trim()) cells.push(value.trim());
  if (cells[0] === '') cells.shift();
  return cells;
}

function parseSchema(buffer) {
  const lines = buffer.toString('utf8').split(/\r?\n/u);
  if (lines.at(-1) === '') lines.pop();
  const blocks = [];
  const ignored = { blank: [], comment: [], closingBrace: [] };
  const errors = [];
  let current = null;
  lines.forEach((raw, index) => {
    const line = index + 1;
    const text = raw.trim();
    if (!text) { ignored.blank.push(line); return; }
    if (text.startsWith('//')) { ignored.comment.push(line); return; }
    const opening = /^(generator|datasource|enum|model)\s+(\w+)\s*\{$/u.exec(text);
    if (opening) {
      if (current) errors.push({ line, text, reason: 'nested-block' });
      current = { kind: opening[1], name: opening[2], from: line, to: null, declarations: [] };
      blocks.push(current);
      return;
    }
    if (text === '}' && current) {
      current.to = line;
      current = null;
      ignored.closingBrace.push(line);
      return;
    }
    if (!current) { errors.push({ line, text, reason: 'outside-block' }); return; }
    const kind = current.kind === 'enum' ? 'enum-member'
      : current.kind === 'generator' || current.kind === 'datasource' ? 'configuration'
        : text.startsWith('@@') ? 'directive' : 'field';
    const supported = kind === 'enum-member' ? /^\w+$/u.test(text)
      : kind === 'configuration' ? /^\w+\s*=\s*.+$/u.test(text)
        : kind === 'directive' ? /^@@\w+\(.*\)$/u.test(text)
          : /^\w+\s+\w+(?:\?|\[\])?(?:\s+.*)?$/u.test(text);
    if (!supported) { errors.push({ line, text, reason: 'unsupported-declaration-shape' }); return; }
    const declaration = normalized(text);
    current.declarations.push({ line, kind, declaration, member: /^\w+/u.exec(text)?.[0] ?? null });
  });
  if (current) errors.push({ line: current.from, reason: 'unclosed-block' });
  return { lines: lines.length, blocks, ignored, errors };
}

function parseDocument(file, blocks) {
  const fullPath = path.join(__dirname, file);
  if (!fs.existsSync(fullPath)) return { file, exists: false, rows: [], headings: [] };
  const buffer = fs.readFileSync(fullPath);
  const lines = buffer.toString('utf8').split(/\r?\n/u);
  if (lines.at(-1) === '') lines.pop();
  const names = new Set(blocks.map((block) => block.name));
  const blockSignatures = new Map(blocks.map((block) => [`${block.kind} ${block.name}`, block.name]));
  const rows = [];
  const headings = [];
  let scope = null;
  lines.forEach((text, index) => {
    if (/^#{1,6}\s/u.test(text)) {
      const headingText = normalized(text.replace(/^#{1,6}\s+/u, ''));
      const identified = [...new Set([
        ...codeSpans(text).map((span) => span.replace(/^(?:model|enum|generator|datasource) /u, '')).filter((name) => names.has(name)),
        ...(names.has(headingText) ? [headingText] : []),
        ...(blockSignatures.has(headingText) ? [blockSignatures.get(headingText)] : []),
      ])];
      if (identified.length === 1) scope = identified[0];
      headings.push({ line: index + 1, text, blocks: identified });
    }
    if (!/^\s*\|/u.test(text)) return;
    const cells = tableCells(text);
    if (cells.length < 2 || cells.every((cell) => /^[: -]+$/u.test(cell))) return;
    const ownLine = /^(\d+)(?:\s*[—–-]\s*|$)/u.exec(cells[0]);
    const sourceLine = ownLine ? Number(ownLine[1]) : null;
    const cell = ownLine && /^\d+$/u.test(cells[0]) ? cells[1] : cells[0].replace(/^\d+\s*[—–-]\s*/u, '');
    const codes = codeSpans(cell);
    const declaredBlocks = codes.filter((code) => blockSignatures.has(code));
    if (declaredBlocks.length === 1) scope = blockSignatures.get(declaredBlocks[0]);
    rows.push({ line: index + 1, sourceLine, scope, cell, codes });
  });
  return { file, path: relative(fullPath), exists: true, sha256: sha256(buffer), lines: lines.length, rows, headings };
}

function matchDeclaration(block, declaration, document, memberCounts) {
  const candidates = document.rows.filter((row) =>
    row.sourceLine === declaration.line ||
    (row.sourceLine === null && (row.scope === block.name ||
      (declaration.kind === 'enum-member' && memberCounts.get(declaration.declaration) === 1))));
  const exact = candidates.find((row) => row.codes.includes(declaration.declaration));
  if (exact) return evidence(exact, document.file, 'exact-normalized-declaration');
  const indexName = /\bmap:\s*"([^"]+)"/u.exec(declaration.declaration)?.[1];
  if (declaration.kind === 'directive' && indexName) {
    const named = candidates.find((row) => row.codes.includes(indexName));
    if (named) return evidence(named, document.file, 'explicit-index-name-abbreviated-row');
  }
  if (declaration.kind === 'field' || declaration.kind === 'configuration') {
    const named = candidates.find((row) => row.codes.some((span) =>
      span === declaration.member || span.startsWith(`${declaration.member} `)));
    if (named) return evidence(named, document.file, 'explicit-member-abbreviated-row');
  }
  return null;
}

function evidence(row, document, method) {
  return { document, line: row.line, method, declarationCell: row.cell };
}

const schemaBuffer = fs.readFileSync(path.join(ROOT, SCHEMA));
const parsed = parseSchema(schemaBuffer);
const documents = DOCUMENTS.map((file) => parseDocument(file, parsed.blocks));
const memberCounts = new Map();
for (const block of parsed.blocks.filter((item) => item.kind === 'enum')) {
  for (const item of block.declarations) memberCounts.set(item.declaration, (memberCounts.get(item.declaration) ?? 0) + 1);
}
const blocks = parsed.blocks.map((block) => {
  const document = documents.find((item) => item.file === owner(block.name));
  const heading = document.headings.find((item) => item.blocks.includes(block.name));
  const blockRow = document.rows.find((row) => row.codes.includes(block.name) || row.codes.includes(`${block.kind} ${block.name}`));
  return {
    ...block,
    document: document.file,
    blockEvidence: heading ? { line: heading.line, method: 'explicit-heading' }
      : blockRow ? { line: blockRow.line, method: 'explicit-table-row' } : null,
    declarations: block.declarations.map((item) => ({ ...item, evidence: matchDeclaration(block, item, document, memberCounts) })),
  };
});
const declarations = blocks.flatMap((block) => block.declarations.map((item) => ({ block: block.name, ...item })));
const missing = declarations.filter((item) => !item.evidence);
const uncoveredBlocks = blocks.filter((block) => !block.blockEvidence).map(({ name, kind, from, to }) => ({ name, kind, from, to }));
const byKind = Object.fromEntries(['field', 'enum-member', 'directive', 'configuration'].map((kind) => [kind, declarations.filter((item) => item.kind === kind).length]));
const byDocument = Object.fromEntries(DOCUMENTS.map((document) => {
  const assigned = blocks.filter((block) => block.document === document);
  const items = assigned.flatMap((block) => block.declarations);
  return [document, { blocks: assigned.length, declarations: items.length, covered: items.filter((item) => item.evidence).length }];
}));
const abbreviated = declarations.filter((item) => item.evidence && item.evidence.method !== 'exact-normalized-declaration');
const duplicateAssignments = [];
const used = new Map();
for (const item of declarations.filter((item) => item.evidence)) {
  const key = `${item.evidence.document}:${item.evidence.line}`;
  const previous = used.get(key);
  if (previous) duplicateAssignments.push({ row: key, declarations: [previous, `${item.block}:${item.line}`] });
  else used.set(key, `${item.block}:${item.line}`);
}
const report = {
  generatedAt: new Date().toISOString(),
  purpose: 'Textual inventory coverage only; not a proof of schema correctness, SQL behavior or business reasoning.',
  matchingRules: [
    'Only declaration cells of explicit Markdown table rows are considered, never their justification prose.',
    'Rows are tied to a schema line, an explicit block heading, or a preceding table row declaring the block; unique enum members may also match an unnumbered row in their assigned document.',
    'Whitespace and escaped Markdown pipes are normalized. Most rows reproduce the whole declaration.',
    'Abbreviated rows must explicitly name the field or the mapped index; those matches prove presence only, not that every attribute was reproduced.',
    'Inline field attributes belong to that field declaration. Block headers, comments and blank/brace lines are counted separately.',
  ],
  schema: { path: SCHEMA, sha256: sha256(schemaBuffer), lines: parsed.lines },
  documents: documents.map(({ rows, headings, ...metadata }) => metadata),
  summary: { blocks: blocks.length, declarations: declarations.length, byKind, byDocument, covered: declarations.length - missing.length, exact: declarations.length - missing.length - abbreviated.length, abbreviated: abbreviated.length, missing: missing.length, blocksWithoutEvidence: uncoveredBlocks.length, duplicateAssignments: duplicateAssignments.length, parserErrors: parsed.errors.length },
  blocks,
  missing,
  uncoveredBlocks,
  abbreviatedRows: abbreviated,
  duplicateAssignments,
  ignoredSchemaLines: parsed.ignored,
  parserErrors: parsed.errors,
};
fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ output: relative(OUTPUT), ...report.summary, absentDocuments: documents.filter((document) => !document.exists).map((document) => document.file) }, null, 2));
process.exitCode = missing.length || uncoveredBlocks.length || duplicateAssignments.length || parsed.errors.length || documents.some((document) => !document.exists) ? 1 : 0;
