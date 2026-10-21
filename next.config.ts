import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactCompiler: true,
  headers: async () => [
    {
      source: '/sw.js',
      headers: [
        { key: 'Cache-Control', value: 'no-store, max-age=0' },
        { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        {
          key: 'Content-Security-Policy',
          value: "default-src 'self'; script-src 'self'",
        },
      ],
    },
  ],
  experimental: {
    turbopackRustReactCompiler: true,
    turbopackPluginRuntimeStrategy: 'workerThreads',
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default nextConfig;
