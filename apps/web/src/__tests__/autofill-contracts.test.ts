import { globSync, readFileSync } from 'node:fs';

import { type ComponentProps, createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { MfaCodeInput } from '$features/auth/components/MfaCodeInput';
import { Command, CommandInput } from '$ui/command';
import { Input } from '$ui/input';
import { Textarea } from '$ui/textarea';

const expectAutofillDisabled = (markup: string): void => {
  expect(markup).toContain('autoComplete="off"');
  for (const attribute of [
    'data-bwignore',
    'data-1p-ignore',
    'data-lpignore',
  ]) {
    expect(markup).toContain(`${attribute}="true"`);
  }
  expect(markup).toContain('data-form-type="other"');
};

describe('site-wide autofill policy', () => {
  // Deliberately emulate a caller bypassing TypeScript: runtime protection must
  // still win over arbitrary props, including when spread by a parent.
  const conflictingProps = {
    autoComplete: 'on',
    'data-1p-ignore': 'false',
    'data-bwignore': 'false',
    'data-form-type': 'login',
    'data-lpignore': 'false',
  };

  it.each(['text', 'email', 'tel', 'password', 'search'])(
    'disables autofill on %s inputs even when callers opt in',
    (type) => {
      const markup = renderToStaticMarkup(
        createElement(Input, {
          ...conflictingProps,
          defaultValue: 'audit-value',
          id: 'audit-field',
          type,
        } as unknown as ComponentProps<typeof Input>),
      );
      expectAutofillDisabled(markup);
      expect(markup).toContain(`type="${type}"`);
      expect(markup).toContain('value="audit-value"');
      expect(markup).not.toContain('readOnly');
      expect(markup).not.toMatch(/\sdisabled[=\s/>]/);
    },
  );

  it('protects multiline fields without removing their content', () => {
    const markup = renderToStaticMarkup(
      createElement(Textarea, {
        ...conflictingProps,
        defaultValue: 'Audit note',
      } as unknown as ComponentProps<typeof Textarea>),
    );
    expectAutofillDisabled(markup);
    expect(markup).toContain('Audit note</textarea>');
  });

  it('protects the command search field', () => {
    const markup = renderToStaticMarkup(
      createElement(
        Command,
        null,
        createElement(
          CommandInput,
          conflictingProps as unknown as ComponentProps<typeof CommandInput>,
        ),
      ),
    );
    expectAutofillDisabled(markup);
    expect(markup).toContain('role="combobox"');
  });

  it.each(['totp', 'recovery'] as const)(
    'protects %s authentication codes',
    (kind) => {
      const markup = renderToStaticMarkup(
        createElement(MfaCodeInput, {
          id: 'audit-code',
          kind,
          onChange: () => {},
          value: '',
        }),
      );
      expectAutofillDisabled(markup);
      expect(markup).toContain(
        `inputMode="${kind === 'totp' ? 'numeric' : 'text'}"`,
      );
    },
  );

  it('has no page-level opt-ins or unprotected forms, including authentication', () => {
    const sourceRoot = new URL('../', import.meta.url);
    const violations: string[] = [];
    for (const file of globSync('**/*.tsx', { cwd: sourceRoot })) {
      const path = file.replaceAll('\\', '/');
      if (path.startsWith('__tests__/')) continue;
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
          const attributes = node.attributes.properties;
          const isOff = (attribute: ts.JsxAttribute): boolean =>
            !!attribute.initializer &&
            ts.isStringLiteral(attribute.initializer) &&
            attribute.initializer.text === 'off';
          for (const attribute of attributes.filter(ts.isJsxAttribute)) {
            const name = attribute.name.getText(ast);
            if (
              name === 'allowPasswordManager' ||
              (name === 'autoComplete' && !isOff(attribute))
            ) {
              violations.push(`${path}: unexpected ${attribute.getText(ast)}`);
            }
          }
          if (node.tagName.getText(ast) === 'form') {
            const protectedForm = attributes.some((attribute) =>
              ts.isJsxAttribute(attribute)
                ? attribute.name.getText(ast) === 'autoComplete' &&
                  isOff(attribute)
                : attribute.expression.getText(ast) ===
                  'passwordManagerIgnoreAttributes',
            );
            if (!protectedForm)
              violations.push(`${path}: form without autofill protection`);
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(ast);
    }
    expect(violations).toEqual([]);
  });
});
