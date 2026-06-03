import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // API routes run on Node.js runtime (not Edge) so postgres.js works.
  experimental: {},
};

export default nextConfig;
