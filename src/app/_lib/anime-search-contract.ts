import { defineRpcEndpoint } from 'orpc-stack/endpoint';
import { z } from 'zod';
import { normalizeAnimeQuery } from './anime-search';

export const animeSearchEndpoint = defineRpcEndpoint('/api/rpc', {
  searchAnime: {
    kind: 'infinite',
    pagination: { input: 'page', next: 'nextPage', initial: 1 },
    input: z.object({
      query: z.string().transform(normalizeAnimeQuery).pipe(z.string().min(2).max(300)),
    }),
    output: z.object({
      items: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          imageUrl: z.url(),
          malId: z.number().int().positive().optional(),
        }),
      ),
    }),
  },
});
