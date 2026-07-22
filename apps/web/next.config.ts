import '$env';

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: {
    // Run ESLint during builds - errors will fail the build, warnings won't
    ignoreDuringBuilds: false,
  },
  poweredByHeader: false,
  reactStrictMode: true,
  redirects: async () => [
    {
      destination: '/vie-interne/repertoire',
      permanent: true,
      source: '/personnes',
    },
    {
      destination: '/vie-interne/repertoire/:path*',
      permanent: true,
      source: '/personnes/:path*',
    },
  ],
  transpilePackages: ['@repo/database', '@repo/shared'],
};

export default nextConfig;
