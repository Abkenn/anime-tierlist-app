import { afterEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  configure: vi.fn((_options: Record<string, unknown>) => ({})),
}));

vi.mock('server-only', () => ({}));
vi.mock('better-auth', () => ({ betterAuth: mocks.configure }));
vi.mock('better-auth/next-js', () => ({ nextCookies: () => ({}) }));
vi.mock('pg', () => ({ Pool: class {} }));

afterEach(() => {
  vi.unstubAllEnvs();
  mocks.configure.mockClear();
});

it.each([
  ['', 'http://localhost:3000'],
  ['1', 'https://anime-tierlist.com'],
])(
  'uses the right production auth origin with VERCEL=%s',
  async (vercel, url) => {
    vi.resetModules();
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VERCEL', vercel);
    vi.stubEnv('BETTER_AUTH_URL', undefined);
    vi.stubEnv('SITE_URL', undefined);

    await import('./auth');

    expect(mocks.configure.mock.calls[0]?.[0].baseURL).toBe(url);
  },
);
