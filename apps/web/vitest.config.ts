import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Tests run server-side and only need CSS module class names, not the
  // Tailwind pipeline. Skipping the project PostCSS config avoids the
  // Vite/PostCSS plugin-resolution clash while keeping class mapping intact.
  css: {
    postcss: { plugins: [] },
  },
  resolve: {
    alias: {
      $app: resolve(__dirname, 'src/app'),
      $components: resolve(__dirname, 'src/components'),
      $constants: resolve(__dirname, 'src/shared/constants'),
      $context: resolve(__dirname, 'src/shared/context'),
      ['$env']: resolve(__dirname, 'src/env.ts'),
      $features: resolve(__dirname, 'src/features'),
      $hooks: resolve(__dirname, 'src/shared/hooks'),
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
