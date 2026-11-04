import { z } from 'zod';
import { animeImportHistorySchema } from './anime-import-history';

export const animeImportCheckpointSchema = animeImportHistorySchema.extend({
  provider: z.enum(['mal', 'anilist']),
  offset: z.number().int().nonnegative(),
  listComplete: z.boolean(),
  complete: z.boolean(),
  entries: z.array(
    z.object({
      id: z.number().int().positive(),
      title: z.string(),
      format: z.string(),
      episodes: z.number().nonnegative().nullable(),
      watchedEpisodes: z.number().nonnegative(),
      completed: z.boolean(),
      score: z.number().min(0).max(10),
    }),
  ),
});

export type AnimeImportCheckpoint = z.infer<typeof animeImportCheckpointSchema>;
