import 'server-only';
import ky, { isHTTPError, isTimeoutError } from 'ky';
import { createTenraiPacer } from './tenrai-rate-limit';

const pacer = createTenraiPacer();

export const tenraiApi = ky.create({
  baseUrl: 'https://api.tenrai.org/v1/',
  timeout: 12000,
  retry: {
    limit: 1,
    methods: ['get'],
    statusCodes: [429],
    afterStatusCodes: [429],
    maxRetryAfter: 65_000,
  },
  hooks: {
    beforeRequest: [() => pacer.wait()],
    beforeRetry: [() => pacer.wait()],
    afterResponse: [
      ({ response }) => {
        if (response.status === 429) {
          pacer.defer(response.headers.get('retry-after'));
        }
      },
    ],
    beforeError: [
      ({ error }) => {
        if (isHTTPError(error)) {
          return new Error(
            error.response.status === 429
              ? 'Catalog rate limit reached. Try again shortly.'
              : `Catalog request failed (${error.response.status}). Try again shortly.`,
          );
        }
        if (isTimeoutError(error)) {
          return new Error('Catalog request timed out. Try again shortly.');
        }
        return error;
      },
    ],
  },
  headers: { accept: 'application/json' },
});
