import 'server-only';
import ky from 'ky';

export const malApi = ky.create({
  baseUrl: 'https://myanimelist.net/',
  timeout: 15000,
  retry: 0,
  cache: 'no-store',
  headers: { accept: 'application/json' },
});
