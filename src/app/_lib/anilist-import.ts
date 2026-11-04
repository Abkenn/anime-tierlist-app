import { z } from 'zod';
import type { ImportAnime, ImportListEntry } from './anime-import';

export const anilistUsernameSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9_-]{2,20}$/iu);

export const anilistMediaSchema = z.object({
  id: z.number().int().positive(),
  idMal: z.number().int().positive().nullish(),
  type: z.string(),
  format: z.string().nullable(),
  episodes: z.number().int().nonnegative().nullable(),
  title: z.object({
    romaji: z.string().nullish(),
    english: z.string().nullish(),
    native: z.string().nullish(),
  }),
  coverImage: z.object({
    extraLarge: z.string().nullish(),
    large: z.string().nullish(),
  }),
  relations: z.object({
    edges: z.array(
      z.object({
        relationType: z.string(),
        node: z.object({ id: z.number().int().positive(), type: z.string() }),
      }),
    ),
  }),
});

export type AnilistMedia = z.infer<typeof anilistMediaSchema>;

export const normalizeAnilistAnime = (media: AnilistMedia): ImportAnime => ({
  id: media.id,
  ...(media.idMal ? { malId: media.idMal } : {}),
  title:
    media.title.english ||
    media.title.romaji ||
    media.title.native ||
    `AniList ${media.id}`,
  type: media.format === 'TV_SHORT' ? 'TV' : (media.format ?? 'UNKNOWN'),
  episodes: media.episodes,
  imageUrl: media.coverImage.extraLarge ?? media.coverImage.large ?? undefined,
  prequels: media.relations.edges
    .filter(
      (edge) => edge.relationType === 'PREQUEL' && edge.node.type === 'ANIME',
    )
    .map((edge) => edge.node.id),
});

export const anilistListEntrySchema = z.object({
  status: z.string(),
  score: z.number().min(0).max(10),
  progress: z.number().int().nonnegative(),
  media: anilistMediaSchema,
});

export const normalizeAnilistEntry = (
  entry: z.infer<typeof anilistListEntrySchema>,
): ImportListEntry => {
  const anime = normalizeAnilistAnime(entry.media);
  return {
    id: anime.id,
    title: anime.title,
    format: anime.type,
    episodes: anime.episodes,
    watchedEpisodes: entry.progress,
    completed: entry.status === 'COMPLETED',
    score: entry.score,
  };
};
