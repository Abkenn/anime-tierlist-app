import 'server-only';
import postgres from '@prisma/orm-postgres/runtime';
import type { Contract } from './contract.d';
import contractJson from './contract.json' with { type: 'json' };

const createDatabase = () =>
  postgres<Contract>({
    contractJson,
    url:
      process.env.DATABASE_URL_POOLED ??
      process.env.DATABASE_URL ??
      process.env.DATABASE_POSTGRES_URL,
    poolOptions: { connectionTimeoutMillis: 8000, idleTimeoutMillis: 30_000 },
  });
const databaseGlobal = globalThis as typeof globalThis & {
  tierlistDatabase?: ReturnType<typeof createDatabase>;
};

export const db = databaseGlobal.tierlistDatabase ?? createDatabase();

if (process.env.NODE_ENV !== 'production') {
  databaseGlobal.tierlistDatabase = db;
}
