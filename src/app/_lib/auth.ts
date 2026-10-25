import 'server-only';
import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import { Pool } from 'pg';

const baseURL =
  process.env.BETTER_AUTH_URL ??
  process.env.SITE_URL ??
  (process.env.NODE_ENV === 'production'
    ? 'https://anime-tierlist-app.vercel.app'
    : 'http://localhost:3000');
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL_POOLED ??
    process.env.DATABASE_URL ??
    process.env.DATABASE_POSTGRES_URL,
  max: 5,
  connectionTimeoutMillis: 8000,
  idleTimeoutMillis: 30000,
});
export const auth = betterAuth({
  appName: 'Anime Tierlist',
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
