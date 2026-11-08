'use server';

import { z } from 'zod';
import { recordAnimeImportMetric } from '@/app/_data/mutations/anime-import-metrics';
import { updateAnimeImportQueue } from '@/app/_data/mutations/anime-import-queue';
import { consumeTierlistRateLimit } from '@/app/_data/mutations/tierlist';
import { safely } from '@/app/_lib/safely';
import { userSeedSchema } from '@/app/_lib/tierlist-sync';
import { getGoogleIdentity } from './google-session';
import { hashTierlistSecret } from './tierlist-identity';

export const pollAnimeImportQueue = async (input: unknown) =>
  safely({
    operation: async () => {
      const { seed, ticket, provider, release, event } = z
        .object({
          seed: userSeedSchema,
          ticket: z.uuid(),
          provider: z.enum(['mal', 'anilist']),
          release: z.boolean().optional(),
          event: z
            .enum(['generated', 'applied', 'cancelled', 'failed'])
            .optional(),
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
      const metric = { id: ticket, ownerKey, provider, release, event };
      const queue =
        event && !release
          ? undefined
          : await updateAnimeImportQueue({
              id: ticket,
              ownerKey,
              provider,
              release,
            });

      // Metrics must never prevent an import, including during migration rollout.
      await recordAnimeImportMetric({ ...metric, queue }).catch(() => {});

      return { position: queue?.position ?? 0 };
    },
    onError: () => ({
      ok: false as const,
      message:
        'Unable to check the import queue. Your progress is saved; try again shortly.',
    }),
  });
