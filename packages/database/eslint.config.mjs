import importPlugin from 'eslint-plugin-import';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import regexpPlugin from 'eslint-plugin-regexp';
import security from 'eslint-plugin-security';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import sortKeysCustomOrder from 'eslint-plugin-sort-keys-custom-order';
import turboPlugin from 'eslint-plugin-turbo';
import unusedImports from 'eslint-plugin-unused-imports';
import ts from 'typescript-eslint';

// https://www.npmjs.com/package/eslint-plugin-workspaces

export default [
  ...ts.configs.strict,
  eslintPluginPrettierRecommended,
  security.configs.recommended,
  regexpPlugin.configs['flat/recommended'],
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    ignores: ['dist/**', 'node_modules/**', '.next/**', '*.mjs'],
    plugins: {
      import: importPlugin,
      'simple-import-sort': simpleImportSort,
      'sort-keys-custom-order': sortKeysCustomOrder,
      turbo: turboPlugin,
      'unused-imports': unusedImports,
    },
    rules: {
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      'import/no-duplicates': 'error',
      'no-console': 'warn',
      'no-template-curly-in-string': 'error',
      'padding-line-between-statements': [
        'error',
        {
          blankLine: 'always',
          next: 'return',
          prev: '*',
        },
      ],
      'simple-import-sort/exports': 'warn',
      'simple-import-sort/imports': 'warn',
      'sort-keys-custom-order/object-keys': 'warn',
      'sort-keys-custom-order/type-keys': 'warn',
      'turbo/no-undeclared-env-vars': 'error',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          args: 'after-used',
          argsIgnorePattern: '^_',
          vars: 'all',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
];
