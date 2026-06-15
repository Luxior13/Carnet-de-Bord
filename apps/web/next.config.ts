import '$env';

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: {
    // Run ESLint during builds - errors will fail the build, warnings won't
    ignoreDuringBuilds: false,
  },
  images: {
    remotePatterns: [
      {
        hostname: 'i.imgur.com',
        protocol: 'https',
      },
      {
        hostname: 'imgur.com',
        protocol: 'https',
      },
    ],
  },
  poweredByHeader: false,
  reactStrictMode: true,
  transpilePackages: ['@repo/database', '@repo/shared'],
};

export default nextConfig;
