import { z } from 'zod';

export const animeImportHistorySchema = z.object({
  username: z.string(),
  importedAt: z.number().nonnegative(),
  catalog: z.array(
    z.object({
      id: z.number().int().positive(),
      malId: z.number().int().positive().optional(),
      title: z.string(),
      type: z.string(),
      episodes: z.number().nullable(),
      imageUrl: z.string().optional(),
      prequels: z.array(z.number().int().positive()),
    }),
  ),
  posters: z.record(z.string(), z.string().nullable()),
  dimensions: z.record(
    z.string(),
    z.object({ width: z.number().positive(), height: z.number().positive() }),
  ),
});

export type AnimeImportHistory = z.infer<typeof animeImportHistorySchema>;
