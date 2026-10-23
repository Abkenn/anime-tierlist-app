import 'server-only';
import ky from 'ky';

export const tenraiApi = ky.create({
  baseUrl: 'https://api.tenrai.org/v1/',
  timeout: 12000,
  retry: 0,
  headers: { accept: 'application/json' },
});
