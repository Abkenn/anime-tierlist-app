import { databaseConnectionUrl, env } from '@/env';
import 'server-only';
import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import { Pool } from 'pg';

const baseURL =
  env.BETTER_AUTH_URL ??
  env.SITE_URL ??
  (env.VERCEL === '1' ? 'https://anime-tierlist.com' : 'http://localhost:3000');
const authGlobal = globalThis as typeof globalThis & {
  tierlistAuthPool?: Pool;
};
const pool =
  authGlobal.tierlistAuthPool ??
  new Pool({
    connectionString: databaseConnectionUrl,
    max: 5,
    connectionTimeoutMillis: 8000,
    idleTimeoutMillis: 30000,
  });

if (env.NODE_ENV !== 'production') {
  authGlobal.tierlistAuthPool = pool;
}

export const auth = betterAuth({
  appName: 'Anime Tierlist',
  logger: {
    log: (level, message, ...args: unknown[]) => {
      const details = [message, ...args].map(String).join(' ');
      if (
        /ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|ETIMEDOUT|connection timeout/iu.test(
          details,
        )
      ) {
        console.warn(
          'Account database is temporarily unreachable. Local editing remains available.',
        );
      } else if (level === 'error') {
        console.error(message, ...args);
      } else if (level === 'warn') {
        console.warn(message, ...args);
      }
    },
  },
  baseURL,
  secret: env.AUTH_SECRET,
  database: pool,
  user: { modelName: 'AuthUser' },
  session: { modelName: 'AuthSession', expiresIn: 30 * 86400 },
  account: {
    modelName: 'AuthAccount',
    encryptOAuthTokens: true,
    accountLinking: { enabled: false },
  },
  verification: { modelName: 'AuthVerification' },
  rateLimit: { enabled: true, storage: 'database', modelName: 'AuthRateLimit' },
  onAPIError: { errorURL: `${baseURL}/?google=failed` },
  socialProviders:
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID ?? '',
            clientSecret: env.GOOGLE_CLIENT_SECRET ?? '',
            redirectURI: `${baseURL}/api/auth/google/callback`,
            prompt: 'select_account',
          },
        }
      : {},
  plugins: [nextCookies()],
});
