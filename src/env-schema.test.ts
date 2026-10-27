import { expect, it } from 'vitest';
import { parseEnv } from './env-schema';

it('normalizes legacy TLS aliases without weakening certificate verification', () => {
  const env = parseEnv({
    DATABASE_URL: 'postgresql://user:password@db.example/app?sslmode=require',
    VERCEL: '',
  });
  expect(new URL(env.DATABASE_URL ?? '').searchParams.get('sslmode')).toBe(
    'verify-full',
  );
  expect(env.VERCEL).toBeUndefined();
  expect(() => parseEnv({ SITE_URL: 'invalid' })).toThrow('SITE_URL');
});
