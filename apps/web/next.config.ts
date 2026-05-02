import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable React strict mode for catching common issues early
  reactStrictMode: true,

  // Expose public env vars to the browser
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000',
  },

  // Proxy /api requests to the NestJS API in development
  // In production, configure your reverse proxy (nginx / Caddy) instead.
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000'}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
