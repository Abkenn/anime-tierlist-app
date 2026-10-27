import { defineConfig } from '@prisma/orm-postgres/config';
import { config } from 'dotenv';
import { definePrismaConfig } from 'prisma/config';
import { parseEnv } from './src/env-schema';

config({ path: ['.env.development.local', '.env.local', '.env'], quiet: true });

const env = parseEnv(process.env);

export default definePrismaConfig({
  orm: defineConfig({
    contract: './src/prisma/contract.prisma',
    db: {
      connection: env.DATABASE_URL ?? env.DATABASE_POSTGRES_URL,
    },
  }),
  skills: { check: false },
});
