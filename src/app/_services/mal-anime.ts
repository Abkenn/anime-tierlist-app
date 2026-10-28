import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import { z } from 'zod';
import { selectMalCandidate } from '@/app/_lib/mal-anime';
import { tenraiApi } from './tenrai-api';

const responseSchema = z.object({
  data: z.array(
    z.object({
      mal_id: z.number().int().positive(),
      title: z.string().nullish(),
      title_english: z.string().nullish(),
      title_synonyms: z.array(z.string()).optional(),
      titles: z
        .array(z.object({ type: z.string().optional(), title: z.string() }))
        .optional(),
    }),
  ),
});

export const resolveMalTitle = async (query: string) => {
  'use cache';
  cacheLife('days');
  cacheTag('anime-mal-links');
  const payload = await tenraiApi
    .get<unknown>('anime', { searchParams: { q: query, limit: 12, sfw: true } })
    .json();
  return selectMalCandidate(query, responseSchema.parse(payload).data);
};
