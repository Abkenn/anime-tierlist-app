import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import { z } from 'zod';
import {
  anilistListEntrySchema,
  anilistMediaSchema,
  normalizeAnilistAnime,
  normalizeAnilistEntry,
} from '@/app/_lib/anilist-import';
import {
  AnilistAnimeBatchDocument,
  AnilistImportListDocument,
} from '@/app/_lib/graphql/anilist/generated/graphql';
import { queryAnilist } from './anilist-api';

const envelope = <T extends z.ZodType>(data: T) =>
  z.object({
    data: data.nullish(),
    errors: z.array(z.object({ message: z.string() })).optional(),
  });

const readData = <T extends z.ZodType>(
  schema: T,
  response: unknown,
): z.infer<T> => {
  const result = envelope(schema).parse(response);
  if (result.errors?.length || !result.data) {
    throw new Error(
      'AniList profile is unavailable or private. Check the username and try again.',
    );
  }
  return result.data;
};

export const readAnilistPage = async (username: string, page: number) => {
  const data = readData(
    z.object({
      Page: z.object({
        pageInfo: z.object({ hasNextPage: z.boolean() }),
        mediaList: z.array(anilistListEntrySchema),
      }),
    }),
    await queryAnilist(AnilistImportListDocument, { username, page }),
  );
  return {
    entries: data.Page.mediaList.map(normalizeAnilistEntry),
    catalog: data.Page.mediaList.map((entry) =>
      normalizeAnilistAnime(entry.media),
    ),
    hasNext: data.Page.pageInfo.hasNextPage,
  };
};

export const readAnilistAnime = async (ids: number[]) => {
  'use cache';
  cacheLife('days');
  cacheTag('anilist-series-catalog');
  const data = readData(
    z.object({ Page: z.object({ media: z.array(anilistMediaSchema) }) }),
    await queryAnilist(AnilistAnimeBatchDocument, { ids }),
  );
  if (data.Page.media.length !== new Set(ids).size) {
    throw new Error('AniList season metadata is unavailable. Try again later.');
  }
  return data.Page.media.map(normalizeAnilistAnime);
};
