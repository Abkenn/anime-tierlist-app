'use server';

import { z } from 'zod';
import { anilistUsernameSchema } from '@/app/_lib/anilist-import';
import { isError } from '@/app/_lib/is-error';
import { safely } from '@/app/_lib/safely';
import type { SyncResult } from '@/app/_lib/tierlist-sync';
import { readAnilistAnime, readAnilistPage } from './anilist-import';

const onError = (
  error: unknown,
): Extract<SyncResult<never>, { ok: false }> => ({
  ok: false,
  code: 'unavailable',
  message:
    isError(error) && error.message.startsWith('AniList ')
      ? error.message
      : 'Unable to load AniList data. Try again shortly.',
});

export const loadAnilistPage = async (input: unknown) =>
  safely({
    operation: async () => {
      const { username, page } = z
        .object({
          username: anilistUsernameSchema,
          page: z.number().int().positive(),
        })
        .parse(input);
      return readAnilistPage(username, page);
    },
    onError,
  });

export const loadAnilistAnimeBatch = async (input: unknown) =>
  safely({
    operation: () =>
      readAnilistAnime(
        z.array(z.number().int().positive()).min(1).max(8).parse(input),
      ),
    onError,
  });
