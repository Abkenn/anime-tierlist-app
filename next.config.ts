import type { NextConfig } from 'next';
import { parseEnv } from './src/env-schema';

const env = parseEnv(process.env);

const nextConfig: NextConfig = {
  reactCompiler: true,
  outputFileTracingIncludes: {
    '/*': ['./src/app/_assets/fonts/**/*'],
    '/api/tierlist-preview/**': [
      './public/curated/**/*',
      './public/tier-samples/**/*',
      './src/app/_assets/fonts/**/*',
    ],
  },
  logging: {
    serverFunctions: false,
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'anime-tierlist-app.vercel.app' }],
        destination: 'https://anime-tierlist.com/:path*',
        permanent: true,
      },
    ];
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
    exposeTestingApiInProductionBuild: env.EXPOSE_TESTING_API,
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
