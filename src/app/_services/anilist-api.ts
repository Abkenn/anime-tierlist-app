import 'server-only';
import {
  type AnyVariables,
  createClient,
  fetchExchange,
  type TypedDocumentNode,
} from '@urql/core';
import ky, { isTimeoutError } from 'ky';

export const anilistApi = ky.create({
  baseUrl: 'https://graphql.anilist.co/',
  timeout: 15_000,
  retry: 0,
  cache: 'no-store',
  headers: { accept: 'application/json' },
});

// Public AniList currently documents a reduced limit of 30 requests/minute.
// Only real upstream requests enter this gate; cached public metadata does not.
let nextRequest = 0;

export const queryAnilist = async <Data, Variables extends AnyVariables>(
  query: TypedDocumentNode<Data, Variables>,
  variables: Variables,
) => {
  const delay = Math.max(0, nextRequest - Date.now());
  if (delay > 10_000) {
    throw new Error('AniList is busy. Try again shortly.');
  }
  nextRequest = Date.now() + delay + 2100;
  if (delay) {
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  let response: Response | undefined;
  // Per-query clients and network-only requests never retain personal list data.
  const client = createClient({
    url: 'https://graphql.anilist.co/',
    exchanges: [fetchExchange],
    requestPolicy: 'network-only',
    preferGetMethod: false,
    fetch: async (input, init) => {
      response = await anilistApi(input, {
        ...init,
        signal: init?.signal ?? undefined,
        throwHttpErrors: false,
      });
      return response;
    },
  });
  const result = await client
    .query<Data, Variables>(query, variables)
    .toPromise();
  if (!response) {
    throw new Error(
      isTimeoutError(result.error?.networkError)
        ? 'AniList request timed out. Try again shortly.'
        : 'AniList is temporarily unavailable. Try again shortly.',
    );
  }
  if (response.status === 429) {
    const seconds = Number(response.headers.get('retry-after'));
    nextRequest = Math.max(
      nextRequest,
      Date.now() +
        (Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 60_000),
    );
    throw new Error('AniList rate limit reached. Try again in a minute.');
  }
  if (response.status >= 500) {
    throw new Error('AniList is temporarily unavailable. Try again shortly.');
  }
  if (!response.ok) {
    throw new Error(
      'AniList profile is unavailable or private. Check the username and try again.',
    );
  }
  return {
    data: result.data,
    errors: result.error?.graphQLErrors.map((error) => ({
      message: error.message,
    })),
  };
};
