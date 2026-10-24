'use server';

import { z } from 'zod';
import {
  type SyncResult,
  tierlistDocumentSchema,
  userSeedSchema,
} from '@/app/_lib/tierlist-sync';
import { connectSeedTierlist, saveSeedTierlist } from './tierlist';
import { endTierlistSession, TierlistAccessError } from './tierlist-identity';

const safely = async <T>(
  operation: () => Promise<T>,
): Promise<SyncResult<T>> => {
  try {
    return { ok: true, value: await operation() };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        ok: false,
        code: 'invalid',
        message: 'The seed or tierlist data is invalid or too large.',
      };
    }

    if (error instanceof TierlistAccessError) {
      return { ok: false, code: error.code, message: error.message };
    }

    console.error('Tierlist operation failed', {
      code:
        typeof error === 'object' && error && 'code' in error
          ? error.code
          : 'unknown',
    });

    return {
      ok: false,
      code: 'unavailable',
      message:
        'Online saving is unavailable. Your local tierlist is kept on this device.',
    };
  }
};

export const connectTierlist = async (input: unknown) =>
  safely(async () => {
    const parsed = z
      .object({
        seed: userSeedSchema,
        document: tierlistDocumentSchema.optional(),
      })
      .parse(input);

    return connectSeedTierlist(parsed.seed, parsed.document);
  });

export const syncTierlist = async (input: unknown) =>
  safely(() => {
    const parsed = z
      .object({
        ownerId: z.string().uuid(),
        revision: z.number().int().nonnegative(),
        document: tierlistDocumentSchema,
      })
      .parse(input);

    return saveSeedTierlist(parsed);
  });

export const disconnectTierlist = async () => safely(endTierlistSession);
