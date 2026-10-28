'use server';

import { z } from 'zod';
import { tierlistShareIdPattern } from '@/app/_lib/tierlist-share-id';
import { userSeedSchema } from '@/app/_lib/tierlist-sync';
import { TierlistAccessError } from './tierlist-identity';
import {
  copyPublicTierlistSeed,
  prepareTierlistShare,
  publishTierlist,
  readExistingTierlistPreview,
} from './tierlist-share';

const inputSchema = z.object({
  ownerId: z.string().uuid(),
  revision: z.number().int().nonnegative(),
  seed: userSeedSchema.optional(),
});

const handleShare = async <T>(operation: () => Promise<T>) => {
  try {
    return { ok: true as const, value: await operation() };
  } catch (error) {
    return {
      ok: false as const,
      message:
        error instanceof TierlistAccessError
          ? error.message
          : 'Sharing is unavailable. Your tierlist is still saved on this device.',
    };
  }
};

export const prepareShare = async (input: unknown) =>
  handleShare(() => prepareTierlistShare(inputSchema.parse(input)));
export const publishShare = async (input: unknown) =>
  handleShare(() => publishTierlist(inputSchema.parse(input)));
export const copyShareSeed = async (id: unknown) =>
  handleShare(() =>
    copyPublicTierlistSeed(z.string().regex(tierlistShareIdPattern).parse(id)),
  );

export const findExistingPreview = async (input: unknown) =>
  handleShare(() => readExistingTierlistPreview(inputSchema.parse(input)));
