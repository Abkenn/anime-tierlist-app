import { ORPCError } from '@orpc/server';
import { createRpcHandler } from 'orpc-stack/handler';
import { defineRpcApi } from 'orpc-stack/server';
import { animeSearchEndpoint } from '@/app/_lib/anime-search-contract';
import { searchAnimePage } from '@/app/_services/anime-search';

const handler = createRpcHandler(
  defineRpcApi(
    animeSearchEndpoint,
    {
      searchAnime: ({ query, page }) => searchAnimePage(query, page),
    },
    {
      mapHandlerError: (error) =>
        new ORPCError('BAD_GATEWAY', {
          message:
            error instanceof Error
              ? error.message
              : 'Anime search is unavailable.',
        }),
    },
  ),
);

export const POST = async (request: Request) => {
  const { response } = await handler.handle(request, {
    prefix: animeSearchEndpoint.path,
  });

  return response ?? new Response('Not found', { status: 404 });
};
