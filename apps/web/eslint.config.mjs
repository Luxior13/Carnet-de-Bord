import nextPlugin from '@next/eslint-plugin-next';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import hooksPlugin from 'eslint-plugin-react-hooks';
import regexpPlugin from 'eslint-plugin-regexp';
import security from 'eslint-plugin-security';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import sortKeysCustomOrder from 'eslint-plugin-sort-keys-custom-order';
import ts from 'typescript-eslint';
import unusedImports from 'eslint-plugin-unused-imports';
import turboPlugin from 'eslint-plugin-turbo';

export default [
  ...ts.configs.strict,
  eslintPluginPrettierRecommended,
  security.configs.recommended,
  regexpPlugin.configs['flat/recommended'],
  {
    name: 'next/recommended',
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
  },
  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    ignores: ['dist/**', 'node_modules', '.next', '*.mjs'],
    plugins: {
      turbo: turboPlugin,
      'react-hooks': hooksPlugin,
      'simple-import-sort': simpleImportSort,
      'sort-keys-custom-order': sortKeysCustomOrder,
      'unused-imports': unusedImports,
    },
    rules: {
      ...hooksPlugin.configs.recommended.rules,
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      'no-duplicate-imports': 'error',
      'simple-import-sort/exports': 'warn',
      'simple-import-sort/imports': 'warn',
      'no-console': 'warn',
      'no-template-curly-in-string': 'error',
      'sort-keys-custom-order/object-keys': 'warn',
      'turbo/no-undeclared-env-vars': 'error',
      'sort-keys-custom-order/type-keys': 'warn',
      'padding-line-between-statements': [
        'error',
        {
          blankLine: 'always',
          prev: '*',
          next: 'return',
        },
      ],
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],
    },
  },
];
