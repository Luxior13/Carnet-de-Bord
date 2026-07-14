import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      $app: resolve(__dirname, 'src/app'),
      $components: resolve(__dirname, 'src/components'),
      $constants: resolve(__dirname, 'src/shared/constants'),
      $context: resolve(__dirname, 'src/shared/context'),
      ['$env']: resolve(__dirname, 'src/env.ts'),
      $server: resolve(__dirname, 'src/shared/server'),
      $types: resolve(__dirname, 'src/shared/types'),
      $ui: resolve(__dirname, 'src/components/ui'),
      $utils: resolve(__dirname, 'src/shared/utils'),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
