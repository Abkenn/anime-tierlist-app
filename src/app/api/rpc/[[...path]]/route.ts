import { ORPCError } from '@orpc/server';
import { createNextHandler } from 'orpc-stack/next';
import { animeSearchEndpoint } from '@/app/_lib/anime-search-contract';
import { searchAnimePage } from '@/app/_services/anime-search';

export const POST = createNextHandler(
  animeSearchEndpoint,
  {
    searchAnime: ({ query, page }) => searchAnimePage(query, page),
  },
  {
    mapHandlerError: (error) =>
      new ORPCError('BAD_GATEWAY', {
        message: Error.isError(error) ? error.message : 'Anime search is unavailable.',
      }),
  },
);
