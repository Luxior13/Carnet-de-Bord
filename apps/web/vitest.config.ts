import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '$server': resolve(__dirname, 'src/shared/server'),
      '$utils': resolve(__dirname, 'src/shared/utils'),
      '$types': resolve(__dirname, 'src/shared/types'),
      '$constants': resolve(__dirname, 'src/shared/constants'),
      '$context': resolve(__dirname, 'src/shared/context'),
      '$components': resolve(__dirname, 'src/components'),
      '$ui': resolve(__dirname, 'src/components/ui'),
      '$app': resolve(__dirname, 'src/app'),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
