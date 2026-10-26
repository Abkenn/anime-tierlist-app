import 'server-only';
import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import { Pool } from 'pg';

const baseURL =
  process.env.BETTER_AUTH_URL ??
  process.env.SITE_URL ??
  (process.env.VERCEL === '1'
    ? 'https://anime-tierlist-app.vercel.app'
    : 'http://localhost:3000');
const authGlobal = globalThis as typeof globalThis & {
  tierlistAuthPool?: Pool;
};
const pool =
  authGlobal.tierlistAuthPool ??
  new Pool({
    connectionString:
      process.env.DATABASE_URL_POOLED ??
      process.env.DATABASE_URL ??
      process.env.DATABASE_POSTGRES_URL,
    max: 5,
    connectionTimeoutMillis: 8000,
    idleTimeoutMillis: 30000,
  });

if (process.env.NODE_ENV !== 'production') {
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
  secret: process.env.AUTH_SECRET,
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
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID ?? '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
            redirectURI: `${baseURL}/api/auth/google/callback`,
            prompt: 'select_account',
          },
        }
      : {},
  plugins: [nextCookies()],
});
