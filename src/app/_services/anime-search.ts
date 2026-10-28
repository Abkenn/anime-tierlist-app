import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';
import { z } from 'zod';

import type { AnimeSearchPage } from '@/app/_types/anime-search.types';
import { tenraiApi } from './tenrai-api';

const providerResponseSchema = z.object({
  data: z.array(
    z.object({
      mal_id: z.number().int().positive(),
      title: z.string().nullish(),
      images: z.object({
        jpg: z.object({
          large_image_url: z.url().nullish(),
          image_url: z.url().nullish(),
        }),
      }),
    }),
  ),
  pagination: z.object({ has_next_page: z.boolean() }),
});

export const searchAnimePage = async (
  query: string,
  page: number,
): Promise<AnimeSearchPage> => {
  'use cache';
  cacheLife('max');
  cacheTag('anime-search');

  const params = new URLSearchParams({
    q: query,
    page: String(page),
    limit: '24',
    sfw: 'true',
  });

  const payload = await tenraiApi
    .get<unknown>('anime', { searchParams: params })
    .json();

  const result = providerResponseSchema.parse(payload);

  return {
    items: result.data.flatMap((anime) => {
      const imageUrl =
        anime.images?.jpg?.large_image_url ?? anime.images?.jpg?.image_url;

      return imageUrl
        ? [
            {
              id: `mal-${anime.mal_id}`,
              malId: anime.mal_id,
              title: anime.title?.trim() || 'Unknown',
              imageUrl,
            },
          ]
        : [];
    }),
    nextPage: result.pagination?.has_next_page ? page + 1 : null,
  };
};
