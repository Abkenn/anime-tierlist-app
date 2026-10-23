import { defineRpcEndpoint } from 'orpc-stack/endpoint';
import { z } from 'zod';
import { normalizeAnimeQuery } from './anime-search';

export const animeSearchEndpoint = defineRpcEndpoint('/api/rpc', {
  searchAnime: {
    input: z.object({
      query: z
        .string()
        .transform(normalizeAnimeQuery)
        .pipe(z.string().min(2).max(300)),
      page: z.number().int().min(1).max(20000),
    }),
    output: z.object({
      items: z.array(
        z.object({ id: z.string(), title: z.string(), imageUrl: z.url() }),
      ),
      nextPage: z.number().int().positive().nullable(),
    }),
  },
});
