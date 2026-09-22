import { globSync, readFileSync } from 'node:fs';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const sourceRoot = new URL('../', import.meta.url);
const nativeControls = new Set([
  'button',
  'details',
  'summary',
  'input',
  'select',
  'textarea',
  'label',
  'progress',
]);

describe('shared UI boundaries', () => {
  it('uses UI primitives for visible controls throughout the application', () => {
    const violations: string[] = [];
    for (const file of globSync('**/*.tsx', { cwd: sourceRoot })) {
      const path = file.replaceAll('\\', '/');
      if (path.startsWith('components/ui/') || path.startsWith('__tests__/'))
        continue;
      // Repository-owned paths enumerated above; no external input.
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      const source = readFileSync(new URL(path, sourceRoot), 'utf8');
      const ast = ts.createSourceFile(
        path,
        source,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      );
      const visit = (node: ts.Node): void => {
        if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
          const tag = node.tagName.getText(ast);
          if (nativeControls.has(tag)) {
            const attributes = new Map(
              node.attributes.properties
                .filter(ts.isJsxAttribute)
                .map((attribute) => [
                  attribute.name.getText(ast),
                  attribute.initializer?.getText(ast) ?? 'true',
                ]),
            );
            // Invisible username hints associate the password with its account.
            // They deliberately bypass Input's visible-field/password-manager behavior.
            const isAutofillHint =
              tag === 'input' &&
              attributes.get('autoComplete') === '"username"' &&
              attributes.get('aria-hidden') === '"true"' &&
              attributes.get('className') === '"sr-only"' &&
              attributes.get('readOnly') === 'true' &&
              attributes.get('tabIndex') === '{-1}';
            if (!isAutofillHint)
              violations.push(
                `${path}:${ast.getLineAndCharacterOfPosition(node.getStart()).line + 1} <${tag}>`,
              );
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(ast);
    }
    expect(violations).toEqual([]);
  });
});
