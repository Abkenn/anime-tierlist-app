import { defineConfig } from '@prisma/orm-postgres/config';
import { config } from 'dotenv';
import { definePrismaConfig } from 'prisma/config';

config({ path: ['.env.development.local', '.env.local', '.env'], quiet: true });

export default definePrismaConfig({
  orm: defineConfig({
    contract: './src/prisma/contract.prisma',
    db: {
      connection: process.env.DATABASE_URL ?? process.env.DATABASE_POSTGRES_URL,
    },
  }),
  skills: { check: false },
});
