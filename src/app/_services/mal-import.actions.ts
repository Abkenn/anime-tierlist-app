'use server';

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

const handleMalError = (
  error: unknown,
): Extract<SyncResult<never>, { ok: false }> => ({
  ok: false,
  code: 'unavailable',
  message:
    isError(error) && /^(MAL |Catalog )/u.test(error.message)
      ? error.message
      : 'Unable to load MAL data. The provider may be busy. Try again shortly.',
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
    onError: handleMalError,
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
