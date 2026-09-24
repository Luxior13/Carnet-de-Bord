import '$env';

import type { NextConfig } from 'next';

import { PAGE_REDIRECTS } from './src/shared/constants/routes.constants';

const nextConfig: NextConfig = {
  // Keep `next dev` from rewriting production build chunks when both commands
  // run in the same workspace. Next sets NODE_ENV before loading this config.
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next-build',
  eslint: {
    // Run ESLint during builds - errors will fail the build, warnings won't
    ignoreDuringBuilds: false,
  },
  poweredByHeader: false,
  reactStrictMode: true,
  redirects: async () => PAGE_REDIRECTS,
  transpilePackages: ['@repo/database', '@repo/shared'],
};

export default nextConfig;
