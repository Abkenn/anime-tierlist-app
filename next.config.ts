import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactCompiler: true,
  logging: {
    serverFunctions: false,
  },
  headers: async () => [
    {
      source: '/sw.js',
      headers: [
        { key: 'Cache-Control', value: 'no-store, max-age=0' },
        { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        {
          key: 'Content-Security-Policy',
          // The worker fetches external posters, including user-supplied URLs.
          value:
            "default-src 'self'; script-src 'self'; connect-src 'self' https: http:",
        },
      ],
    },
  ],
  experimental: {
    serverActions: { bodySizeLimit: '4mb' },
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
