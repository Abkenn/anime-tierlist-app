'use server';

import { z } from 'zod';
import { updateAnimeImportQueue } from '@/app/_data/mutations/anime-import-queue';
import { consumeTierlistRateLimit } from '@/app/_data/mutations/tierlist';
import { safely } from '@/app/_lib/safely';
import { userSeedSchema } from '@/app/_lib/tierlist-sync';
import { getGoogleIdentity } from './google-session';
import { hashTierlistSecret } from './tierlist-identity';

export const pollAnimeImportQueue = async (input: unknown) =>
  safely({
    operation: async () => {
      const { seed, ticket, provider, release } = z
        .object({
          seed: userSeedSchema,
          ticket: z.uuid(),
          provider: z.enum(['mal', 'anilist']),
          release: z.boolean().optional(),
        })
        .parse(input);
      const account = await getGoogleIdentity();
      const ownerKey = hashTierlistSecret(
        account ? `account:${account.ownerId}` : `seed:${seed}`,
      );
      if (
        !release &&
        !(await consumeTierlistRateLimit({
          id: `import-queue:${ownerKey}`,
          limit: 120,
          windowMs: 60_000,
        }))
      ) {
        throw new Error('Import queue is busy. Try again shortly.');
      }
      return updateAnimeImportQueue({
        id: ticket,
        ownerKey,
        provider,
        release,
      });
    },
    onError: () => ({
      ok: false as const,
      message:
        'Unable to check the import queue. Your progress is saved; try again shortly.',
    }),
  });
