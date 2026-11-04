'use server';

import { isHTTPError, isTimeoutError } from 'ky';
import { z } from 'zod';
import { isError } from '@/app/_lib/is-error';
import { malUsernameSchema } from '@/app/_lib/mal-import';
import { safely } from '@/app/_lib/safely';
import type { SyncResult } from '@/app/_lib/tierlist-sync';
import {
  readMalAnime,
  readMalListPage,
  readMalSeriesPoster,
} from './mal-import';

const malErrorMessage = (error: unknown, source: 'MAL' | 'Catalog') => {
  if (isError(error) && /^(MAL |Catalog )/u.test(error.message)) {
    return error.message;
  }
  if (isHTTPError(error)) {
    return error.response.status === 429
      ? `${source} rate limit reached. Try again in a minute.`
      : `${source} request failed (${error.response.status}). Try again shortly.`;
  }
  if (isTimeoutError(error)) {
    return `${source} request timed out. Try again shortly.`;
  }
  return 'Unable to load MAL data. The provider may be busy. Try again shortly.';
};
const handleMalError = (
  error: unknown,
  source: 'MAL' | 'Catalog' = 'Catalog',
): Extract<SyncResult<never>, { ok: false }> => ({
  ok: false,
  code: 'unavailable',
  message: malErrorMessage(error, source),
});

export const loadMalListPage = async (input: unknown) =>
  safely({
    operation: async () => {
      const { username, offset } = z
        .object({
          username: malUsernameSchema,
          offset: z.number().int().nonnegative(),
        })
        .parse(input);

      return readMalListPage(username, offset);
    },
    onError: (error) => handleMalError(error, 'MAL'),
  });

export const loadMalAnime = async (input: unknown) =>
  safely({
    operation: async () =>
      readMalAnime(z.number().int().positive().parse(input)),
    onError: handleMalError,
  });

export const loadMalSeriesPoster = async (input: unknown) =>
  safely({
    operation: async () =>
      readMalSeriesPoster(z.string().trim().min(1).max(300).parse(input)),
    onError: handleMalError,
  });

export const loadMalAnimeBatch = async (input: unknown) =>
  safely({
    operation: async () => {
      const ids = z
        .array(z.number().int().positive())
        .min(1)
        .max(8)
        .parse(input);
      const result = [];
      for (let offset = 0; offset < ids.length; offset += 4) {
        result.push(
          ...(await Promise.all(
            ids.slice(offset, offset + 4).map(readMalAnime),
          )),
        );
      }
      return result;
    },
    onError: handleMalError,
  });
export const loadMalPosterBatch = async (input: unknown) =>
  safely({
    operation: async () => {
      const titles = z
        .array(z.string().trim().min(1).max(300))
        .min(1)
        .max(8)
        .parse(input);
      const result = [];
      for (let offset = 0; offset < titles.length; offset += 4) {
        result.push(
          ...(await Promise.all(
            titles.slice(offset, offset + 4).map(readMalSeriesPoster),
          )),
        );
      }
      return result;
    },
    onError: handleMalError,
  });
