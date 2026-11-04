import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import { z } from 'zod';
import {
  type MalAnime,
  malListSchema,
  malUsernameSchema,
} from '@/app/_lib/mal-import';
import { searchAnimePage } from './anime-search';
import { malApi } from './mal-api';
import { tenraiApi } from './tenrai-api';

const imageSchema = z.object({
  jpg: z.object({
    large_image_url: z.url().nullish(),
    image_url: z.url().nullish(),
  }),
});
const animeSchema = z.object({
  data: z.object({
    mal_id: z.number().int().positive(),
    title: z.string(),
    type: z.string(),
    episodes: z.number().int().nonnegative().nullable(),
    images: imageSchema,
    relations: z.array(
      z.object({
        relation: z.string(),
        entry: z.array(
          z.object({
            mal_id: z.number().int().positive(),
            type: z.string(),
          }),
        ),
      }),
    ),
  }),
});
let activeCatalogRequests = 0;
let nextCatalogRequest = 0;
const waitingCatalogRequests: (() => void)[] = [];
const catalogRequest = async <T>(operation: () => Promise<T>): Promise<T> => {
  if (activeCatalogRequests < 4) {
    activeCatalogRequests += 1;
  } else {
    if (waitingCatalogRequests.length >= 32) {
      throw new Error('Catalog is busy. Try again shortly.');
    }
    await new Promise<void>((resolve) => waitingCatalogRequests.push(resolve));
  }
  try {
    // Tenrai public tier allows four requests/second. Cache hits bypass this scope.
    const delay = Math.max(0, nextCatalogRequest - Date.now());
    nextCatalogRequest = Date.now() + delay + 300;
    if (delay) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    return await operation();
  } finally {
    const next = waitingCatalogRequests.shift();
    if (next) {
      next();
    } else {
      activeCatalogRequests -= 1;
    }
  }
};

export const readMalListPage = async (username: string, offset: number) => {
  const name = malUsernameSchema.parse(username);
  const response = await malApi.get(
    `animelist/${encodeURIComponent(name)}/load.json`,
    {
      searchParams: { status: 2, offset },
      throwHttpErrors: false,
    },
  );
  if (!response.ok) {
    throw new Error(
      'MAL profile is unavailable or private. Make your anime list public and try again.',
    );
  }
  const result = malListSchema.safeParse(await response.json());
  if (!result.success) {
    throw new Error(
      'MAL did not return a readable public anime list. Try again later.',
    );
  }

  return result.data;
};

export const readMalAnime = async (id: number): Promise<MalAnime> => {
  'use cache';
  cacheLife('days');
  cacheTag('mal-series-catalog');
  const payload = await catalogRequest(() =>
    tenraiApi.get<unknown>(`anime/${id}/full`).json(),
  );
  const { data } = animeSchema.parse(payload);

  return {
    id: data.mal_id,
    title: data.title,
    type: data.type,
    episodes: data.episodes,
    imageUrl:
      data.images.jpg.large_image_url ?? data.images.jpg.image_url ?? undefined,
    prequels: data.relations
      .filter((entry) => entry.relation === 'Prequel')
      .flatMap((entry) =>
        entry.entry
          .filter((related) => related.type === 'anime')
          .map((related) => related.mal_id),
      ),
  };
};

export const readMalSeriesPoster = async (query: string) => {
  'use cache';
  cacheLife('days');
  cacheTag('mal-series-posters');
  return catalogRequest(
    async () => (await searchAnimePage(query, 1)).items[0] ?? null,
  );
};
