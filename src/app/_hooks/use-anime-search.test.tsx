import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { animeSearchEndpoint } from '@/app/_lib/anime-search-contract';
import { POST } from '@/app/api/rpc/[[...path]]/route';
import { useAnimeSearch } from './use-anime-search';

const searchAnimePage = vi.hoisted(() => vi.fn());

vi.mock('@/app/_services/anime-search', () => ({ searchAnimePage }));

afterEach(() => {
  vi.unstubAllGlobals();
  searchAnimePage.mockReset();
});

const setup = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const fetch = vi.fn((request: Request) => POST(request));
  vi.stubGlobal('fetch', fetch);

  return { client, wrapper, fetch };
};

it('retains the seeded first page and loads subsequent pages through the generated RPC hook', async () => {
  const { client, wrapper, fetch } = setup();
  const first = {
    items: [
      {
        id: 'first',
        title: 'Frieren',
        imageUrl: 'https://example.com/first.jpg',
      },
    ],
    nextPage: 2,
  };
  const second = {
    items: [
      {
        id: 'second',
        title: 'Frieren season 2',
        imageUrl: 'https://example.com/second.jpg',
      },
    ],
    nextPage: null,
  };
  searchAnimePage.mockResolvedValue(second);
  const { result, unmount } = renderHook(
    () =>
      useAnimeSearch('frieren', {
        initialQuery: 'frieren',
        initialPage: first,
      }),
    { wrapper },
  );

  expect(result.current.search.data?.pages).toEqual([{ items: first.items, nextPage: 2 }]);
  expect(fetch).not.toHaveBeenCalled();

  await act(async () => {
    await result.current.search.fetchNextPage();
  });

  await waitFor(() =>
    expect(result.current.search.data?.pages).toEqual([
      { items: first.items, nextPage: 2 },
      { items: second.items, nextPage: null },
    ]),
  );
  expect(searchAnimePage).toHaveBeenCalledExactlyOnceWith('frieren', 2);
  expect(result.current.search.data?.pageParams).toEqual([1, 2]);
  expect(result.current.search.hasNextPage).toBe(false);
  unmount();
  client.clear();
});

it('starts unseeded searches at page one and separates query caches', async () => {
  const { client, wrapper } = setup();
  searchAnimePage.mockResolvedValue({ items: [], nextPage: null });
  const { result, unmount } = renderHook(() => useAnimeSearch('frieren'), {
    wrapper,
  });

  act(() => result.current.submitQuery('frieren'));
  await waitFor(() => expect(result.current.search.isSuccess).toBe(true));
  expect(searchAnimePage).toHaveBeenLastCalledWith('frieren', 1);

  act(() => result.current.submitQuery('naruto'));
  await waitFor(() => expect(searchAnimePage).toHaveBeenLastCalledWith('naruto', 1));
  expect(
    client
      .getQueryCache()
      .getAll()
      .filter((query) => query.state.status === 'success'),
  ).toHaveLength(2);
  unmount();
  client.clear();
});

it('keeps short queries and image URLs from calling catalog RPC', async () => {
  const { client, wrapper, fetch } = setup();
  const { result, rerender, unmount } = renderHook(({ input }) => useAnimeSearch(input), {
    wrapper,
    initialProps: { input: 'f' },
  });
  expect(result.current.search.fetchStatus).toBe('idle');
  rerender({ input: 'https://example.com/poster.jpg' });
  act(() => result.current.submitQuery('https://example.com/poster.jpg'));
  expect(result.current.url).toBe('https://example.com/poster.jpg');
  expect(result.current.search.fetchStatus).toBe('idle');
  expect(fetch).not.toHaveBeenCalled();
  unmount();
  client.clear();
});

it('maps service failures through the Next adapter', async () => {
  const { client, wrapper } = setup();
  searchAnimePage.mockRejectedValue(new Error('Catalog unavailable.'));
  const { result, unmount } = renderHook(() => useAnimeSearch('frieren'), { wrapper });

  act(() => result.current.submitQuery('frieren'));
  await waitFor(() => expect(result.current.search.isError).toBe(true));
  expect(result.current.search.error).toMatchObject({
    code: 'BAD_GATEWAY',
    message: 'Catalog unavailable.',
  });
  unmount();
  client.clear();
});

it('returns 404 for unknown procedures through the Next adapter', async () => {
  const response = await POST(
    new Request('http://localhost/api/rpc/unknown', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: {} }),
    }),
  );

  expect(response.status).toBe(404);
  expect(searchAnimePage).not.toHaveBeenCalled();
});

it.each([undefined, null, 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
  'rejects generated input page %s',
  async (page) => {
    const result = await animeSearchEndpoint.procedures.searchAnime.input['~standard'].validate({
      query: 'frieren',
      ...(page === undefined ? {} : { page }),
    });

    expect(result.issues).toBeDefined();
  },
);

it.each([undefined, 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
  'rejects generated output nextPage %s',
  async (nextPage) => {
    const result = await animeSearchEndpoint.procedures.searchAnime.output['~standard'].validate({
      items: [],
      ...(nextPage === undefined ? {} : { nextPage }),
    });

    expect(result.issues).toBeDefined();
  },
);
