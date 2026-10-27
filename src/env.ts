import 'server-only';
import { type Env, parseEnv } from './env-schema';

export const env: Env = parseEnv(process.env);
export const databaseConnectionUrl =
  env.DATABASE_URL_POOLED ?? env.DATABASE_URL ?? env.DATABASE_POSTGRES_URL;
