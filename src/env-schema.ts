import { z } from 'zod';

const optionalText = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().min(1).optional(),
);
const optionalUrl = optionalText.pipe(z.url().optional());
const databaseUrl = optionalUrl.transform((value) => {
  if (!value) {
    return value;
  }
  const url = new URL(value);
  if (
    !url.searchParams.has('uselibpqcompat') &&
    ['prefer', 'require', 'verify-ca'].includes(
      url.searchParams.get('sslmode') ?? '',
    )
  ) {
    url.searchParams.set('sslmode', 'verify-full');
  }
  return url.href;
});

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  VERCEL: optionalText.pipe(z.enum(['0', '1']).optional()),
  SITE_URL: optionalUrl,
  BETTER_AUTH_URL: optionalUrl,
  DATABASE_URL: databaseUrl,
  DATABASE_URL_POOLED: databaseUrl,
  DATABASE_POSTGRES_URL: databaseUrl,
  DATABASE_PRISMA_DATABASE_URL: optionalUrl,
  AUTH_SECRET: optionalText.pipe(z.string().min(32).optional()),
  GOOGLE_CLIENT_ID: optionalText,
  GOOGLE_CLIENT_SECRET: optionalText,
  BLOB_READ_WRITE_TOKEN: optionalText,
  BLOB_STORE_ID: optionalText,
  VERCEL_OIDC_TOKEN: optionalText,
  EXPOSE_TESTING_API: z
    .enum(['0', '1'])
    .optional()
    .transform((value) => value === '1'),
});

export type Env = z.output<typeof envSchema>;

export const parseEnv = (source: Record<string, string | undefined>): Env => {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    throw new Error(
      `Invalid environment configuration: ${result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`,
    );
  }
  return result.data;
};
